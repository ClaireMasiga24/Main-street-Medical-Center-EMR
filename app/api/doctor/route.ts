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
      if (routeTo === "SONOGRAPHY" || routeTo === "RADIOLOGY") {
        await tx.imagingRequest.create({
          data: {
            patientId,
            visitId:        visit.id,
            requestedById:  staffId ?? undefined,
            studyType:      routeTo === "SONOGRAPHY" ? "ULTRASOUND" : "X_RAY",
            priority:       "ROUTINE",
            referralSource: "DOCTOR",
            clinicalNotes:  symptoms || null,
            status:         "ORDERED",
          },
        });
      }

      await tx.patient.update({
        where: { id: patientId },
        data:  { currentStatus: ROUTE_TO_STATUS[routeTo] },
      });

      // ── Log to PatientTimeline ──
      const actionLabel =
        routeTo === "ADMIT" ? "ADMITTED" :
        routeTo === "CASHIER" ? "FINISHED" :
        routeTo === "DISCHARGE" ? "DISCHARGED" :
        "REFERRED";

      await tx.patientTimeline.create({
        data: {
          patientId,
          action:        "CONSULTATION_END",
          fromDepartment: "DOCTOR",
          toDepartment:   routeTo === "ADMIT" ? "WARD" :
                          routeTo === "CASHIER" ? "CASHIER" :
                          routeTo === "DISCHARGE" ? "DISCHARGE" :
                          routeTo === "REFERRAL" && labRequests?.length ? "LAB" : routeTo,
          description:   `Consultation completed — ${actionLabel}. Diagnosis: ${diagnosis || "Not specified"}`,
          metadata:      JSON.stringify({
            visitId:       visit.id,
            diagnosis,
            treatmentPlan,
            prescriptionCount: prescriptions?.length || 0,
            labCount:          labRequests?.length || 0,
            routeTo,
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