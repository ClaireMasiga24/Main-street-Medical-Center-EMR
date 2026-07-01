import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        Prescription: {
          some: { status: "PENDING" },
        },
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

    const updated = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: "DISPENSED" },
    });

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
