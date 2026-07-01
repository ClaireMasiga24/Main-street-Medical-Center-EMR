import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { createNotification, getDepartmentEmails } from "../../lib/notifications";

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

    // Update lastSharedFromDept on patient
    await prisma.patient.update({
      where: { id: pid },
      data: { lastSharedFromDept: source || "Nurse/Midwife" },
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
