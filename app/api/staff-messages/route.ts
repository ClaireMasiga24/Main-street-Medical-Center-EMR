import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// ─── GET — fetch staff messages, optionally filtered by department ───────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dept = searchParams.get("department");

    const where: any = {};
    if (dept && dept !== "ALL") {
      where.OR = [
        { targetDept: dept },
        { targetDept: null },
      ];
    }

    const messages = await prisma.staffMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// ─── POST — send a new staff message ────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { senderName, senderDept, message, targetDept } = await req.json();

    if (!senderName || !senderDept || !message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "senderName, senderDept, and message are required" },
        { status: 400 }
      );
    }

    const msg = await prisma.staffMessage.create({
      data: {
        senderName,
        senderDept,
        message: message.trim(),
        targetDept: targetDept || null,
      },
    });

    return NextResponse.json({ success: true, message: msg }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
