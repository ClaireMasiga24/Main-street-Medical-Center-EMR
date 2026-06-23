import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET — fetch all patients who have ever had a dental record
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const where: any = {
      DentalRecord: { some: {} }, // Has at least one dental record
    };

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { patientNumber: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        phoneNumber: true,
        isEmergency: true,
        currentStatus: true,
        _count: {
          select: {
            DentalRecord: true,
          },
        },
        DentalRecord: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            reportNumber: true,
            diagnosis: true,
            treatmentPlan: true,
            createdAt: true,
            Staff: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ patients });
  } catch (err) {
    console.error("[dental/patients-by-dentist GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}
