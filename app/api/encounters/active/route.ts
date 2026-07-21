import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/encounters/active?patientId=X&staffId=Y
// Returns the patient's active encounter + optional doctor's existing ClinicalNote
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = parseInt(searchParams.get("patientId") || "");
    const authorStaffId = searchParams.get("staffId")
      ? parseInt(searchParams.get("staffId")!)
      : null;

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId query parameter is required" },
        { status: 400 }
      );
    }

    const encounter = await prisma.encounter.findFirst({
      where: { patientId, status: "ACTIVE" },
      orderBy: { openedAt: "desc" },
    });

    if (!encounter) {
      return NextResponse.json(null);
    }

    let myNote = null;
    if (authorStaffId) {
      myNote = await prisma.clinicalNote.findUnique({
        where: {
          encounterId_authorStaffId: {
            encounterId: encounter.id,
            authorStaffId,
          },
        },
      });
    }

    return NextResponse.json({ encounter, myNote });
  } catch (err: any) {
    console.error("[encounters/active GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch active encounter." },
      { status: 500 }
    );
  }
}
