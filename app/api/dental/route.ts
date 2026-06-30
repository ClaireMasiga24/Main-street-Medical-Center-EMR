import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { createNotification } from "../../lib/notifications";
import { PatientStatus } from "@prisma/client";

// ─── Routing ────────────────────────────────────────────────────────────
const ROUTE_TO_STATUS: Record<string, PatientStatus> = {
  LAB:        "AWAITING_LAB",
  SONOGRAPHY: "AWAITING_SONOGRAPHY",
  RADIOLOGY:  "AWAITING_RADIOLOGY",
  DOCTOR:     "AWAITING_DOCTOR",
  NURSE:      "AWAITING_TRIAGE",
  PHARMACY:   "AWAITING_PHARMACY",
  CASHIER:    "AWAITING_CASHIER",
  DISCHARGE:  "DISCHARGED",
  SPECIALIST: "AWAITING_DOCTOR",  // reassigns to doctor for specialist routing
};

const ROUTE_LABELS: Record<string, string> = {
  LAB:        "Laboratory",
  SONOGRAPHY: "Sonography",
  RADIOLOGY:  "Radiology",
  DOCTOR:     "Doctor's Office",
  NURSE:      "Nurse/Midwife",
  PHARMACY:   "Pharmacy",
  CASHIER:    "Cashier",
  DISCHARGE:  "Discharge",
  SPECIALIST: "Specialist",
};

// ─── Generate report number ─────────────────────────────────────────────
async function generateReportNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.dentalRecord.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  });
  return `DEN-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─── GET — fetch patients ───────────────────────────────────────────────
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { currentStatus: { in: ["AWAITING_DENTIST", "IN_CONSULTATION"] } },
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        DentalRecord: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            OdontogramFinding: true,
            DentalProcedure: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            Staff: { select: { fullName: true } },
          },
        },
      },
    });
    return NextResponse.json(patients);
  } catch (err) {
    console.error("[dental GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}

// ─── POST — save full dental consultation ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, staffId, routeTo, ...data } = body;

    if (!patientId || !routeTo || !(routeTo in ROUTE_TO_STATUS)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const newStatus = ROUTE_TO_STATUS[routeTo];
    const reportNumber = await generateReportNumber();

    const result = await prisma.$transaction(async (tx: any) => {
      // Find or create visit
      const existingVisit = await tx.visit.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      });

      const visit = existingVisit ?? await tx.visit.create({
        data: { patientId, symptoms: data.chiefComplaint || null },
      });

      // Create the dental record with all clinical fields
      const dentalRecord = await tx.dentalRecord.create({
        data: {
          patientId,
          visitId: visit.id,
          staffId: staffId || null,
          reportNumber,

          // Chief Complaint & History
          chiefComplaint: data.chiefComplaint || null,
          historyOfPresentIllness: data.historyOfPresentIllness || null,
          pastDentalHistory: data.pastDentalHistory || null,
          medicalHistory: data.medicalHistory || null,
          allergies: data.allergies || null,

          // Vital Signs
          temperature: data.temperature || null,
          bpSystolic: data.bpSystolic || null,
          bpDiastolic: data.bpDiastolic || null,
          heartRate: data.heartRate || null,
          respiratoryRate: data.respiratoryRate || null,
          spo2: data.spo2 || null,
          weight: data.weight || null,

          // Clinical Examination
          clinicalExamination: data.clinicalExamination || null,
          extraoralExam: data.extraoralExam || null,
          intraoralExam: data.intraoralExam || null,
          periodontalFindings: data.periodontalFindings || null,
          oralHygieneAssessment: data.oralHygieneAssessment || null,

          // Diagnosis & Treatment
          diagnosis: data.diagnosis || null,
          icdCodes: data.icdCodes || null,
          treatmentPlan: data.treatmentPlan || null,
          prescribedMedications: data.prescribedMedications || null,

          // Follow-Up
          followUpInstructions: data.followUpInstructions || null,
          reviewAppointment: data.reviewAppointment ? new Date(data.reviewAppointment) : null,
          reviewNotes: data.reviewNotes || null,

          notes: data.notes || null,
        },
      });

      // Save odontogram findings if provided
      if (data.odontogramFindings && Array.isArray(data.odontogramFindings)) {
        for (const finding of data.odontogramFindings) {
          await tx.odontogramFinding.create({
            data: {
              dentalRecordId: dentalRecord.id,
              patientId,
              ...finding,
            },
          });
        }
      }

      // Save procedures if provided
      if (data.procedures && Array.isArray(data.procedures)) {
        for (const proc of data.procedures) {
          await tx.dentalProcedure.create({
            data: {
              dentalRecordId: dentalRecord.id,
              patientId,
              visitId: visit.id,
              performedByName: proc.performedByName || null,
              ...proc,
            },
          });
        }
      }

      // Update patient status
      await tx.patient.update({
        where: { id: patientId },
        data: {
          currentStatus: newStatus,
          lastSharedFromDept: routeTo === "DOCTOR" || routeTo === "SPECIALIST" ? "Dentist" : undefined,
          updatedAt: new Date(),
        },
      });

      // Create timeline entry
      await tx.patientTimeline.create({
        data: {
          patientId,
          action: routeTo === "DISCHARGE" ? "DISCHARGE" : "TRANSFER",
          fromDepartment: "Dentist",
          toDepartment: ROUTE_LABELS[routeTo] || routeTo,
          description: `Dental consultation completed. Routed to ${ROUTE_LABELS[routeTo] || routeTo}.`,
          metadata: JSON.stringify({ dentalRecordId: dentalRecord.id, reportNumber }),
          performedById: staffId || undefined,
          performedBy: data.dentistName || "Dentist",
        },
      });

      // Notify the target department
      if (routeTo !== "DISCHARGE") {
        const deptMap: Record<string, string> = {
          LAB: "Laboratory",
          SONOGRAPHY: "Sonography",
          RADIOLOGY: "Radiology",
          DOCTOR: "Doctor",
          NURSE: "Nurse/Midwife",
          PHARMACY: "Pharmacy",
          CASHIER: "Cashier",
          SPECIALIST: "Doctor",
        };
        const targetDept = deptMap[routeTo] || routeTo;
        const patient = await tx.patient.findUnique({ where: { id: patientId } });
        await createNotification({
          department: targetDept,
          title: `Patient routed from Dental`,
          message: `${patient?.firstName} ${patient?.lastName} (${patient?.patientNumber}) sent from Dental Department. ${data.diagnosis ? `Dx: ${data.diagnosis}` : ""}`,
          type: "GENERAL",
          referenceId: dentalRecord.id,
          referenceType: "dental_record",
          patientId: patient?.id || patientId,
        });
      }

      return dentalRecord;
    });

    return NextResponse.json({ success: true, reportNumber: result.reportNumber });
  } catch (err) {
    console.error("[dental POST]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

// ─── PATCH — start consultation ────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { patientId, dentistName } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        currentStatus: "IN_CONSULTATION",
        updatedAt: new Date(),
      },
    });

    // Add timeline entry
    await prisma.patientTimeline.create({
      data: {
        patientId,
        action: "CONSULTATION_START",
        fromDepartment: "Dentist",
        description: "Dental consultation started.",
        performedBy: dentistName || "Dentist",
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[dental PATCH]", err);
    return NextResponse.json({ error: "Failed to start consultation." }, { status: 500 });
  }
}

// ─── DELETE — delete duplicate / route .ts file ────────────────────────
// (not used, placeholder for future)
