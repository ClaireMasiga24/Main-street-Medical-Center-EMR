import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { resolveDoctorIds } from "@/app/lib/doctorScope";
import { createEncounter, IN_FLIGHT_ENCOUNTER_DEPTS } from "@/app/lib/encounterUtils";

// POST /api/doctor/follow-up
//
// Two actions, both doctor-initiated, both writing only after the server has
// proved the requester actually treated the patient:
//
//   CREATE        — start a new consultation for a previously treated patient
//   RECORD_OPENED — audit row: a doctor opened a read-only record
//
// Why a NEW encounter rather than reusing the patient's existing one:
// encounters in this codebase are reused for life (closeEncounter runs only for
// ADMIT/DISCHARGE), and ClinicalNote is @@unique([encounterId, authorStaffId]).
// Reusing the encounter would make the draft endpoint upsert over the previous
// consultation's note, and ConsultationPanel hydrates every SOAP field from
// that note (app/Doctors/page.tsx:1274-1292) — so the follow-up form would open
// pre-filled with the old diagnosis. A fresh encounter has no note, so the
// consultation starts genuinely blank and the old record is untouched.
//
// NO prisma.$transaction anywhere in this file: DATABASE_URL pins
// connection_limit=1, so a transaction holding the single connection for
// several writes causes pool exhaustion (see app/api/doctor/register-patient).

/** The only two types that actually open a consultation. "New complaint" is
 *  handled entirely in the dialog — it never reaches this route. */
const FOLLOW_UP_TYPES = ["Follow-up review", "Results review"] as const;
type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

/** Suppress duplicate RECORD_OPENED rows from a refresh or a React dev-mode
 *  double invocation. */
const RECORD_OPENED_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const MAX_REASON_LENGTH = 500;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Build a complete dashboard-shaped patient row for the consultation screen.
 *
 * The panel resolves the live encounter and the patient's identity from this
 * object, so it has to be complete — and it cannot be looked up from the queue,
 * because an encounter currently held by the Lab is deliberately absent from
 * the doctor's queue. Shape mirrors app/api/doctor/dashboard/route.ts so the
 * existing ConsultationPanel needs no changes.
 */
async function buildConsultationPatient(
  patientId: number,
  encounter: { id: number; currentStatus: string; lastSharedFromDept: string | null; updatedAt: Date; source: string; chiefComplaint: string | null; esiLevel: number | null; triageCompletedAt: Date | null }
) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true, patientNumber: true, firstName: true, lastName: true,
      gender: true, age: true, phoneNumber: true, isEmergency: true,
      currentStatus: true, lastSharedFromDept: true, updatedAt: true,
    },
  });
  if (!patient) return null;

  const triage = await prisma.triage.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    select: { esiLevel: true, createdAt: true },
  });

  const waitingMinutes = Math.floor((Date.now() - encounter.updatedAt.getTime()) / 60000);
  const waitingDisplay =
    waitingMinutes < 1
      ? "Just now"
      : waitingMinutes < 60
        ? `${waitingMinutes}m`
        : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

  return {
    id: patient.id,
    encounterId: encounter.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    gender: patient.gender,
    age: patient.age,
    phoneNumber: patient.phoneNumber,
    isEmergency: patient.isEmergency,
    currentStatus: encounter.currentStatus,
    lastSharedFromDept: encounter.lastSharedFromDept,
    updatedAt: encounter.updatedAt.toISOString(),
    waitingMinutes,
    waitingDisplay,
    chiefComplaint:
      encounter.chiefComplaint ?? patient.lastSharedFromDept ?? triage?.createdAt?.toISOString() ?? "",
    esiLevel: encounter.esiLevel ?? triage?.esiLevel ?? null,
    triageCompletedAt:
      (encounter.triageCompletedAt ?? triage?.createdAt)?.toISOString() ?? null,
    source: encounter.source,
    pendingLabs: 0,
    pendingImaging: 0,
    hasAppointment: false,
    appointmentTime: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "RECORD_OPENED") {
      return await recordOpened(body);
    }
    if (action === "CREATE") {
      return await createFollowUp(body);
    }

    return badRequest("Unknown action. Expected CREATE or RECORD_OPENED.");
  } catch (err) {
    console.error("[doctor/follow-up POST]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to process the follow-up request.", detail },
      { status: 500 }
    );
  }
}

// ── CREATE ────────────────────────────────────────────────────────────────

async function createFollowUp(body: any) {
  const {
    patientId: rawPatientId,
    previousVisitId: rawPreviousVisitId,
    type,
    reason: rawReason,
    doctorId,
    staffName,
  } = body;

  const patientId = Number(rawPatientId);
  const previousVisitId = Number(rawPreviousVisitId);
  const reason = String(rawReason ?? "").trim();

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return badRequest("A valid patient is required.");
  }
  if (!Number.isInteger(previousVisitId) || previousVisitId <= 0) {
    return badRequest("A valid previous visit is required.");
  }
  if (!FOLLOW_UP_TYPES.includes(type)) {
    return badRequest(`Type must be one of: ${FOLLOW_UP_TYPES.join(", ")}.`);
  }
  if (!reason) {
    return badRequest("A reason is required.");
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return badRequest(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  const doctor = await resolveDoctorIds(doctorId);
  if (!doctor) {
    return badRequest("A doctor id is required to start a follow-up.");
  }

  // ── Authorisation: the previous visit must be one of this doctor's own ──
  // This is the server-side equivalent of "only the doctor who treated the
  // patient sees them in Treated Patients" (app/api/doctor/treated/route.ts:82).
  // A doctor cannot start a follow-up on a patient they never treated.
  const previousVisit = await prisma.visit.findFirst({
    where: { id: previousVisitId, doctorId: { in: doctor.ids } },
    select: { id: true, patientId: true },
  });
  if (!previousVisit) {
    return forbidden("This consultation is not one of yours.");
  }
  if (previousVisit.patientId !== patientId) {
    return badRequest("That consultation does not belong to this patient.");
  }

  // ── Open-encounter guard ──
  // Server-side, so a double click makes one encounter. If an encounter is
  // already in flight we hand it back rather than opening a second one.
  const inFlight = await prisma.encounter.findFirst({
    where: {
      patientId,
      status: "ACTIVE",
      currentOwnerDept: { in: [...IN_FLIGHT_ENCOUNTER_DEPTS] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      currentOwnerDept: true,
      currentStatus: true,
      openedAt: true,
      updatedAt: true,
      lastSharedFromDept: true,
      source: true,
      chiefComplaint: true,
      esiLevel: true,
      triageCompletedAt: true,
    },
  });

  if (inFlight) {
    return NextResponse.json({
      existing: true,
      encounterId: inFlight.id,
      currentOwnerDept: inFlight.currentOwnerDept,
      currentStatus: inFlight.currentStatus,
      openedAt: inFlight.openedAt,
      updatedAt: inFlight.updatedAt,
      heldByDoctor: inFlight.currentOwnerDept === "DOCTOR",
      consultation: await buildConsultationPatient(patientId, inFlight),
    });
  }

  const marker = `Follow-up of Visit #${previousVisitId} - ${type}: ${reason}`;

  // Visit has no encounterId column, so the encounter that consultation ran in
  // can only be inferred from the orders placed during it — exactly what
  // treated/route.ts and treated/[patientId]/route.ts do. It is genuinely absent
  // when the doctor ordered nothing, so null is a real answer here, not a stub.
  // The audit trail leans on previousVisitId, which is always exact.
  const prevLabLinks = await prisma.labRequest.findMany({
    where: { visitId: previousVisitId },
    select: { encounterId: true },
  });
  const prevImagingLinks = await prisma.imagingRequest.findMany({
    where: { visitId: previousVisitId },
    select: { encounterId: true },
  });
  const previousEncounterId =
    [...prevLabLinks, ...prevImagingLinks].find((l) => l.encounterId)?.encounterId ?? null;

  // ── Create the encounter ──
  // createEncounter is the same helper reception, triage and the doctor
  // registration route all call. It writes exactly one Encounter row and
  // nothing else — no Visit, no lab/imaging/prescription/billing rows. The
  // single Visit for this consultation is created later, on finalisation, by
  // the untouched app/api/doctor/route.ts.
  const { id: encounterId } = await createEncounter({
    patientId,
    source: "Follow-up",
    isEmergency: false,
    currentStatus: "AWAITING_DOCTOR",
    currentOwnerDept: "DOCTOR",
    chiefComplaint: marker,
  });

  try {
    // Mirrors reception's ADVANCE_PATIENT_STATUS. It also drops the patient out
    // of Treated Patients, because treated/route.ts:22 already hides
    // AWAITING_DOCTOR — they have moved back into the live queue.
    await prisma.patient.update({
      where: { id: patientId },
      data: { currentStatus: "AWAITING_DOCTOR" },
    });

    // The link back to the previous encounter. PatientTimeline.metadata is a
    // free-text JSON column, so this is a soft link, not a foreign key.
    await prisma.patientTimeline.create({
      data: {
        patientId,
        action: "FOLLOW_UP_STARTED",
        fromDepartment: "Treated Patients",
        toDepartment: "Doctor",
        description: marker,
        metadata: JSON.stringify({
          previousVisitId,
          previousEncounterId,
          newEncounterId: encounterId,
          type,
          reason,
        }),
        performedBy: staffName || "Doctor",
        performedById: doctor.staffId,
      },
    });
  } catch (err) {
    // Partial failure. Clean up ONLY the encounter this request created,
    // guarded on its id and on having no clinical note attached, so nothing
    // older can be deleted. The patient.currentStatus update is not reverted —
    // the error below says so plainly rather than leaving the doctor guessing.
    try {
      await prisma.encounter.deleteMany({
        where: { id: encounterId, clinicalNotes: { none: {} } },
      });
    } catch (cleanupErr) {
      console.error("[doctor/follow-up] rollback failed for encounter", encounterId, cleanupErr);
    }
    console.error("[doctor/follow-up] create failed after encounter was made", err);
    return NextResponse.json(
      {
        error:
          "The consultation was not started. The patient's status may still show " +
          "as waiting for the doctor — ask reception to re-queue if it looks wrong.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  // One read to hand the panel a complete patient row. createEncounter only
  // returns the id, so the row is assembled from the row we just wrote.
  const created = await prisma.encounter.findUnique({ where: { id: encounterId } });
  const consultation = created
    ? await buildConsultationPatient(patientId, created)
    : null;

  return NextResponse.json(
    { existing: false, encounterId, previousVisitId, type, reason, consultation },
    { status: 201 }
  );
}

// ── RECORD_OPENED ─────────────────────────────────────────────────────────

/**
 * Audit a doctor opening a read-only treated record. Also used for
 * ENCOUNTER_OPENED_ELSEWHERE when the doctor opens a live consultation that
 * another department currently holds.
 *
 * The read endpoint (app/api/doctor/treated/[patientId]) stays strictly
 * read-only — this is a separate POST so a GET never writes.
 */
async function recordOpened(body: any) {
  const {
    patientId: rawPatientId,
    visitId: rawVisitId,
    doctorId,
    staffName,
    heldByDept,
  } = body;

  const patientId = Number(rawPatientId);
  const visitId = Number(rawVisitId);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return badRequest("A valid patient is required.");
  }

  const doctor = await resolveDoctorIds(doctorId);
  if (!doctor) {
    return badRequest("A doctor id is required.");
  }

  // Same ownership proof as CREATE: this doctor must have treated the patient.
  const visitScope = await prisma.visit.findFirst({
    where: {
      patientId,
      doctorId: { in: doctor.ids },
      ...(Number.isInteger(visitId) && visitId > 0 ? { id: visitId } : {}),
    },
    select: { id: true },
  });
  if (!visitScope) {
    return forbidden("This consultation is not one of yours.");
  }

  const action = heldByDept ? "ENCOUNTER_OPENED_ELSEWHERE" : "RECORD_OPENED";
  const since = new Date(Date.now() - RECORD_OPENED_DEDUPE_WINDOW_MS);

  // Dedupe: a refresh or a React dev-mode double call must not add a second row.
  const recent = await prisma.patientTimeline.findFirst({
    where: {
      patientId,
      action: { in: ["RECORD_OPENED", "ENCOUNTER_OPENED_ELSEWHERE"] },
      performedById: doctor.staffId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({ success: true, deduplicated: true });
  }

  await prisma.patientTimeline.create({
    data: {
      patientId,
      action,
      fromDepartment: "Treated Patients",
      toDepartment: "Doctor",
      description: heldByDept
        ? `Opened an encounter currently with ${heldByDept}`
        : `Opened read-only record for Visit #${visitScope.id}`,
      performedBy: staffName || "Doctor",
      performedById: doctor.staffId,
    },
  });

  return NextResponse.json({ success: true });
}
