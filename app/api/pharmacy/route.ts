import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        Prescription: { some: { status: "PENDING" } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        Prescription: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        Triage: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("Pharmacy API error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { prescriptionId } = await request.json();
    if (!prescriptionId) {
      return NextResponse.json({ error: "prescriptionId is required" }, { status: 400 });
    }

    // Get the prescription first to find the patient
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: { id: true, patientId: true },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const updated = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: "DISPENSED" },
    });

    // Check if the patient has any remaining PENDING prescriptions
    const remainingPending = await prisma.prescription.count({
      where: { patientId: prescription.patientId, status: "PENDING" },
    });

    // If no more pending prescriptions, clear the AWAITING_PHARMACY status
    if (remainingPending === 0) {
      await prisma.patient.update({
        where: { id: prescription.patientId },
        data: { currentStatus: "ADMITTED" },
      });
    }

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
