import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, password, role } = await req.json();

    const user = await prisma.user.findUnique({
      where: { username },
      include: { Staff: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Wrong password" },
        { status: 401 }
      );
    }

    if (user.role.trim().toUpperCase() !== role.trim().toUpperCase()) {
      return NextResponse.json(
        { success: false, message: "Role mismatch" },
        { status: 403 }
      );
    }

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Record login in audit log
    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        details: `User "${user.username}" (${user.fullName}) logged in as ${user.role} at ${new Date().toISOString()}. Department: ${user.Staff?.department || "N/A"}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.Staff?.department || null,
        phoneNumber: user.Staff?.phoneNumber || null,
        specialization: user.Staff?.specialization || null,
        staffId: user.Staff?.id || null,
      },
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
