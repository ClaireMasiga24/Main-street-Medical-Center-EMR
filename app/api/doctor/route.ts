import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { PatientStatus, Prisma } from "@prisma/client";

const ROUTE_TO_STATUS: Record<string, PatientStatus> = {
  LAB:        "AWAITING_LAB",
  SONOGRAPHY: "AWAITING_SONOGRAPHY",
  RADIOLOGY:  "AWAITING_RADIOLOGY",
  NURSE:      "AWAITING_TRIAGE",
  PHARMACY:   "AWAITING_PHARMACY",
  CASHIER:    "AWAITING_CASHIER",
  DISCHARGE:  "DISCHARGED",
  ADMIT:      "ADMITTED",
  DENTIST:    "AWAITING_DENTIST",
  TREATMENT:  "ADMITTED",
};

// GET — fetch patients waiting for the doctor or already in consultation
// Optimized for performance: only loads the latest visit (without heavy nested relations)
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1, // only the most recent visit is needed for the queue list
        },
      },
    });
    return NextResponse.json(patients);
  } catch (err) {
    console.error("[doctor GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}

// POST — complete consultation: save Visit, Prescriptions, LabRequests, timeline, update status
export async function POST(req: NextRequest) {
  try {
    const {
      patientId, staffId, staffName,
      symptoms, historyOfPresentIllness, pastMedicalHistory,
      reviewOfOtherSystems,
      physicalExamination, diagnosis, differentialDiagnosis,
      assessment, treatmentPlan, notes, doctorSignature,
      prescriptions, labRequests, routeTo,
    } = await req.json();

    if (!patientId || !routeTo || !(routeTo in ROUTE_TO_STATUS)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const performerName = staffName || "Doctor";

    // ── Admitted patient routing ──
    // If a patient is ADMITTED, sending them to any department (Lab, Radiology,
    // Treatment, Pharmacy, etc.) should NOT change their status away from ADMITTED.
    // Only DISCHARGE removes them from the doctor's Admitted Patients list.
    let effectiveRoute = routeTo;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { currentStatus: true },
    });

    if (patient?.currentStatus === "ADMITTED" && routeTo !== "DISCHARGE") {
      // Redirect NURSE → TREATMENT for admitted patients
      if (routeTo === "NURSE") effectiveRoute = "TREATMENT";
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.visit.create({
        data: {
          patientId,
          symptoms:              symptoms              || null,
          historyOfPresentIllness: historyOfPresentIllness || null,
          pastMedicalHistory:    pastMedicalHistory    || null,
          reviewOfOtherSystems:  reviewOfOtherSystems  || null,
          physicalExamination:   physicalExamination   || null,
          diagnosis:             diagnosis             || null,
          differentialDiagnosis: differentialDiagnosis || null,
          assessment:            assessment            || null,
          treatmentPlan:         treatmentPlan         || null,
          notes:                 notes                 || null,
          doctorSignature:       doctorSignature       || null,
          doctorId:              staffId                || null,
          doctorName:            staffName              || null,
        },
      });

      if (prescriptions?.length) {
        await tx.prescription.createMany({
          data: prescriptions.map((p: { medication: string; dosage: string; instructions: string }) => ({
            patientId,
            visitId:      visit.id,
            medication:   p.medication,
            dosage:       p.dosage,
            instructions: p.instructions,
          })),
        });
      }

      if (labRequests?.length && staffId) {
        await tx.labRequest.createMany({
          data: labRequests.map((l: { testName: string }) => ({
            patientId,
            visitId:       visit.id,
            requestedById: staffId,
            testName:      l.testName,
            status:        "PENDING",
          })),
        });
      }

      // Create imaging request if routing to SONOGRAPHY or RADIOLOGY
      if (effectiveRoute === "SONOGRAPHY" || effectiveRoute === "RADIOLOGY") {
        await tx.imagingRequest.create({
          data: {
            patientId,
            visitId:        visit.id,
            requestedById:  staffId ?? undefined,
            studyType:      effectiveRoute === "SONOGRAPHY" ? "ULTRASOUND" : "X_RAY",
            priority:       "ROUTINE",
            referralSource: "DOCTOR",
            clinicalNotes:  symptoms || null,
            status:         "ORDERED",
          },
        });
      }

      // ── Determine what status to set ──
      // Admitted patients keep their ADMITTED status unless discharged,
      // so they stay on the doctor's Admitted Patients dashboard.
      const isAdmitted = patient?.currentStatus === "ADMITTED";
      const newStatus = isAdmitted
        ? (effectiveRoute === "DISCHARGE" ? "DISCHARGED" : "ADMITTED" as PatientStatus)
        : ROUTE_TO_STATUS[effectiveRoute];

      // Determine if we need to flag for Treatment Room
      const goingToTreatment = effectiveRoute === "TREATMENT" || (isAdmitted && effectiveRoute === "NURSE");
      const beingDischarged = effectiveRoute === "DISCHARGE";
      const updateData: any = { currentStatus: newStatus };
      if (goingToTreatment) updateData.sentToTreatmentRoom = true;
      if (beingDischarged) updateData.sentToTreatmentRoom = false;

      await tx.patient.update({
        where: { id: patientId },
        data:  updateData,
      });

      // ── Log to PatientTimeline ──
      const actionLabel =
        effectiveRoute === "ADMIT" ? "ADMITTED" :
        effectiveRoute === "CASHIER" ? "FINISHED" :
        effectiveRoute === "DISCHARGE" ? "DISCHARGED" :
        effectiveRoute === "TREATMENT" ? "SENT TO TREATMENT ROOM" :
        "REFERRED";

      await tx.patientTimeline.create({
        data: {
          patientId,
          action:        "CONSULTATION_END",
          fromDepartment: "DOCTOR",
          toDepartment:   effectiveRoute === "ADMIT" ? "WARD" :
                          effectiveRoute === "CASHIER" ? "CASHIER" :
                          effectiveRoute === "DISCHARGE" ? "DISCHARGE" :
                          effectiveRoute === "TREATMENT" ? "TREATMENT_ROOM" :
                          effectiveRoute === "REFERRAL" && labRequests?.length ? "LAB" : effectiveRoute,
          description:   `Consultation completed — ${actionLabel}. Diagnosis: ${diagnosis || "gastritis"}`,
          metadata:      JSON.stringify({
            visitId:       visit.id,
            diagnosis,
            treatmentPlan,
            prescriptionCount: prescriptions?.length || 0,
            labCount:          labRequests?.length || 0,
            routeTo: effectiveRoute,
          }),
          performedBy:   performerName,
          performedById: staffId || null,
        },
      });

      // Also log consultation start if it wasn't logged earlier
      await tx.patientTimeline.create({
        data: {
          patientId,
          action:        "STATUS_CHANGE",
          fromDepartment: "AWAITING_DOCTOR",
          toDepartment:   "CONSULTATION",
          description:   `Consultation began with Dr. ${performerName}`,
          performedBy:   performerName,
          performedById: staffId || null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[doctor POST]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

// PATCH — begin consultation: move a patient from AWAITING_DOCTOR to IN_CONSULTATION
export async function PATCH(req: NextRequest) {
  try {
    const { patientId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data:  { currentStatus: "IN_CONSULTATION" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[doctor PATCH]", err);
    return NextResponse.json({ error: "Failed to start consultation." }, { status: 500 });
  }
}