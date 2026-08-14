import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createEncounter } from "@/app/lib/encounterUtils";
import { generatePatientNumber } from "@/app/lib/patientUtils";

/**
 * POST /api/nurse_midwife/register-patient
 *
 * Registers a new patient directly from the nurse/midwife page.
 * Patient is created with currentStatus "AWAITING_TRIAGE" so they
 * appear immediately in the nurse/midwife triage queue.
 *
 * Uses sequential (not transactional) queries so each DB write
 * releases the pgBouncer connection back to the pool immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, age, ageUnit, gender, phone, address } =
      await req.json();

    // Validate required fields
    if (!firstName || !lastName || !age || !gender) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, age, gender" },
        { status: 400 }
      );
    }

    // Retry loop for patientNumber collisions
    let patient;
    let encounter;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const patientNumber = await generatePatientNumber();

        patient = await prisma.patient.create({
          data: {
            patientNumber,
            firstName,
            lastName,
            age: parseInt(age, 10),
            ageUnit: ageUnit || "years",
            gender,
            phoneNumber: phone ?? null,
            address: address ?? null,
            isEmergency: false,
            currentStatus: "AWAITING_TRIAGE",
          },
        });

        await prisma.visit.create({
          data: {
            patientId: patient.id,
            symptoms: "Registered by nurse/midwife",
          },
        });

        encounter = await createEncounter({
          patientId: patient.id,
          source: "Nurse Registration",
          isEmergency: false,
          currentOwnerDept: "NURSE",
          currentStatus: "AWAITING_TRIAGE",
        });

        break; // success — exit retry loop
      } catch (err: any) {
        attempts++;
        if (
          attempts >= maxAttempts ||
          !err.message?.includes("Unique constraint")
        ) {
          throw err;
        }
      }
    }

    return NextResponse.json(
      { patient, encounterId: encounter!.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Nurse Register] error:", err);
    const msg =
      err.message?.includes("unable to start transaction")
        ? "Database pool busy — please try again in a moment."
        : err.message || "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
