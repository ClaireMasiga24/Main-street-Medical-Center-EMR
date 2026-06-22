import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const queue = await prisma.patient.findMany({
      where: {
        currentStatus: "AWAITING_DENTIST",
      },

      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        phoneNumber: true,

        Visit: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            symptoms: true,
            createdAt: true,
          },
        },
      },

      orderBy: {
        updatedAt: "asc",
      },
    });

    return NextResponse.json(queue);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch dental queue",
      },
      {
        status: 500,
      }
    );
  }
}