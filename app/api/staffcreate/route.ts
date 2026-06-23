import { prisma } from "@/app/lib/prisma"; // ✅ correct path

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({ include: { User: true } });
    const formatted = staff.map((s: any) => ({
      id: s.id,
      fullName: s.fullName,
      department: s.department,
      phoneNumber: s.phoneNumber,
      specialization: s.specialization,
      userId: s.userId, // needed for matching logged-in user to staff record
      username: s.User?.username || "N/A",
      role: s.User?.role || "N/A",
      email: s.User?.email || "N/A",
    }));
    return NextResponse.json({ success: true, staff: formatted });
  } catch (e) {
    console.error("GET error:", e); // ← added
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { fullName, username, email, password, role, department, phoneNumber, specialization } = await req.json();

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Check for duplicate before attempting create
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: existing.username === username ? "Username already taken" : "Email already registered" },
        { status: 409 }
      );
    }

    // ✅ Atomic transaction — both or neither
    await prisma.$transaction(async (tx:any) => {
      const user = await tx.user.create({
        data: {
          fullName,
          username,
          email,
          password: hashedPassword,
          role,                      // must match enum e.g. "LAB_TECHNICIAN" not "Lab Technician"
          securityQuestion: "N/A",
          securityAnswer: "N/A",
        }
      });
      await tx.staff.create({
        data: {
          fullName,
          department,
          phoneNumber: phoneNumber || null,
          specialization: specialization || null,
          userId: user.id,
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("POST error:", e); // ← THIS will now show you exactly what's failing
    return NextResponse.json(
      { success: false, message: e.message || "Error creating user" },
      { status: 500 }
    );
  }
}