import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createEncounter } from "@/app/lib/encounterUtils";
import { generatePatientNumber } from "@/app/lib/patientUtils";

/**
 * POST /api/doctor/register-patient
 *
 * Registers a new patient directly from the doctor's page.
 * Patient is created with currentStatus "AWAITING_DOCTOR" and
 * an encounter owned by the DOCTOR department, so they appear
 * immediately in the doctor's queue on the next poll.
 *
 * Uses sequential (not transactional) queries so each DB write
 * releases the pgBouncer connection back to the pool immediately.
 * With connection_limit=1, a $transaction holding the single
 * connection for all three writes causes "unable to start
 * transaction at this particular time" pool-exhaustion errors.
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

        // Sequential writes — each releases the pgBouncer connection
        // back to the pool so concurrent requests aren't starved.
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
            currentStatus: "AWAITING_DOCTOR",
          },
        });

        await prisma.visit.create({
          data: {
            patientId: patient.id,
            symptoms: null,
          },
        });

        encounter = await createEncounter({
          patientId: patient.id,
          source: "Doctor Registration",
          isEmergency: false,
        });

        break; // success — exit retry loop
      } catch (err: any) {
        attempts++;
        // Only retry on unique constraint violations (patientNumber collision)
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
    console.error("[Doctor Register] error:", err);
    // Surface a clear message to the client
    const msg =
      err.message?.includes("unable to start transaction")
        ? "Database pool busy — please try again in a moment."
        : err.message || "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
