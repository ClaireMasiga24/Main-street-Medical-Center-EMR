import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ─── POST: Record logout and clear lastActive ─────────────────────────
export async function POST(req: Request) {
  try {
    const { userId, username } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const uid = parseInt(userId);
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Record logout in audit log
    await prisma.auditLog.create({
      data: {
        action: "LOGOUT",
        details: `User "${username || user.username}" (${user.fullName}) logged out at ${new Date().toISOString()}. Role: ${user.role}`,
        userId: uid,
      },
    });

    // Clear last active (they're no longer online)
    await prisma.user.update({
      where: { id: uid },
      data: { lastActiveAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LOGOUT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
