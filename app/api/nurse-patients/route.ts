import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "AWAITING_TRIAGE";

    let whereClause: any;
	    if (status === "TREATMENT_ROOM") {
	      // Treatment Room: all ADMITTED patients (both in-treatment-room and ward-admitted)
	      whereClause = {
	        OR: [
	          { currentStatus: "ADMITTED" },
	          { sentToTreatmentRoom: true },
	        ],
	      };
    } else {
      whereClause = { currentStatus: status as any };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      include: {
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

    return NextResponse.json(patients);
  } catch (error: any) {
    console.error("API Error details:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
