import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * PATCH /api/patients/[id]
 *
 * Updates patient demographics (name, age, gender, phone, address).
 * Used by doctors to correct details on patients they registered.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id, 10);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const body = await req.json();
    const { firstName, lastName, age, ageUnit, gender, phone, address } = body;

    // Build update payload — only include fields that were sent
    const data: Record<string, any> = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (age !== undefined) data.age = parseInt(age, 10);
    if (ageUnit !== undefined) data.ageUnit = ageUnit;
    if (gender !== undefined) data.gender = gender;
    if (phone !== undefined) data.phoneNumber = phone || null;
    if (address !== undefined) data.address = address || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data,
    });

    return NextResponse.json({ patient: updated });
  } catch (err: any) {
    console.error("[patients/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}
