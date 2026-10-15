import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { returnEncounterToDoctor } from "./encounterUtils";

/**
 * Imaging report plumbing shared by the finalize path in /api/imaging and by
 * /api/imaging/share, so the two can never drift apart.
 */

/**
 * Studies performed on the ultrasound machine. Everything else in the
 * worklist is radiographic, so this split is what decides whether a returned
 * result is filed under "Sonography" or "Radiology" on the doctor dashboard.
 */
const SONO_STUDIES = ["ULTRASOUND", "DOPPLER", "ECHOCARDIOGRAPHY"];

/** Source label for a completed study. */
export function deptForStudy(studyType: string | null | undefined): "Sonography" | "Radiology" {
  return SONO_STUDIES.includes(String(studyType || "").toUpperCase())
    ? "Sonography"
    : "Radiology";
}

/**
 * Resolve the signed-in user to the Staff record that authors the report.
 *
 * `ImagingRequest.reportedById` is a plain Int with no relation, so the
 * browser only sends the User id it already holds in session storage and the
 * Staff link is resolved here. Falls back to a name match for accounts
 * created before the 1:1 Staff relation existed.
 */
export async function resolveReporter(userId: number | null | undefined): Promise<{
  staffId: number | null;
  fullName: string | null;
}> {
  if (!userId) return { staffId: null, fullName: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      username: true,
      Staff: { select: { id: true, fullName: true } },
    },
  });
  if (!user) return { staffId: null, fullName: null };

  if (user.Staff) return { staffId: user.Staff.id, fullName: user.Staff.fullName };

  const name = user.fullName || user.username;
  if (name) {
    const byName = await prisma.staff.findFirst({
      where: { fullName: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (byName) return { staffId: byName.id, fullName: name };
  }
  return { staffId: null, fullName: name ?? null };
}

/** Who to credit on a timeline entry when the sender could not be resolved. */
export function reporterLabel(reporter: { fullName: string | null }): string {
  return reporter.fullName || "Imaging Staff";
}

/**
 * Hand a completed study back to the doctor: move the encounter, move the
 * patient, notify, and log the transfer.
 */
export async function routeImagingResultToDoctor(opts: {
  imagingRequestId: number;
  patientId: number;
  encounterId: number | null;
  studyType: string | null | undefined;
  reporter: { fullName: string | null };
  patientFirstName?: string | null;
  patientLastName?: string | null;
  patientStatus?: string | null;
  message?: string | null;
}): Promise<{ routedEncounter: boolean; admitted: boolean }> {
  const dept = deptForStudy(opts.studyType);
  const performedBy = reporterLabel(opts.reporter);
  const patientName = `${opts.patientFirstName ?? ""} ${opts.patientLastName ?? ""}`.trim();
  const isAdmitted = opts.patientStatus === "ADMITTED";

  // An ImagingRequest is not guaranteed to carry an encounterId — a study
  // created from a consultation that never had one would skip the encounter
  // move entirely and only touch Patient.currentStatus, which the
  // encounter-keyed doctor queues never read. Fall back to the newest ACTIVE
  // encounter, matching app/api/nurse-share/route.ts.
  let encounterId = opts.encounterId;
  if (!encounterId) {
    const active = await prisma.encounter.findFirst({
      where: { patientId: opts.patientId, status: "ACTIVE" },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    encounterId = active?.id ?? null;
  }

  if (isAdmitted) {
    // Admitted patients must stay ADMITTED or they drop out of the doctor's
    // admitted-patients list. Flag the result back instead of moving them.
    await prisma.patient.update({
      where: { id: opts.patientId },
      data: { lastSharedFromDept: dept },
    });
    await createNotification({
      department: "Doctor",
      title: "New Imaging Result",
      message: `${dept} completed a study for ${patientName}. Review in the patient record.`,
      // RESULT_SHARED, not a bespoke type: the inbox only knows a fixed set of
      // types for icon and click-routing, and an unknown one silently
      // navigates the doctor to /receptionist.
      type: "RESULT_SHARED",
      patientId: opts.patientId,
      referenceId: opts.imagingRequestId,
      referenceType: "imaging_request",
    });
    await prisma.patientTimeline.create({
      data: {
        patientId: opts.patientId,
        action: "TRANSFER",
        fromDepartment: dept,
        toDepartment: "Ward",
        description: `${dept} report completed for admitted patient.`,
        performedBy,
      },
    });
    return { routedEncounter: false, admitted: true };
  }

  await prisma.patient.update({
    where: { id: opts.patientId },
    data: { currentStatus: "AWAITING_DOCTOR", lastSharedFromDept: dept },
  });
  if (encounterId) {
    await returnEncounterToDoctor(encounterId, dept);
  }
  await createNotification({
    department: "Doctor",
    title: `${dept} Report Ready — Patient Returned`,
    message: opts.message || `Imaging report finalized. Patient routed back to Doctor.`,
    type: "RESULT_READY",
    patientId: opts.patientId,
    referenceId: opts.imagingRequestId,
    referenceType: "imaging_request",
  });
  await prisma.patientTimeline.create({
    data: {
      patientId: opts.patientId,
      action: "TRANSFER",
      fromDepartment: dept,
      toDepartment: "Doctor",
      description: `${dept} report completed. Patient routed back to Doctor.`,
      performedBy,
    },
  });
  return { routedEncounter: !!encounterId, admitted: false };
}

/**
 * A short, readable extract of the report for a notification body, so the
 * receiving clinician gets the substance without opening anything.
 */
export function reportExcerpt(
  req: { findings?: string | null; impression?: string | null; conclusion?: string | null },
  max = 300
): string {
  const source = (req.impression || req.conclusion || req.findings || "").trim();
  if (!source) return "";
  const flat = source.replace(/\s+/g, " ");
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}
