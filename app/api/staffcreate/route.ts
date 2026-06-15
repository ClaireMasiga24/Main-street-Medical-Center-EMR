import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({ include: { User: true } });
    const formatted = staff.map((s: any) => ({
      id: s.id,
      fullName: s.fullName,
      department: s.department,
      phoneNumber: s.phoneNumber,
      specialization: s.specialization,
      username: s.User?.username || "N/A",
      role: s.User?.role || "N/A",
      email: s.User?.email || "N/A",
    }));
    return NextResponse.json({ success: true, staff: formatted });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { fullName, username, email, password, role, department, phoneNumber, specialization } = await req.json();
    const user = await prisma.user.create({
      data: { fullName, username, email, password, role, securityQuestion: "N/A", securityAnswer: "N/A" }
    });
    await prisma.staff.create({
      data: { fullName, department, phoneNumber, specialization, userId: user.id }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: "Error creating user" }, { status: 500 });
  }
}
