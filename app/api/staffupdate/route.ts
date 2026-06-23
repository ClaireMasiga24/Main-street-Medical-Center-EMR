import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const { id, username, phoneNumber, newPassword } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Staff ID is required." },
        { status: 400 }
      );
    }

    // Find the staff member with their user
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { User: true },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found." },
        { status: 404 }
      );
    }

    // Build update data for Staff and User separately
    const staffData: any = {};
    const userData: any = {};

    if (phoneNumber !== undefined) staffData.phoneNumber = phoneNumber;

    if (username !== undefined) {
      // Check uniqueness (exclude current user)
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: staff.userId } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "Username already taken by another user." },
          { status: 409 }
        );
      }
      userData.username = username;
    }

    if (newPassword) {
      userData.password = await bcrypt.hash(newPassword, 10);
    }

    // Perform updates in a transaction
    await prisma.$transaction(async (tx: any) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: staff.userId },
          data: userData,
        });
      }
      if (Object.keys(staffData).length > 0) {
        await tx.staff.update({
          where: { id },
          data: staffData,
        });
      }
    });

    // Return the updated staff with user info
    const updatedStaff = await prisma.staff.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, username: true, role: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: updatedStaff!.id,
        fullName: updatedStaff!.fullName,
        department: updatedStaff!.department,
        phoneNumber: updatedStaff!.phoneNumber,
        specialization: updatedStaff!.specialization,
        username: updatedStaff!.User?.username,
        role: updatedStaff!.User?.role,
        email: updatedStaff!.User?.email,
      },
    });
  } catch (e: any) {
    console.error("[staffupdate PATCH]", e);
    return NextResponse.json(
      { success: false, message: e.message || "Failed to update staff." },
      { status: 500 }
    );
  }
}
