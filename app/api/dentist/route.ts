import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { PatientStatus, Prisma } from "@prisma/client";

const ROUTE_TO_STATUS: Record<string, PatientStatus> = {
  LAB:        "AWAITING_LAB",
  SONOGRAPHY: "AWAITING_SONOGRAPHY",
  RADIOLOGY:  "AWAITING_RADIOLOGY",
  DOCTOR:     "AWAITING_DOCTOR",
  NURSE:      "AWAITING_TRIAGE",
  PHARMACY:   "AWAITING_PHARMACY",
  CASHIER:    "AWAITING_CASHIER",
  DISCHARGE:  "DISCHARGED",
};

// GET — fetch patients waiting for the dentist or already in consultation
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { currentStatus: { in: ["AWAITING_DENTIST", "IN_CONSULTATION"] } },
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(patients);
  } catch (err) {
    console.error("[dentist GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}

// POST — complete consultation: save DentalRecord, update status
export async function POST(req: NextRequest) {
  try {
    const { patientId, staffId, chiefComplaint, diagnosis, treatment, notes, routeTo } = await req.json();

    if (!patientId || !routeTo || !(routeTo in ROUTE_TO_STATUS)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find or create a visit for this consultation
      const existingVisit = await tx.visit.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      });

      const visit = existingVisit ?? await tx.visit.create({
        data: { patientId, symptoms: chiefComplaint || null },
      });

      await tx.dentalRecord.create({
        data: {
          patientId,
          visitId: visit.id,
          chiefComplaint: chiefComplaint || null,
          diagnosis: diagnosis || null,
          treatment: treatment || null,
          notes: notes || null,
        },
      });

      await tx.patient.update({
        where: { id: patientId },
        data: { currentStatus: ROUTE_TO_STATUS[routeTo] },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dentist POST]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

// PATCH — begin consultation
export async function PATCH(req: NextRequest) {
  try {
    const { patientId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: { currentStatus: "IN_CONSULTATION" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[dentist PATCH]", err);
    return NextResponse.json({ error: "Failed to start consultation." }, { status: 500 });
  }
}
