import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// GET — search dental records across all patients
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const patientId = searchParams.get("patientId");

    const where: any = {};

    // Filter by specific patient
    if (patientId) {
      where.patientId = parseInt(patientId);
    }

    // Full-text search across multiple fields
    if (q) {
      where.OR = [
        { Patient: { firstName: { contains: q, mode: "insensitive" } } },
        { Patient: { lastName: { contains: q, mode: "insensitive" } } },
        { Patient: { patientNumber: { contains: q, mode: "insensitive" } } },
        { Patient: { phoneNumber: { contains: q } } },
        { chiefComplaint: { contains: q, mode: "insensitive" } },
        { diagnosis: { contains: q, mode: "insensitive" } },
        { treatmentPlan: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { reportNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const records = await prisma.dentalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        Patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            age: true,
            phoneNumber: true,
          },
        },
        Staff: {
          select: {
            id: true,
            fullName: true,
          },
        },
        OdontogramFinding: true,
        DentalProcedure: true,
        _count: {
          select: {
            DentalImage: true,
            DentalProcedure: true,
            OdontogramFinding: true,
          },
        },
      },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[dental-records GET]", err);
    return NextResponse.json({ error: "Failed to load dental records." }, { status: 500 });
  }
}
