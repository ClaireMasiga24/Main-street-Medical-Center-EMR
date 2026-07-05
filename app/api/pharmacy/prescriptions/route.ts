import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createNotification } from "../../../lib/notifications";

// POST /api/pharmacy/prescriptions
// Standalone endpoint to send prescriptions to pharmacy from any department
// (Doctor, Radiologist/Sonographer, etc.) without requiring a full consultation flow.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId,
      prescriptions,
      prescriberName,
      prescriberRole,
      source,
      visitId,
    } = body;

    // ── Validate required fields ──
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    if (!prescriptions || !Array.isArray(prescriptions) || prescriptions.length === 0) {
      return NextResponse.json({ error: "At least one prescription is required" }, { status: 400 });
    }

    // Validate each prescription has medication name
    for (const rx of prescriptions) {
      if (!rx.medication || !rx.medication.trim()) {
        return NextResponse.json({ error: "Each prescription must have a medication name" }, { status: 400 });
      }
    }

    const sanitizedPrescriptions = prescriptions.map((rx: any) => ({
      medication: rx.medication.trim(),
      dosage: (rx.dosage || "").trim(),
      instructions: (rx.instructions || "").trim(),
    }));

    const performerName = prescriberName || prescriberRole || "Unknown";
    const performerRole = prescriberRole || "Clinician";

    // ── Fetch patient info for notification and timeline ──
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, currentStatus: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patName = `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`;

    // ── Execute in a transaction ──
    await prisma.$transaction(async (tx: any) => {
      // 1. Create prescription records
      await tx.prescription.createMany({
        data: sanitizedPrescriptions.map((rx: any) => ({
          patientId: patient.id,
          visitId: visitId || null,
          medication: rx.medication,
          dosage: rx.dosage,
          instructions: rx.instructions,
          status: "PENDING",
        })),
      });

      // 2. Create notification for Pharmacy department
      await tx.notification.create({
        data: {
          department: "PHARMACY",
          patientId: patient.id,
          title: "New Prescriptions",
          message: `${performerRole} ${performerName} prescribed ${sanitizedPrescriptions.length} medication(s) for ${patName}`,
          type: "RX_ORDER",
        },
      });

      // 3. Update patient status to AWAITING_PHARMACY (only if not already there or discharged)
      if (patient.currentStatus !== "AWAITING_PHARMACY" && patient.currentStatus !== "DISCHARGED") {
        await tx.patient.update({
          where: { id: patient.id },
          data: { currentStatus: "AWAITING_PHARMACY" },
        });
      }

      // 4. Log to PatientTimeline
      await tx.patientTimeline.create({
        data: {
          patientId: patient.id,
          action: "PRESCRIPTIONS_SENT",
          fromDepartment: source === "DOCTOR" ? "DOCTOR" : "RADIOLOGY",
          toDepartment: "PHARMACY",
          description: `${sanitizedPrescriptions.length} prescription(s) sent to Pharmacy by ${performerRole} ${performerName}`,
          metadata: JSON.stringify({
            prescriptionCount: sanitizedPrescriptions.length,
            medications: sanitizedPrescriptions.map((rx: any) => rx.medication),
            prescriberName: performerName,
            prescriberRole: performerRole,
          }),
          performedBy: performerName,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `${sanitizedPrescriptions.length} prescription(s) sent to Pharmacy`,
      count: sanitizedPrescriptions.length,
    });
  } catch (error: any) {
    console.error("[Pharmacy Prescriptions API]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
