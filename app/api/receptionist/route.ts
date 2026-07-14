import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a patient number like MSMC-2026-XXXX (random 5-digit suffix to avoid race conditions) */
async function generatePatientNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  const suffix = Date.now().toString().slice(-3);
  return `MSMC-${year}-${random}${suffix}`;
}

// ─── GET — fetch patients for Tracking Desk OR billing records ────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const patientId = searchParams.get("patientId");
    const statusFilter = searchParams.get("status");

    // ── Billing queries ──────────────────────────────────────────────────
    if (patientId || statusFilter) {
      const where: any = {};
      if (patientId) where.patientId = parseInt(patientId, 10);
      if (statusFilter) where.status = statusFilter;

      const bills = await prisma.billing.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              age: true,
              gender: true,
              currentStatus: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // If status=PARTIAL was requested without a specific patientId,
      // return patient data shaped to match the frontend's Patient lookup
      if (statusFilter === "PARTIAL" && !patientId) {
        const shaped = bills.map((b) => ({
          id: b.Patient.id,
          patientNumber: b.Patient.patientNumber,
          firstName: b.Patient.firstName,
          lastName: b.Patient.lastName,
          age: b.Patient.age,
          gender: b.Patient.gender,
          status: b.Patient.currentStatus,
          balanceDue: b.balanceDue,
          invoiceNumber: b.invoiceNumber,
          billingId: b.id,
        }));
        return NextResponse.json(shaped);
      }

      return NextResponse.json(bills);
    }

    // ── Default: fetch all active patients for the Tracking Desk ─────────
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
      chiefComplaint: p.Visit[0]?.symptoms ?? "Not recorded",
      isEmergency: p.isEmergency,
      status: p.currentStatus,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json(shaped);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch data" },
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
            gender,                          // "MALE" | "FEMALE" | "OTHER"
            phoneNumber: phone ?? null,
            address: address ?? null,
            isEmergency: isEmergency ?? false,
            currentStatus: "REGISTERED",
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

        // If routing to radiology/sonography, create an imaging request automatically
        if (nextStatus === "AWAITING_RADIOLOGY" || nextStatus === "AWAITING_SONOGRAPHY") {
          const studyType = nextStatus === "AWAITING_SONOGRAPHY" ? "ULTRASOUND" : "X_RAY";
          const patientRecord = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
          });

          await prisma.imagingRequest.create({
            data: {
              patientId,
              visitId: patientRecord?.Visit[0]?.id ?? null,
              studyType,
              priority: patientRecord?.isEmergency ? "STAT" : "ROUTINE",
              referralSource: "RECEPTION",
              clinicalNotes: patientRecord?.Visit[0]?.symptoms ?? null,
              status: "ORDERED",
            },
          });
        }

        // If routing to lab, create a lab request automatically so the lab tech can see it
        if (nextStatus === "AWAITING_LAB") {
          console.log("[RECEPTIONIST_ROUTE] Routing patient to LAB, patientId:", patientId);

          const patientRecord = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
          });

          if (!patientRecord) {
            console.error("[RECEPTIONIST_ROUTE] Patient not found for id:", patientId);
          } else {
            // Resolve a staff ID — check payload first, fallback to earliest staff record
            let staffId = payload.requestedById;
            if (!staffId) {
              const fallbackStaff = await prisma.staff.findFirst({ orderBy: { id: "asc" } });
              staffId = fallbackStaff?.id;
              console.log("[RECEPTIONIST_ROUTE] No staffId in payload, fallback found:", staffId);
            }

            if (!staffId) {
              console.error("[RECEPTIONIST_ROUTE] No staff record exists at all — cannot create LabRequest");
            } else {
              const labRequest = await prisma.labRequest.create({
                data: {
                  patientId,
                  visitId: patientRecord?.Visit[0]?.id ?? null,
                  requestedById: staffId,
                  testName: "Pending Lab Workup",
                  priority: patientRecord?.isEmergency ? "STAT" : "ROUTINE",
                  referralSource: "RECEPTION",
                  clinicalNotes: patientRecord?.Visit[0]?.symptoms ?? null,
                  status: "PENDING",
                },
              });
              console.log("[RECEPTIONIST_ROUTE] LabRequest created successfully, id:", labRequest.id);
            }
          }
        }

        return NextResponse.json(updated);
      }

      // ── Cashier: process payment and create a billing record ────────────────
      case "CREATE_BILL": {
        const {
          patientId,
          visitId,        // optional — pass if you have the visit id
          paymentMethod,
          amountTendered,
          amountPaid,     // NEW: the actual amount received (may be less than total)
          balanceDue,     // NEW: computed as max(0, total - amountPaid)
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

        const paid = amountPaid ?? total;
        const due = balanceDue ?? Math.max(0, total - paid);
        const isPartial = due > 0;

        // Build a rich description string from the line items + payment meta
        const descriptionObj = {
          lines,
          payments: [
            {
              paymentMethod,
              amountPaid: paid,
              reference: reference ?? null,
              insuranceProvider: insuranceProvider ?? null,
              insurancePolicyNumber: insurancePolicyNumber ?? null,
              date: new Date().toISOString(),
            },
          ],
        };

        const billing = await prisma.billing.create({
          data: {
            patientId,
            visitId: visitId ?? null,
            amount: total,
            amountPaid: paid,
            balanceDue: due,
            description: JSON.stringify(descriptionObj),
            status: isPartial ? "PARTIAL" : "PAID",
          },
        });

        // Generate invoice number from the new billing id
        const invoiceNumber = `INV-${billing.id.toString().padStart(6, "0")}`;
        await prisma.billing.update({
          where: { id: billing.id },
          data: { invoiceNumber },
        });

        // Note: billing does NOT change Patient.status — discharge is a separate explicit action.
        return NextResponse.json({ ...billing, invoiceNumber, isPartial });
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

      // ── Explicitly discharge a patient (separate from billing) ──────────────
      case "DISCHARGE_PATIENT": {
        const { patientId } = payload;

        if (!patientId) {
          return NextResponse.json(
            { error: "patientId is required" },
            { status: 400 }
          );
        }

        const updated = await prisma.patient.update({
          where: { id: patientId },
          data: { currentStatus: "DISCHARGED" },
        });

        return NextResponse.json(updated);
      }

      // ── Billing helpers (used by other pages) ────────────────────────────────
      case "PAY_BILL": {
        const { id, status } = payload;
        const updateData: any = { status };
        // When marking as paid, also zero out the balance
        if (status === "PAID") {
          const bill = await prisma.billing.findUnique({ where: { id } });
          if (bill) {
            updateData.amountPaid = bill.amount;
            updateData.balanceDue = 0;
          }
        }
        const updated = await prisma.billing.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json(updated);
      }

      // ── Follow-up payment on an existing partial bill ───────────────────────
      case "ADD_PAYMENT": {
        const {
          billingId,
          additionalAmountPaid,
          paymentMethod,
          reference,
          insuranceProvider,
          insurancePolicyNumber,
        } = payload;

        if (!billingId || !additionalAmountPaid || additionalAmountPaid <= 0) {
          return NextResponse.json(
            { error: "billingId and a positive additionalAmountPaid are required" },
            { status: 400 }
          );
        }

        const existing = await prisma.billing.findUnique({
          where: { id: billingId },
          include: { Patient: true },
        });

        if (!existing) {
          return NextResponse.json(
            { error: "Billing record not found" },
            { status: 404 }
          );
        }

        const newAmountPaid = existing.amountPaid + additionalAmountPaid;
        const newBalanceDue = Math.max(0, existing.amount - newAmountPaid);
        const isNowPaid = newBalanceDue <= 0;

        // Merge payment metadata into description JSON
        let desc: any = {};
        try { desc = JSON.parse(existing.description || "{}"); } catch {}
        if (!desc.payments) {
          // Old format — migrate the original payment into a payments array
          const originalPayment = {
            paymentMethod: desc.paymentMethod || "CASH",
            amountPaid: existing.amountPaid,
            reference: desc.reference ?? null,
            insuranceProvider: desc.insuranceProvider ?? null,
            insurancePolicyNumber: desc.insurancePolicyNumber ?? null,
            date: existing.createdAt.toISOString(),
          };
          desc.payments = [originalPayment];
        }
        desc.payments.push({
          paymentMethod: paymentMethod ?? "CASH",
          amountPaid: additionalAmountPaid,
          reference: reference ?? null,
          insuranceProvider: insuranceProvider ?? null,
          insurancePolicyNumber: insurancePolicyNumber ?? null,
          date: new Date().toISOString(),
        });

        const updated = await prisma.billing.update({
          where: { id: billingId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: isNowPaid ? "PAID" : "PARTIAL",
            description: JSON.stringify(desc),
          },
        });

        // Note: ADD_PAYMENT does NOT change Patient.status — discharge is a separate explicit action.
        return NextResponse.json({
          ...updated,
          invoiceNumber: existing.invoiceNumber,
          isPartial: !isNowPaid,
        });
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