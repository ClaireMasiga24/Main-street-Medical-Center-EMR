import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.patientTimeline.findMany({
      where: {
        performedBy: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        Patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true },
        },
      },
    });

    const enriched = entries.map((e) => ({
      id: e.id,
      patientId: e.patientId,
      patientName: e.Patient ? `${e.Patient.lastName}, ${e.Patient.firstName}` : "Unknown",
      patientNumber: e.Patient?.patientNumber || "",
      action: e.action,
      description: e.description || "",
      fromDepartment: e.fromDepartment,
      toDepartment: e.toDepartment,
      performedBy: e.performedBy || "System",
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ entries: enriched });
  } catch (err) {
    console.error("[doctor/history GET]", err);
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}
