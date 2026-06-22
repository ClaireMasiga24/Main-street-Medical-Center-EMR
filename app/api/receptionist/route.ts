import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a patient number like MSMC-2026-0001 */
async function generatePatientNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.patient.count();
  const seq = String(count + 1).padStart(4, "0");
  return `MSMC-${year}-${seq}`;
}

// ─── GET — fetch all active patients for the Tracking Desk ───────────────────

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        currentStatus: {
          not: "DISCHARGED",
        },
      },
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1, // most recent visit so we can surface chiefComplaint
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Shape the data to match what the frontend's Patient interface expects.
    // The frontend uses: patientNumber, firstName, lastName, age, dob, gender,
    // phone, address, chiefComplaint, isEmergency, status, createdAt
    const shaped = patients.map((p) => ({
      id: p.id,
      patientNumber: p.patientNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age,
      dob: p.dateOfBirth ? p.dateOfBirth.toISOString() : null,
      gender: p.gender,
      phone: p.phoneNumber ?? null,
      address: p.address ?? null,
      // chiefComplaint lives on Visit in the schema — surface from latest visit
      chiefComplaint: p.Visit[0]?.symptoms ?? "Not recorded",
      isEmergency: p.isEmergency,
      status: p.currentStatus,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json(shaped);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

// ─── POST — all mutating actions ─────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {

      // ── Register a new patient (standard or emergency) ──────────────────────
      case "CREATE_PATIENT": {
        const {
          firstName,
          lastName,
          age,
          dob,          // may be null for emergency
          gender,
          phone,        // may be null for emergency
          address,      // may be null for emergency
          chiefComplaint,
          isEmergency,
        } = payload;

        // Validate required fields
        if (!firstName || !lastName || !age || !gender || !chiefComplaint) {
          return NextResponse.json(
            { error: "Missing required fields: firstName, lastName, age, gender, chiefComplaint" },
            { status: 400 }
          );
        }

        const patientNumber = await generatePatientNumber();

        // Create the patient record
        const patient = await prisma.patient.create({
          data: {
            patientNumber,
            firstName,
            lastName,
            age: parseInt(age, 10),
            dateOfBirth: dob ? new Date(dob) : null,
            gender,                          // "MALE" | "FEMALE" | "OTHER"
            phoneNumber: phone ?? null,
            address: address ?? null,
            isEmergency: isEmergency ?? false,
            currentStatus: "AWAITING_TRIAGE",
          },
        });

        // Create an initial Visit to store the chiefComplaint (symptoms)
        await prisma.visit.create({
          data: {
            patientId: patient.id,
            symptoms: chiefComplaint,
          },
        });

        return NextResponse.json(patient, { status: 201 });
      }

      // ── Route a patient to another department ───────────────────────────────
      case "ADVANCE_PATIENT_STATUS": {
        const { patientId, nextStatus } = payload;

        if (!patientId || !nextStatus) {
          return NextResponse.json(
            { error: "patientId and nextStatus are required" },
            { status: 400 }
          );
        }

        const updated = await prisma.patient.update({
          where: { id: patientId },
          data: { currentStatus: nextStatus },
        });

        return NextResponse.json(updated);
      }

      // ── Cashier: process payment and create a billing record ────────────────
      // NOTE: The Billing model stores a single amount + description.
      // We serialise the line items into the description field as JSON
      // so no schema migration is needed.
      case "CREATE_BILL": {
        const {
          patientId,
          visitId,        // optional — pass if you have the visit id
          paymentMethod,
          amountTendered,
          lines,          // BillLine[]
          reference,
          insuranceProvider,
          insurancePolicyNumber,
        } = payload;

        if (!patientId || !lines || lines.length === 0) {
          return NextResponse.json(
            { error: "patientId and at least one billing line are required" },
            { status: 400 }
          );
        }

        const total: number = lines.reduce(
          (sum: number, l: { subtotal: number }) => sum + l.subtotal,
          0
        );

        // Build a rich description string from the line items + payment meta
        const descriptionObj = {
          paymentMethod,
          amountTendered,
          reference: reference ?? null,
          insuranceProvider: insuranceProvider ?? null,
          insurancePolicyNumber: insurancePolicyNumber ?? null,
          lines,
        };

        const billing = await prisma.billing.create({
          data: {
            patientId,
            visitId: visitId ?? null,
            amount: total,
            description: JSON.stringify(descriptionObj),
            status: "PAID",
          },
        });

        // Move patient to DISCHARGED after successful payment
        await prisma.patient.update({
          where: { id: patientId },
          data: { currentStatus: "DISCHARGED" },
        });

        // Generate a simple invoice number for the receipt
        const invoiceNumber = `INV-${billing.id.toString().padStart(6, "0")}`;

        return NextResponse.json({ ...billing, invoiceNumber });
      }

      // ── Create a visit (used by doctors/nurses on other pages) ──────────────
      case "CREATE_VISIT": {
        const visit = await prisma.visit.create({ data: payload });
        return NextResponse.json(visit);
      }

      // ── Lab ─────────────────────────────────────────────────────────────────
      case "CREATE_LAB_REQUEST": {
        const lab = await prisma.labRequest.create({ data: payload });
        return NextResponse.json(lab);
      }

      case "UPDATE_LAB_RESULT": {
        const { id, results, status } = payload;
        const updated = await prisma.labRequest.update({
          where: { id },
          data: { results, status },
        });
        return NextResponse.json(updated);
      }

      // ── Prescriptions ────────────────────────────────────────────────────────
      case "CREATE_PRESCRIPTION": {
        const rx = await prisma.prescription.create({ data: payload });
        return NextResponse.json(rx);
      }

      case "DISPENSE_PRESCRIPTION": {
        const { id } = payload;
        const updated = await prisma.prescription.update({
          where: { id },
          data: { status: "DISPENSED" },
        });
        return NextResponse.json(updated);
      }

      // ── Billing helpers (used by other pages) ────────────────────────────────
      case "PAY_BILL": {
        const { id, status } = payload;
        const updated = await prisma.billing.update({
          where: { id },
          data: { status },
        });
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[API ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — kept for any direct status updates called with method PATCH ──────
// (The frontend's handleDispatchPipeline used PATCH before — redirected to POST
//  above, but keeping this so old calls don't 405.)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: { currentStatus: status },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}