import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ─── POST: Update user's last active timestamp ────────────────────────
export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { lastActiveAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[HEARTBEAT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── GET: Get online users (active in last 5 minutes) ─────────────────
export async function GET() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await prisma.user.findMany({
      where: { lastActiveAt: { gte: fiveMinutesAgo } },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        lastActiveAt: true,
        Staff: { select: { department: true, phoneNumber: true } },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    const shaped = onlineUsers.map((u) => ({
      id: u.id,
      name: u.fullName,
      username: u.username,
      role: u.role.replace(/_/g, " "),
      department: u.Staff?.department || "—",
      phone: u.Staff?.phoneNumber || "—",
      lastActive: u.lastActiveAt?.toISOString() || null,
    }));

    return NextResponse.json({ success: true, online: shaped, count: shaped.length });
  } catch (error: any) {
    console.error("[HEARTBEAT_GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
