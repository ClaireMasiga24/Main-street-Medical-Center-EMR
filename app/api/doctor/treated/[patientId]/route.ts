import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resolveDoctorIds } from "../../../../lib/doctorScope";
import type { Prisma } from "@prisma/client";

// GET /api/doctor/treated/[patientId]?doctorId=&visitId=&scope=
//
// READ-ONLY single record for a patient this doctor has already treated.
//
// Access control: the requested visit must carry one of the logged-in doctor's
// own ids, and it must belong to the requested patient. Anything else is a 403
// — including a patient the doctor has no consultation with. So a doctor can
// never read another doctor's patients through this route, and opening a record
// creates no Visit, no order and no status change. The audit row for opening a
// record is written by a separate POST (app/api/doctor/follow-up), never here.

/**
 * How far back from the anchor Visit a sibling Visit may have been created and
 * still count as the same consultation. Only used when `scope=consultation`.
 *
 * Orders are placed minutes apart in practice, so this is generous; the upper
 * bound is the anchor's own createdAt, which is what excludes anything ordered
 * during a later consultation. This is the single knob to tune if the window
 * ever proves too tight or too wide.
 */
const CONSULTATION_SIBLING_WINDOW_MS = 6 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId: patientIdParam } = await params;
    const patientId = parseInt(patientIdParam, 10);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ error: "Invalid patient id." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const visitId = parseInt(searchParams.get("visitId") || "", 10);

    const doctor = await resolveDoctorIds(searchParams.get("doctorId"));
    if (!doctor) {
      return NextResponse.json(
        { error: "A doctor id is required to open a treated patient record." },
        { status: 400 }
      );
    }

    // ── Authorisation: this doctor, this visit, this patient ──
    const visitsByDoctor = await prisma.visit.findMany({
      where: { patientId, doctorId: { in: doctor.ids } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    if (visitsByDoctor.length === 0) {
      return NextResponse.json(
        { error: "This patient is not in your treated list." },
        { status: 403 }
      );
    }

    const targetVisitId = Number.isInteger(visitId) && visitId > 0
      ? visitId
      : visitsByDoctor[0].id;

    if (!visitsByDoctor.some((v) => v.id === targetVisitId)) {
      return NextResponse.json(
        { error: "This consultation is not one of yours." },
        { status: 403 }
      );
    }

    const visit = await prisma.visit.findUnique({
      where: { id: targetVisitId },
      include: { Patient: true },
    });
    if (!visit) {
      return NextResponse.json({ error: "Consultation not found." }, { status: 404 });
    }

    // ── Consultation scoping (opt-in) ──
    // Without `scope=consultation` this endpoint behaves exactly as it always
    // has: prescriptions, labs and imaging are read by patientId, so the latest
    // ones of any age are shown. That is what Treated Patients wants.
    //
    // The "Previous visit" card passes scope=consultation because it must show
    // the previous CONSULTATION's orders, not whatever came after it. Visit has
    // no encounterId column, and ordering investigations sends routeTo
    // "SEND_ORDERS", which finalises and creates a Visit of its own
    // (app/api/doctor/route.ts:161) — so one consultation really can have
    // several Visits, and the only available link between them is time.
    const scoped = searchParams.get("scope") === "consultation";
    const windowStart = new Date(visit.createdAt.getTime() - CONSULTATION_SIBLING_WINDOW_MS);
    const windowEnd = visit.createdAt;

    // Siblings: the anchor plus any other Visit this doctor wrote for this
    // patient inside the window. The doctorId filter is what excludes the
    // registration Visit, which is written with doctorId: null and carries only
    // a chief complaint.
    const siblingVisits = scoped
      ? await prisma.visit.findMany({
          where: {
            patientId,
            doctorId: { in: doctor.ids },
            createdAt: { gte: windowStart, lte: windowEnd },
          },
          select: { id: true },
        })
      : [];
    const consultationVisitIds = [visit.id, ...siblingVisits.map((v) => v.id)];

    // Rows with a visitId must belong to this consultation. Rows with a NULL
    // visitId cannot be attributed, so they are kept only when their own
    // createdAt falls inside the window — and flagged, so an inferred row is
    // never mistaken for a confirmed one. Unscoped, this is just { patientId }.
    const byConsultation = (): Array<Record<string, unknown>> => [
      { visitId: { in: consultationVisitIds } },
      { visitId: null, createdAt: { gte: windowStart, lte: windowEnd } },
    ];
    const prescriptionWhere: Prisma.PrescriptionWhereInput = scoped
      ? { patientId, OR: byConsultation() }
      : { patientId };
    const labWhere: Prisma.LabRequestWhereInput = scoped
      ? { patientId, OR: byConsultation() }
      : { patientId };
    const imagingWhere: Prisma.ImagingRequestWhereInput = scoped
      ? { patientId, OR: byConsultation() }
      : { patientId };

    // ── Everything the record renders. Reads only. ──
    // Sequential, not Promise.all. DATABASE_URL pins connection_limit=1, so
    // parallel reads serialise onto the single connection anyway; running them
    // in sequence keeps that explicit and stops the fan-out from holding it
    // open across ten statements.
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const prescriptions = await prisma.prescription.findMany({
      where: prescriptionWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const labRequests = await prisma.labRequest.findMany({
      where: labWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const imagingRequests = await prisma.imagingRequest.findMany({
      where: imagingWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const procedures = await prisma.medicalProcedure.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const dischargeSummaries = await prisma.dischargeSummary.findMany({
      where: { patientId },
      orderBy: { dateOfDischarge: "desc" },
      take: 5,
    });
    const triage = await prisma.triage.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
    const visitHistory = await prisma.visit.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true, diagnosis: true, doctorName: true, doctorId: true },
    });
    const labLinks = await prisma.labRequest.findMany({
      where: { visitId: targetVisitId },
      select: { visitId: true, encounterId: true },
    });
    const imagingLinks = await prisma.imagingRequest.findMany({
      where: { visitId: targetVisitId },
      select: { visitId: true, encounterId: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    /** True when the row has no visit link and was matched by date alone. */
    const inferred = (visitId: number | null) => scoped && visitId === null;

    // Visit has no encounterId column, so the encounter is resolved through the
    // orders placed during that consultation. Null when the doctor ordered none.
    const encounterId =
      [...labLinks, ...imagingLinks].find((l) => l.encounterId)?.encounterId ?? null;

    return NextResponse.json({
      record: {
        // identity
        patientId: patient.id,
        patientNumber: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        ageUnit: patient.ageUnit,
        gender: patient.gender,
        phoneNumber: patient.phoneNumber,
        address: patient.address,
        isEmergency: patient.isEmergency,
        currentStatus: patient.currentStatus,
        // which consultation
        visitId: visit.id,
        encounterId,
        seenAt: visit.createdAt,
        doctorName: visit.doctorName,
        // clinical
        chiefComplaint: triage?.chiefComplaint || visit.symptoms || "",
        symptoms: visit.symptoms || "",
        historyOfPresentIllness: visit.historyOfPresentIllness || "",
        reviewOfOtherSystems: visit.reviewOfOtherSystems || "",
        pastMedicalHistory: visit.pastMedicalHistory || "",
        physicalExamination: visit.physicalExamination || "",
        assessment: visit.assessment || "",
        diagnosis: visit.diagnosis || "",
        differentialDiagnosis: visit.differentialDiagnosis || "",
        treatmentPlan: visit.treatmentPlan || "",
        notes: visit.notes || "",
        doctorSignature: visit.doctorSignature || "",
        // supporting records
        prescriptions: prescriptions.map((rx) => ({
          id: rx.id,
          medication: rx.medication,
          dosage: rx.dosage,
          instructions: rx.instructions,
          route: rx.route,
          frequency: rx.frequency,
          status: rx.status,
          createdAt: rx.createdAt,
          linkedByDate: inferred(rx.visitId),
        })),
        labRequests: labRequests.map((lr) => ({
          id: lr.id,
          testName: lr.testName,
          status: lr.status,
          results: lr.results,
          interpretation: lr.interpretation,
          createdAt: lr.createdAt,
          priority: lr.priority,
          rejectionReason: lr.rejectionReason,
          linkedByDate: inferred(lr.visitId),
        })),
        imagingRequests: imagingRequests.map((ir) => ({
          id: ir.id,
          studyType: ir.studyType,
          status: ir.status,
          findings: ir.findings,
          impression: ir.impression,
          conclusion: ir.conclusion,
          createdAt: ir.createdAt,
          linkedByDate: inferred(ir.visitId),
        })),
        procedures: procedures.map((p) => ({
          id: p.id,
          procedureName: p.procedureName,
          procedureNotes: p.procedureNotes,
          treatmentFollowUp: p.treatmentFollowUp,
          performedBy: p.performedBy,
          createdAt: p.createdAt,
        })),
        dischargeSummaries: dischargeSummaries.map((d) => ({
          id: d.id,
          dateOfDischarge: d.dateOfDischarge,
          diagnosis: d.diagnosis,
          conditionAtDischarge: d.conditionAtDischarge,
          followUpPlan: d.followUpPlan,
          doctorSignatureName: d.doctorSignatureName,
          examFindingsAtDischarge: d.examFindingsAtDischarge,
        })),
        visitHistory: visitHistory.map((v) => ({
          id: v.id,
          createdAt: v.createdAt,
          diagnosis: v.diagnosis,
          doctorName: v.doctorName,
          isMine: doctor.ids.includes(v.doctorId ?? -1),
        })),
      },
    });
  } catch (err) {
    console.error("[doctor/treated/[patientId] GET]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to load the patient record.", detail },
      { status: 500 }
    );
  }
}
