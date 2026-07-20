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

// ─── GET — fetch patients for Tracking Desk OR billing records OR results ──

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const patientId = searchParams.get("patientId");
    const statusFilter = searchParams.get("status");
    const action = searchParams.get("action");

    // ── Patient clinical results (for Cashier ResultsModal) ──────────────
    if (action === "patient_results" && patientId) {
      const pid = parseInt(patientId, 10);

      // -- Vitals (latest triage + nurse action flags) --
      const triage = await prisma.triage.findFirst({
        where: { patientId: pid },
        orderBy: { createdAt: "desc" },
        select: {
          temperature: true, bpSystolic: true, bpDiastolic: true,
          heartRate: true, respiratoryRate: true, spo2: true,
          weight: true, height: true, painLevel: true, painLocation: true,
          allergies: true, triageOutcome: true, createdAt: true,
        },
      });

      // -- Lab tests (completed or with results) --
      const labResults = await prisma.labRequest.findMany({
        where: { patientId: pid, results: { not: null } },
        orderBy: { resultEnteredAt: "desc" },
        select: {
          id: true, testName: true, testPanel: true, results: true,
          isCritical: true, criticalNote: true, enteredByName: true,
          resultEnteredAt: true, validatedByName: true, validatedAt: true,
          analyzerResults: true, analyzerType: true, analyzerModel: true,
          specimenType: true, specimenId: true, attachments: true,
          clinicalNotes: true, status: true, createdAt: true,
        },
      });

      // -- Imaging (radiology & sonography with findings) --
      const imagingResults = await prisma.imagingRequest.findMany({
        where: { patientId: pid, findings: { not: null } },
        orderBy: { reportedAt: "desc" },
        select: {
          id: true, studyType: true, findings: true, impression: true,
          conclusion: true, clinicalNotes: true, clinicalHistory: true,
          radiologistNotes: true, reportedAt: true, reportedById: true,
          isCritical: true, criticalNote: true, createdAt: true,
        },
      });

      // -- Diagnosis (latest visit) --
      const latestVisit = await prisma.visit.findFirst({
        where: { patientId: pid },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, symptoms: true, diagnosis: true, assessment: true,
          differentialDiagnosis: true, treatmentPlan: true, notes: true,
          doctorName: true, createdAt: true,
        },
      });

      // -- Doctor review (PatientReview) --
      const latestReview = await prisma.patientReview.findFirst({
        where: { patientId: pid },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, diagnosis: true, treatmentPlan: true,
          examinationFindings: true, followUpNotes: true,
          doctorName: true, createdAt: true,
        },
      });

      // -- Prescriptions --
      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: pid },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, medication: true, dosage: true, instructions: true,
          status: true, createdAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        patientId: pid,
        vitals: triage ?? null,
        labTests: labResults,
        imaging: imagingResults,
        diagnosis: latestVisit ?? null,
        doctorReview: latestReview ?? null,
        prescriptions,
      });
    }

    // ── Universal patient search (includes discharged) ───────────────────────
    if (searchParams.get("scope") === "all") {
      const search = searchParams.get("search")?.trim() || "";
      if (!search) return NextResponse.json([]);

      const where: any = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { patientNumber: { contains: search } },
        ],
      };

      const patients = await prisma.patient.findMany({
        where,
        include: {
          Visit: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      const shaped = patients.map((p) => ({
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        ageUnit: p.ageUnit,
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
    }

    // ── Billed patient history (for Receipts tab) ───────────────────────────
    if (searchParams.get("billed") === "true") {
      const search = searchParams.get("search")?.trim() || "";

      const where: any = {
        currentStatus: "DISCHARGED",
        Billing: { some: { status: "PAID" } },
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { patientNumber: { contains: search } },
        ];
      }

      const patients = await prisma.patient.findMany({
        where,
        include: {
          Billing: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      const result = patients.map((p) => {
        let lines: any[] = [];
        let paymentMethod = "CASH";
        let paymentRef = "";
        let insuranceProv = "";
        let insurancePolicy = "";
        try {
          const desc = JSON.parse(p.Billing[0].description || "{}");
          lines = desc.lines || [];
          const payments = desc.payments || [];
          if (payments.length > 0) {
            paymentMethod = payments[0].paymentMethod || "CASH";
            paymentRef = payments[0].reference || "";
            insuranceProv = payments[0].insuranceProvider || "";
            insurancePolicy = payments[0].insurancePolicyNumber || "";
          } else if (desc.paymentMethod) {
            // Old format — flat fields before payments[] migration
            paymentMethod = desc.paymentMethod || "CASH";
            paymentRef = desc.reference || "";
            insuranceProv = desc.insuranceProvider || "";
            insurancePolicy = desc.insurancePolicyNumber || "";
          }
        } catch {}
        return {
          id: p.id,
          patientNumber: p.patientNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          age: p.age,
          ageUnit: p.ageUnit,
          gender: p.gender,
          billing: {
            id: p.Billing[0].id,
            invoiceNumber: p.Billing[0].invoiceNumber,
            amount: p.Billing[0].amount,
            amountPaid: p.Billing[0].amountPaid,
            balanceDue: p.Billing[0].balanceDue,
            createdAt: p.Billing[0].createdAt,
            lines,
            paymentMethod,
            paymentRef,
            insuranceProvider: insuranceProv,
            insurancePolicyNumber: insurancePolicy,
          },
        };
      });

      return NextResponse.json(result);
    }

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
          notIn: ["DISCHARGED", "LAB_REJECTED"],
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
      ageUnit: p.ageUnit,
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
          ageUnit,
          gender,
          phone,        // may be null for emergency
          address,      // may be null for emergency
          chiefComplaint,
          isEmergency,
        } = payload;

	        // Validate required fields (chiefComplaint is optional for normal registration)
	        if (!firstName || !lastName || !age || !gender) {
	          return NextResponse.json(
	            { error: "Missing required fields: firstName, lastName, age, gender" },
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
            ageUnit: ageUnit || "years",
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

        // Use a transaction to atomically update status AND create any follow-on
        // records (imaging request / lab request). This prevents the patient's
        // currentStatus from being set without the corresponding department row
        // being created — which would make them invisible in that department's view.
        const result = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.patient.update({
            where: { id: patientId },
            data: { currentStatus: nextStatus },
          });

          // If routing to radiology/sonography, create an imaging request automatically
          if (nextStatus === "AWAITING_RADIOLOGY" || nextStatus === "AWAITING_SONOGRAPHY") {
            const studyType = nextStatus === "AWAITING_SONOGRAPHY" ? "ULTRASOUND" : "X_RAY";
            const patientRecord = await tx.patient.findUnique({
              where: { id: patientId },
              include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
            });

            await tx.imagingRequest.create({
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

            const patientRecord = await tx.patient.findUnique({
              where: { id: patientId },
              include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
            });

            if (!patientRecord) {
              console.error("[RECEPTIONIST_ROUTE] Patient not found for id:", patientId);
            } else {
              // Resolve a staff ID — check payload first, fallback to earliest staff record
              let staffId = payload.requestedById;
              if (!staffId) {
                const fallbackStaff = await tx.staff.findFirst({ orderBy: { id: "asc" } });
                staffId = fallbackStaff?.id;
                console.log("[RECEPTIONIST_ROUTE] No staffId in payload, fallback found:", staffId);
              }

              if (!staffId) {
                console.error("[RECEPTIONIST_ROUTE] No staff record exists at all — cannot create LabRequest");
              } else {
                // Guard: if the CREATE_LAB_ORDER action was already called for this
                // patient (specific test rows exist with referralSource "RECEPTION"),
                // skip creating the generic "Pending Lab Workup" to avoid duplicates.
                const existingOrders = await tx.labRequest.findMany({
                  where: {
                    patientId,
                    status: "PENDING",
                  },
                  take: 1,
                });

                if (existingOrders.length > 0) {
                  console.log("[RECEPTIONIST_ROUTE] PENDING LabRequest already exists for patient", patientId, "- skipping generic LabRequest");
                } else {
                  const labRequest = await tx.labRequest.create({
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
          }

          // Log to patient timeline
          const statusToDept: Record<string, string> = {
            AWAITING_TRIAGE: "Triage",
            AWAITING_DOCTOR: "Doctor",
            AWAITING_DENTIST: "Dentist",
            AWAITING_SONOGRAPHY: "Sonography",
            AWAITING_RADIOLOGY: "Radiology",
            AWAITING_LAB: "Laboratory",
            AWAITING_PHARMACY: "Pharmacy",
            AWAITING_CASHIER: "Cashier",
            IN_CONSULTATION: "Consultation",
            ADMITTED: "Admission",
          };
          await tx.patientTimeline.create({
            data: {
              patientId,
              action: "ROUTED",
              fromDepartment: "Reception",
              toDepartment: statusToDept[nextStatus] || nextStatus,
              description: `Routed from Reception to ${statusToDept[nextStatus] || (nextStatus === "MIDWIFE_ANC" ? "Midwife (ANC)" : nextStatus)}`,
            },
          });

          return updated;
        });

        return NextResponse.json(result);
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

        // Auto-discharge patient when fully paid
        if (!isPartial) {
          await prisma.patient.update({
            where: { id: patientId },
            data: { currentStatus: "DISCHARGED" },
          });
        }

        return NextResponse.json({ ...billing, invoiceNumber, isPartial });
      }

      // ── Create a visit (used by doctors/nurses on other pages) ──────────────
      case "CREATE_VISIT": {
        const visit = await prisma.visit.create({ data: payload });
        return NextResponse.json(visit);
      }

      // ── Create a specific lab order from the receptionist test picker ─────
      case "CREATE_LAB_ORDER": {
        const { patientId, tests, requestedById } = payload;

        if (!patientId || !tests || tests.length === 0) {
          return NextResponse.json(
            { error: "patientId and tests[] are required" },
            { status: 400 }
          );
        }

        // Resolve staff ID — check payload first, fallback to earliest staff record
        let staffId = requestedById;
        if (!staffId) {
          const fallbackStaff = await prisma.staff.findFirst({ orderBy: { id: "asc" } });
          staffId = fallbackStaff?.id;
        }
        if (!staffId) {
          return NextResponse.json(
            { error: "No staff record found — cannot create lab request. Add staff members first." },
            { status: 500 }
          );
        }

        // Get the patient's latest visit (created at registration)
        const patientRecord = await prisma.patient.findUnique({
          where: { id: patientId },
          include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
        });

        // Create one LabRequest row per selected test
        const created = [];
        for (const test of tests) {
          const lab = await prisma.labRequest.create({
            data: {
              patientId,
              visitId: patientRecord?.Visit[0]?.id ?? null,
              requestedById: staffId,
              testCode: test.code,
              testName: test.name,
              orderedBy: "RECEPTION",
              status: "PENDING",
              referralSource: "RECEPTION",
              priority: patientRecord?.isEmergency ? "STAT" : "ROUTINE",
              clinicalNotes: patientRecord?.Visit[0]?.symptoms ?? null,
            },
          });
          created.push(lab);
        }

        return NextResponse.json(created, { status: 201 });
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

        // Auto-discharge patient when fully paid after follow-up payment
        if (isNowPaid) {
          await prisma.patient.update({
            where: { id: existing.patientId },
            data: { currentStatus: "DISCHARGED" },
          });
        }

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

    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.patient.update({
        where: { id },
        data: { currentStatus: status },
      });

      // If routing to lab via legacy PATCH, also create a LabRequest so the
      // patient appears in the laboratory view (preventing orphan AWAITING_LAB).
      if (status === "AWAITING_LAB") {
        const patientRecord = await tx.patient.findUnique({
          where: { id },
          include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
        });

        if (patientRecord) {
          // Check if any RECEPTION PENDING LabRequest already exists (guard)
          const existingOrders = await tx.labRequest.findMany({
            where: {
              patientId: id,
              status: "PENDING",
            },
            take: 1,
          });

          if (existingOrders.length === 0) {
            const fallbackStaff = await tx.staff.findFirst({ orderBy: { id: "asc" } });
            if (fallbackStaff?.id) {
              await tx.labRequest.create({
                data: {
                  patientId: id,
                  visitId: patientRecord?.Visit[0]?.id ?? null,
                  requestedById: fallbackStaff.id,
                  testName: "Pending Lab Workup",
                  priority: patientRecord?.isEmergency ? "STAT" : "ROUTINE",
                  referralSource: "RECEPTION",
                  clinicalNotes: patientRecord?.Visit[0]?.symptoms ?? null,
                  status: "PENDING",
                },
              });
            }
          }
        }
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}