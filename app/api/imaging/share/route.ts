import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createNotification } from "../../../lib/notifications";
import { normalizeDept } from "../../../lib/departments";
import {
  deptForStudy,
  reportExcerpt,
  resolveReporter,
  routeImagingResultToDoctor,
} from "../../../lib/imagingUtils";

const STUDY_LABELS: Record<string, string> = {
  X_RAY: "X-Ray",
  ULTRASOUND: "Ultrasound",
  CT_SCAN: "CT Scan",
  MRI: "MRI",
  MAMMOGRAPHY: "Mammography",
  ECHOCARDIOGRAPHY: "Echocardiography",
  DOPPLER: "Doppler",
  FLUOROSCOPY: "Fluoroscopy",
};

/**
 * POST /api/imaging/share
 *
 * Push a completed imaging report to any department.
 *
 * Targeting the doctor is the full "hand the patient back" flow: the encounter
 * and patient move, the doctor is notified, and the transfer is logged. Any
 * other department is notified only — sharing with pharmacy or the ward must
 * not pull the patient out from under the clinician who is still seeing them.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imagingRequestId, targetDept, note, reporterUserId } = body;

    if (!imagingRequestId || !targetDept) {
      return NextResponse.json(
        { error: "imagingRequestId and targetDept are required" },
        { status: 400 }
      );
    }

    const department = normalizeDept(targetDept);
    if (!department) {
      return NextResponse.json(
        { error: `Unknown department "${targetDept}"` },
        { status: 400 }
      );
    }

    const req = await prisma.imagingRequest.findUnique({
      where: { id: parseInt(imagingRequestId) },
      include: {
        Patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            currentStatus: true,
          },
        },
        Encounter: { select: { id: true } },
      },
    });

    if (!req) {
      return NextResponse.json({ error: "Imaging request not found" }, { status: 404 });
    }
    if (!req.Patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const reporter = await resolveReporter(reporterUserId ?? null);
    const sourceDept = deptForStudy(req.studyType);
    const studyLabel = STUDY_LABELS[req.studyType] || req.studyType;
    const patientName = `${req.Patient.firstName} ${req.Patient.lastName}`;
    const excerpt = reportExcerpt(req);
    const suffix = note ? ` — ${note}` : "";
    const statusNote = req.status === "REPORTED" ? "" : " (DRAFT — not yet finalized)";

    if (department === "Doctor") {
      const outcome = await routeImagingResultToDoctor({
        imagingRequestId: req.id,
        patientId: req.Patient.id,
        encounterId: req.Encounter?.id ?? null,
        studyType: req.studyType,
        reporter,
        patientFirstName: req.Patient.firstName,
        patientLastName: req.Patient.lastName,
        patientStatus: req.Patient.currentStatus,
        message: `${studyLabel} report for ${patientName} (${req.Patient.patientNumber})${statusNote}.${excerpt ? ` ${excerpt}` : ""}${suffix}`,
      });
      return NextResponse.json({
        success: true,
        department,
        routedToDoctor: true,
        admitted: outcome.admitted,
        routedEncounter: outcome.routedEncounter,
        message: outcome.admitted
          ? `Report sent to Doctor. Patient is admitted, so they were not moved out of the ward.`
          : `Report sent to Doctor and patient returned to their queue.`,
      });
    }

    // Everyone else: notify only. The patient does not move.
    await createNotification({
      department,
      title: `${sourceDept} Report Shared — ${studyLabel}`,
      message: `${patientName} (${req.Patient.patientNumber}): ${studyLabel}${statusNote}.${excerpt ? ` ${excerpt}` : ""}${suffix}`,
      type: "RESULT_SHARED",
      patientId: req.Patient.id,
      referenceId: req.id,
      referenceType: "imaging_request",
    });

    await prisma.patientTimeline
      .create({
        data: {
          patientId: req.Patient.id,
          action: "PATIENT_SHARED",
          fromDepartment: sourceDept,
          toDepartment: department,
          description: note || `${sourceDept} report shared with ${department}.`,
          performedBy: reporter.fullName || "Imaging Staff",
        },
      })
      .catch((e: any) => console.error("[Imaging share] timeline error", e));

    return NextResponse.json({
      success: true,
      department,
      routedToDoctor: false,
      message: `Report shared with ${department}.`,
    });
  } catch (err: any) {
    console.error("[Imaging share]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
