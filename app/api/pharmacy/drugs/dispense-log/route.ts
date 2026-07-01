import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const drugId = searchParams.get("drugId");
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const where: any = {};
    if (drugId) {
      where.drugId = parseInt(drugId);
    }

    const logs = await prisma.dispenseLog.findMany({
      where,
      orderBy: { dispensedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Dispense log error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
