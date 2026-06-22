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
};

// GET — fetch all AWAITING_DOCTOR patients (triage queue for doctors)
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { currentStatus: "AWAITING_DOCTOR" },
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            Prescription: true,
            LabRequest: true,
          },
        },
      },
    });
    return NextResponse.json(patients);
  } catch (err) {
    console.error("[doctor GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}

// POST — complete consultation: save Visit, Prescriptions, LabRequests, update status
export async function POST(req: NextRequest) {
  try {
    const { patientId, staffId, symptoms, diagnosis, notes, prescriptions, labRequests, routeTo } = await req.json();

    if (!patientId || !routeTo || !(routeTo in ROUTE_TO_STATUS)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.visit.create({
        data: {
          patientId,
          symptoms:  symptoms  || null,
          diagnosis: diagnosis || null,
          notes:     notes     || null,
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

      await tx.patient.update({
        where: { id: patientId },
        data:  { currentStatus: ROUTE_TO_STATUS[routeTo] },
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