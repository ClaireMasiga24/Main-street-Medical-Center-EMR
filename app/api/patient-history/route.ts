import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(req: NextRequest) {
  const patientId = parseInt(req.nextUrl.searchParams.get("patientId") || "");
  if (!patientId) {
    return NextResponse.json({ error: "patientId query parameter is required" }, { status: 400 });
  }

  try {
    const [triage, visits, imaging, labHistory, prescriptions, timeline] = await Promise.all([
      // Latest triage / nurse midwife assessment
      prisma.triage.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),

      // Doctor consultations — latest 10
      prisma.visit.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          Triage: { select: { chiefComplaint: true, esiLevel: true } },
        },
      }),

      // Imaging / radiology / sonography reports — latest 10
      prisma.imagingRequest.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { Staff: { select: { fullName: true, department: true } } },
      }),

      // Past lab results — latest 20
      prisma.labRequest.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { Staff: { select: { fullName: true } } },
      }),

      // Prescriptions — latest 10
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Department-movement timeline — latest 50
      prisma.patientTimeline.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { triage, visits, imaging, labHistory, prescriptions, timeline },
    });
  } catch (error) {
    console.error("[patient-history] Error fetching patient history:", error);
    return NextResponse.json({ error: "Failed to fetch patient history" }, { status: 500 });
  }
}
