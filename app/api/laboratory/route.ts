import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.labRequest.findMany();

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load laboratory requests",
      },
      { status: 500 }
    );
  }
}