import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET — fetch a specific dental record by ID or all records for a patient
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const patientId = searchParams.get("patientId");

    if (id) {
      // Single record with all details
      const record = await prisma.dentalRecord.findUnique({
        where: { id: parseInt(id) },
        include: {
          Patient: true,
          Staff: { select: { fullName: true, id: true } },
          OdontogramFinding: {
            orderBy: { toothNumber: "asc" },
          },
          DentalProcedure: {
            orderBy: { createdAt: "desc" },
          },
          DentalImage: {
            orderBy: { sortOrder: "asc" },
          },
          Visit: true,
        },
      });

      if (!record) {
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
      }

      return NextResponse.json({ record });
    }

    if (patientId) {
      // All records for a patient
      const records = await prisma.dentalRecord.findMany({
        where: { patientId: parseInt(patientId) },
        orderBy: { createdAt: "desc" },
        include: {
          Staff: { select: { fullName: true } },
          OdontogramFinding: true,
          DentalProcedure: true,
          _count: {
            select: { DentalImage: true },
          },
        },
      });

      return NextResponse.json({ records });
    }

    return NextResponse.json({ error: "Provide id or patientId." }, { status: 400 });
  } catch (err) {
    console.error("[dental/records GET]", err);
    return NextResponse.json({ error: "Failed to load records." }, { status: 500 });
  }
}
