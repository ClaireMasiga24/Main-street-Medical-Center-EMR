import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// ─── POST: Record logout and clear lastActive ─────────────────────────
//
// A client calling this is logging out whether or not we can identify them.
// Every "can't identify" path therefore returns success rather than an error:
// refusing the request only loses the audit row, and used to leave callers
// (the doctor page posted with no body at all) silently unauthorized in the
// admin's online list.
export async function POST(req: Request) {
  let userId: unknown;
  let username: unknown;

  try {
    const body = await req.json();
    userId = body?.userId;
    username = body?.username;
  } catch {
    // Missing or unparseable body — fall through and clear what we can.
  }

  try {
    const uid = Number(userId);

    if (!Number.isInteger(uid) || uid <= 0) {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Record logout in audit log
    await prisma.auditLog.create({
      data: {
        action: "LOGOUT",
        details: `User "${
          typeof username === "string" && username ? username : user.username
        }" (${user.fullName}) logged out at ${new Date().toISOString()}. Role: ${
          user.role
        }`,
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
