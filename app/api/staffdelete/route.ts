import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff member not found",
        },
        { status: 404 }
      );
    }

    await prisma.staff.delete({
      where: { id },
    });

    await prisma.user.delete({
      where: {
        id: staff.userId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
  console.error("DELETE ERROR:", error);

  return NextResponse.json(
    {
      success: false,
      message: String(error),
    },
    { status: 500 }
  );
}
}