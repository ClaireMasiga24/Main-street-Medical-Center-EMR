import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(req: NextRequest) {
  const patientId = parseInt(req.nextUrl.searchParams.get("patientId") || "");
  if (!patientId) {
    return NextResponse.json({ error: "patientId query parameter is required" }, { status: 400 });
  }

  try {
    const [
      triage, visits, imaging, labHistory, prescriptions, timeline,
      billingRecords, patientReviews, nurseActions, medicalProcedures,
      ancAssessments, appointments, patient,
    ] = await Promise.all([
      // Latest triage / nurse midwife assessment
      prisma.triage.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),

      // Doctor consultations — latest 10
      prisma.visit.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          Triage: { select: { chiefComplaint: true, esiLevel: true } },
        },
      }),

      // Imaging / radiology / sonography reports — latest 10
      prisma.imagingRequest.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { Staff: { select: { fullName: true, department: true } } },
      }),

      // Past lab results — latest 20
      prisma.labRequest.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { Staff: { select: { fullName: true } } },
      }),

      // Prescriptions — latest 10
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Department-movement timeline — latest 50
      prisma.patientTimeline.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // Billing / payment records — latest 10
      prisma.billing.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Doctor reviews / follow-ups — latest 10
      prisma.patientReview.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Nurse actions (treatments administered) — latest 20
      prisma.nurseAction.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      // Medical procedures — latest 10
      prisma.medicalProcedure.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // ANC assessments (antenatal care) — latest 10
      prisma.aNCAssessment.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Appointments — latest 10
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { appointmentDate: "desc" },
        take: 10,
      }),

      // Patient basic info (registration date, status)
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          currentStatus: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        triage, visits, imaging, labHistory, prescriptions, timeline,
        billingRecords, patientReviews, nurseActions, medicalProcedures,
        ancAssessments, appointments, patient,
      },
    });
  } catch (error) {
    console.error("[patient-history] Error fetching patient history:", error);
    return NextResponse.json({ error: "Failed to fetch patient history" }, { status: 500 });
  }
}
