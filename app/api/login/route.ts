import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // ✅ added

export async function POST(req: Request) {
  try {
    const { username, password, role } = await req.json();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ bcrypt.compare instead of === (passwords are now hashed in DB)
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
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