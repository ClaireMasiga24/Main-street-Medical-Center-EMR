import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { resolveDoctorIds } from "../../../lib/doctorScope";
import type { Prisma } from "@prisma/client";

// GET /api/doctor/treated?doctorId=&search=&range=&page=&pageSize=
//
// READ-ONLY list of patients this doctor has completed a consultation for.
//
// Scoped server-side: every row must belong to a Visit whose doctorId is one of
// the logged-in doctor's own ids (see resolveDoctorIds). There is no code path
// here that returns another doctor's patient.
//
// "Treated" = the doctor finalised a consultation (a Visit row was written with
// their id). Rows are excluded while the patient is still in the doctor's queue
// or is currently admitted, because both already have their own tab.
//
// Paginated server-side: one page of patients at a time, never the whole table.

const RANGE_DAYS: Record<string, number> = { today: 0, "7d": 7, "30d": 30 };

const PATIENT_STATUS_HIDDEN = [
  "AWAITING_DOCTOR",
  "IN_CONSULTATION",
  "ADMITTED",
] as const;

type Outcome = "Sent to cashier" | "Discharged" | "Referred" | "Referred out" | "Completed";

/**
 * Derive the outcome of a completed consultation from where the patient is now.
 * The hospital flow is linear, so the patient's current status is a faithful
 * read of how the encounter left the consulting room.
 */
function outcomeFromStatus(status: string): Outcome {
  switch (status) {
    case "AWAITING_CASHIER":
    case "AWAITING_PHARMACY":
      return "Sent to cashier";
    case "DISCHARGED":
      return "Discharged";
    case "AWAITING_LAB":
    case "AWAITING_RADIOLOGY":
    case "AWAITING_SONOGRAPHY":
    case "AWAITING_DENTIST":
    case "AWAITING_TRIAGE":
    case "AWAITING_DOCTOR":
    case "IN_CONSULTATION":
      return "Referred";
    default:
      return "Completed";
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDoctorId = searchParams.get("doctorId");
    const search = (searchParams.get("search") || "").trim();
    const range = searchParams.get("range") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(5, parseInt(searchParams.get("pageSize") || "15", 10) || 15)
    );

    const doctor = await resolveDoctorIds(rawDoctorId);
    if (!doctor) {
      return NextResponse.json(
        { error: "A doctor id is required to list treated patients." },
        { status: 400 }
      );
    }

    // ── Visit-level scope: consultations this doctor completed ──
    const visitScope: Prisma.VisitWhereInput = { doctorId: { in: doctor.ids } };
    if (range in RANGE_DAYS) {
      const days = RANGE_DAYS[range];
      const from = startOfToday();
      if (days > 0) from.setDate(from.getDate() - (days - 1));
      visitScope.createdAt = { gte: from };
    }

    // Patient-level conditions, kept as a list of plain PatientWhereInput so
    // the same conditions can be used both on the Visit query and on the
    // Patient count. Prisma types the Visit->Patient filter as
    // XOR<PatientRelationFilter, PatientWhereInput>, so a single object cannot
    // mix `isNot` (relation form) with `OR` (where form) — passing a plain
    // where input keeps both call sites valid.
    const patientConditions: Prisma.PatientWhereInput[] = [
      // Skip the Patient Queue and the Admitted Patients tab.
      { NOT: { OR: [{ currentStatus: { in: [...PATIENT_STATUS_HIDDEN] } }, { sentToTreatmentRoom: true }] } },
    ];
    if (search) {
      patientConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { patientNumber: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const visitWhere: Prisma.VisitWhereInput = {
      ...visitScope,
      Patient: { AND: patientConditions },
    };

    const total = await prisma.patient.count({
      where: { AND: [{ Visit: { some: visitScope } }, ...patientConditions] },
    });

    // One row per patient: group by patient, take the most recent visit.
    const groups = await prisma.visit.groupBy({
      by: ["patientId"],
      where: visitWhere,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const pagePatientIds = groups.map((g) => g.patientId);
    if (pagePatientIds.length === 0) {
      return NextResponse.json({
        patients: [],
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      });
    }

    const visits = await prisma.visit.findMany({
      where: { patientId: { in: pagePatientIds } },
      orderBy: { createdAt: "desc" },
      include: { Patient: true },
    });

    // Newest visit per patient, kept in the group's page order.
    const newestByPatient = new Map<number, (typeof visits)[number]>();
    for (const visit of visits) {
      if (!newestByPatient.has(visit.patientId)) newestByPatient.set(visit.patientId, visit);
    }

    // Resolve each visit's encounter id. Visit has no encounterId column, so we
    // go through the orders made during that consultation. Blank when the doctor
    // ordered nothing — see the Treated Patients ID column.
    const pageVisitIds = pagePatientIds
      .map((pid) => newestByPatient.get(pid)?.id)
      .filter((id): id is number => typeof id === "number");

    const [labLinks, imagingLinks] = await Promise.all([
      prisma.labRequest.findMany({
        where: { visitId: { in: pageVisitIds } },
        select: { visitId: true, encounterId: true },
      }),
      prisma.imagingRequest.findMany({
        where: { visitId: { in: pageVisitIds } },
        select: { visitId: true, encounterId: true },
      }),
    ]);

    const encounterByVisit = new Map<number, number>();
    for (const link of [...labLinks, ...imagingLinks]) {
      if (link.visitId && link.encounterId && !encounterByVisit.has(link.visitId)) {
        encounterByVisit.set(link.visitId, link.encounterId);
      }
    }

    // ── Which of these patients were referred out, and to where ──
    // The facility is not a column anywhere; it lives in the metadata of the
    // timeline row the doctor POST wrote when the referral happened. One
    // sequential query (not a Promise.all — this project's pgBouncer runs
    // connection_limit=1) filtered to the rows this page shows.
    const referralRows = await prisma.patientTimeline.findMany({
      where: {
        patientId: { in: pagePatientIds },
        action: "CONSULTATION_END",
        toDepartment: "REFERRAL",
      },
      orderBy: { createdAt: "desc" },
      select: { patientId: true, createdAt: true, metadata: true },
    });

    // Newest referral row per patient, newest first, so the first one that
    // carries a facility wins. Correlated against the visit by TIME, not by
    // metadata.visitId: every POST creates its own Visit row, so ordering labs
    // before referring out leaves the newest Visit belonging to the lab order
    // rather than to the referral. A referral is always written at or after
    // the newest Visit of that consultation, and a later re-consultation has a
    // strictly newer Visit, so the time bound below keeps a stale referral
    // from relabelling a fresh visit.
    const referralByPatient = new Map<number, { facility: string; at: Date }>();
    for (const row of referralRows) {
      if (referralByPatient.has(row.patientId)) continue;
      let facility: string | null = null;
      try {
        const meta = row.metadata ? JSON.parse(row.metadata) : null;
        if (typeof meta?.referredTo === "string" && meta.referredTo.trim()) {
          facility = meta.referredTo.trim();
        }
      } catch {
        // A row with unparsable metadata is not a referral we can show. Keep
        // looking down the list for this patient.
        continue;
      }
      if (facility) referralByPatient.set(row.patientId, { facility, at: row.createdAt });
    }

    const patients = pagePatientIds
      .map((pid) => newestByPatient.get(pid))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .map((v) => {
        const referral = referralByPatient.get(v.patientId);
        // Only a referral at or after this visit belongs to this visit.
        const referredTo = referral && referral.at >= v.createdAt ? referral.facility : null;
        return {
          visitId: v.id,
          encounterId: encounterByVisit.get(v.id) ?? null,
          patientId: v.patientId,
          patientNumber: v.Patient.patientNumber,
          firstName: v.Patient.firstName,
          lastName: v.Patient.lastName,
          age: v.Patient.age,
          ageUnit: v.Patient.ageUnit,
          gender: v.Patient.gender,
          phoneNumber: v.Patient.phoneNumber,
          isEmergency: v.Patient.isEmergency,
          currentStatus: v.Patient.currentStatus,
          seenAt: v.createdAt,
          doctorName: v.doctorName,
          diagnosis: v.diagnosis || "",
          treatmentPlan: v.treatmentPlan || "",
          outcome: (referredTo ? "Referred out" : outcomeFromStatus(v.Patient.currentStatus)) as Outcome,
          referredTo,
        };
      });

    return NextResponse.json({
      patients,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("[doctor/treated GET]", err);
    // Surface Prisma's message rather than a bare "failed" — a malformed
    // where-clause is invisible otherwise and costs a full round of guessing.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to load treated patients.", detail },
      { status: 500 }
    );
  }
}
