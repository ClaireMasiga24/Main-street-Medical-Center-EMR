import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const procedures = await prisma.medicalProcedure.findMany({
      where: { patientId: parseInt(patientId) },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ procedures });
  } catch (err) {
    console.error("[procedures GET]", err);
    return NextResponse.json({ error: "Failed to load procedures." }, { status: 500 });
  }
}
