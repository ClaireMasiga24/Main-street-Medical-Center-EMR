import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { createNotification, getDepartmentEmails } from "../../lib/notifications";
import { returnEncounterToDoctor, routeEncounterToDept, createEncounter } from "../../lib/encounterUtils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, patientName, patientNumber, targetDept, notes, nurseName, source } = body;

    if (!patientId || !targetDept) {
      return NextResponse.json({ error: "patientId and targetDept are required" }, { status: 400 });
    }

    const pid = parseInt(patientId);
    const deptMap: Record<string, string> = {
      doctor: "Doctor",
      lab: "Laboratory",
      radiology: "Radiology / Sonography",
      pharmacy: "Pharmacy",
      cashier: "Cashier",
      reception: "Reception",
      dental: "Dentist",
      triage: "Nurse/Midwife",
      nurse: "Nurse/Midwife",
    };

    const targetDepartment = deptMap[targetDept.toLowerCase()] || targetDept;

    // Create notification for the target department
    await createNotification({
      department: targetDepartment,
      patientId: pid,
      title: `Patient shared from ${source || "Nurse/Midwife"}`,
      message: `${nurseName || "A nurse"} shared patient ${patientName || ""} (${patientNumber || ""})${notes ? ": " + notes : ""}`,
      type: "PATIENT_SHARED",
      referenceId: pid,
      referenceType: "patient",
    });

    // Create PatientTimeline entry
    await prisma.patientTimeline.create({
      data: {
        patientId: pid,
        action: "PATIENT_SHARED",
        fromDepartment: source || "Nurse/Midwife",
        toDepartment: targetDepartment,
        description: notes || `Patient shared with ${targetDepartment}`,
        performedBy: nurseName || "Nurse",
      },
    });

    // Map each share target to the correct patient status
    const NURSE_DEPT_TO_STATUS: Record<string, string> = {
      doctor: "AWAITING_DOCTOR",
      lab: "AWAITING_LAB",
      radiology: "AWAITING_RADIOLOGY",
      pharmacy: "AWAITING_PHARMACY",
      cashier: "AWAITING_CASHIER",
      reception: "AWAITING_CASHIER",
      dental: "AWAITING_DENTIST",
      nurse: "AWAITING_TRIAGE",
      triage: "AWAITING_TRIAGE",
    };

    // Build update payload
    const updateData: any = { lastSharedFromDept: source || "Nurse/Midwife" };

    // Update patient status based on where they're being sent
    const mappedStatus = NURSE_DEPT_TO_STATUS[targetDept.toLowerCase()];
    if (mappedStatus) {
      updateData.currentStatus = mappedStatus as any;
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.patient.update({
        where: { id: pid },
        data: updateData,
      });

      // Update encounter routing if an active encounter exists
      const activeEncounter = await tx.encounter.findFirst({
        where: { patientId: pid, status: "ACTIVE" },
        select: { id: true },
      });
      if (activeEncounter) {
        if (targetDept.toLowerCase() === "doctor") {
          await returnEncounterToDoctor(activeEncounter.id, source || "Nurse/Midwife", tx);
        } else if (mappedStatus) {
          // Map nurse dept to encounter dept
          const DEPT_MAP: Record<string, string> = {
            AWAITING_LAB: "LAB",
            AWAITING_RADIOLOGY: "RADIOLOGY",
            AWAITING_SONOGRAPHY: "SONOGRAPHY",
            AWAITING_DENTIST: "DENTIST",
            AWAITING_PHARMACY: "PHARMACY",
            AWAITING_CASHIER: "CASHIER",
            AWAITING_TRIAGE: "NURSE",
          };
          const encounterDept = DEPT_MAP[mappedStatus] || targetDept.toUpperCase();
          await routeEncounterToDept(activeEncounter.id, encounterDept, mappedStatus, tx);
        }
      }

      // If routing to lab, also create a LabRequest so the lab can see this patient
      // (otherwise they'd show as "Awaiting Lab" on tracking desk but never appear
      // in the laboratory view).
      if (mappedStatus === "AWAITING_LAB") {
        // Check if any PENDING LabRequest already exists for this patient
        // (prevents "Pending Lab Workup" duplicates across departments).
        const existingOrders = await tx.labRequest.findMany({
          where: {
            patientId: pid,
            status: "PENDING",
          },
          take: 1,
        });
        if (existingOrders.length === 0) {
          const fallbackStaff = await tx.staff.findFirst({ orderBy: { id: "asc" } });
          if (fallbackStaff?.id) {
            await tx.labRequest.create({
              data: {
                patientId: pid,
                requestedById: fallbackStaff.id,
                testName: "Pending Lab Workup",
                priority: "ROUTINE",
                referralSource: "NURSE",
                status: "PENDING",
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: `Patient shared with ${targetDepartment}` });
  } catch (err: any) {
    console.error("[Nurse Share]", err);
    // Don't leak raw Prisma errors to the user
    const msg = err.message?.includes("prisma") || err.message?.includes("Prisma")
      ? "An error occurred while sharing the patient. Please try again."
      : err.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
