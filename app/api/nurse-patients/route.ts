import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma"; // This connects to your valid lib/prisma.ts

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "AWAITING_TRIAGE";

    const patients = await prisma.patient.findMany({
      where: { currentStatus: status as any }, 
      orderBy: { createdAt: "asc" },
    });
    
    return NextResponse.json(patients);
  } catch (error: any) {
    // This log will appear in your VS Code Terminal
    console.error("API Error details:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}