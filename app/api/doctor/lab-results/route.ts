import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/doctor/lab-results?patientId=N
 *
 * Every lab result this patient has, newest first, WITH the share records that
 * say who released each one and to which department.
 *
 * /api/doctor/reviews already carries the same LabRequest rows, but without
 * the ResultShares — and the results view has to work from a notification
 * click, where no consultation is open to have fetched that payload. Rather
 * than grow the reviews response for every consumer, this is the one read the
 * results view makes. Read-only; nothing here writes.
 *
 * CANCELLED rows are dropped: a cancelled test never has a result, and showing
 * it beside real ones would read as "a test you are still waiting for".
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = parseInt(searchParams.get("patientId") || "", 10);
    if (!patientId || Number.isNaN(patientId)) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const labRequests = await prisma.labRequest.findMany({
      where: { patientId, status: { not: "CANCELLED" } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      include: {
        ResultShares: {
          orderBy: { sharedAt: "desc" },
          select: {
            sharedByName: true,
            targetDept: true,
            sharedAt: true,
            note: true,
            includeReport: true,
          },
        },
      },
    });

    return NextResponse.json({ labRequests });
  } catch (err) {
    console.error("[doctor/lab-results GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load lab results." },
      { status: 500 }
    );
  }
}
