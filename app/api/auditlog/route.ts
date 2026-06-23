import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ─── GET: Fetch audit log entries ─────────────────────────────────────
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("userId");

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = parseInt(userId);

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        User: { select: { fullName: true, username: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const shaped = logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      userName: l.User.fullName,
      username: l.User.username,
      role: l.User.role,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, logs: shaped });
  } catch (error: any) {
    console.error("[AUDITLOG]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
