import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        Visit: { some: {} }, // has at least one visit/consultation
      },
      orderBy: { updatedAt: "desc" },
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { Visit: true },
        },
      },
    });

    const enriched = patients.map((p) => {
      const latestVisit = p.Visit?.[0];
      return {
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        age: p.age,
        phoneNumber: p.phoneNumber,
        isEmergency: p.isEmergency,
        currentStatus: p.currentStatus,
        lastVisitDate: latestVisit?.createdAt || p.updatedAt,
        diagnosis: latestVisit?.diagnosis || "",
        visitCount: p._count.Visit,
      };
    });

    return NextResponse.json({ patients: enriched });
  } catch (err) {
    console.error("[doctor/records GET]", err);
    return NextResponse.json(
      { error: "Failed to load doctor records." },
      { status: 500 }
    );
  }
}
