import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      staffId,
      staffName,
      dateOfDischarge,
      reasonForAdmission,
      clinicalSummary,
      examFindingsAtAdmission,
      examFindingsAtDischarge,
      investigationsSummary,
      diagnosis,
      treatmentGiven,
      conditionAtDischarge,
      conditionOtherDetail,
      dischargeMedication,
      followUpPlan,
      nextOfKinName,
      nextOfKinSignature,
      nextOfKinDate,
      doctorSignatureName,
      doctorSignedAt,
    } = body;

    if (!patientId || !staffName) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, staffName" },
        { status: 400 }
      );
    }

    const performerName = staffName || "Doctor";

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. Create a Visit record for audit trail
        const visit = await tx.visit.create({
          data: {
            patientId,
            diagnosis: diagnosis || null,
            treatmentPlan: treatmentGiven || null,
            notes: `Discharge summary — ${clinicalSummary || ""}`,
            doctorId: staffId || null,
            doctorName: performerName,
          },
        });

        // 2. Create DischargeSummary record
        const dischargeSummary = await tx.dischargeSummary.create({
          data: {
            patientId,
            patientNumber: "", // will be updated after we get it
            visitId: visit.id,
            doctorId: staffId || null,
            dateOfDischarge: dateOfDischarge
              ? new Date(dateOfDischarge)
              : new Date(),
            reasonForAdmission: reasonForAdmission || null,
            clinicalSummary: clinicalSummary || null,
            examFindingsAtAdmission: examFindingsAtAdmission || null,
            examFindingsAtDischarge: examFindingsAtDischarge || null,
            investigationsSummary: investigationsSummary || Prisma.JsonNull,
            diagnosis: diagnosis || null,
            treatmentGiven: treatmentGiven || null,
            conditionAtDischarge: conditionAtDischarge || null,
            conditionOtherDetail: conditionOtherDetail || null,
            dischargeMedication: dischargeMedication || null,
            followUpPlan: followUpPlan || null,
            nextOfKinName: nextOfKinName || null,
            nextOfKinSignature: nextOfKinSignature || null,
            nextOfKinDate: nextOfKinDate ? new Date(nextOfKinDate) : null,
            doctorSignatureName: doctorSignatureName || performerName,
            doctorSignedAt: doctorSignedAt ? new Date(doctorSignedAt) : new Date(),
          },
        });

        // 3. Update patient's patientNumber on the summary if not set
        const patient = await tx.patient.findUnique({
          where: { id: patientId },
          select: { patientNumber: true },
        });

        if (patient) {
          await tx.dischargeSummary.update({
            where: { id: dischargeSummary.id },
            data: { patientNumber: patient.patientNumber },
          });
        }

        // 4. Update patient status — DISCHARGED
        await tx.patient.update({
          where: { id: patientId },
          data: {
            currentStatus: "DISCHARGED",
            sentToTreatmentRoom: false,
          },
        });

        // 5. Create timeline entries
        await tx.patientTimeline.create({
          data: {
            patientId,
            action: "CONSULTATION_END",
            fromDepartment: "DOCTOR",
            toDepartment: "DISCHARGE",
            description: `Discharged — ${conditionAtDischarge || "N/A"}. Diagnosis: ${diagnosis || "N/A"}`,
            metadata: JSON.stringify({
              dischargeSummaryId: dischargeSummary.id,
              visitId: visit.id,
              diagnosis,
              conditionAtDischarge,
            }),
            performedBy: performerName,
            performedById: staffId || null,
          },
        });

        await tx.patientTimeline.create({
          data: {
            patientId,
            action: "STATUS_CHANGE",
            fromDepartment: "ADMITTED",
            toDepartment: "DISCHARGED",
            description: `Discharged by Dr. ${performerName}`,
            performedBy: performerName,
            performedById: staffId || null,
          },
        });

        // Return the completed summary with patient number
        return await tx.dischargeSummary.findUnique({
          where: { id: dischargeSummary.id },
        });
      }
    );

    return NextResponse.json({
      success: true,
      dischargeSummary: result,
    });
  } catch (err) {
    console.error("[doctor/discharge POST]", err);
    return NextResponse.json(
      { error: "Failed to complete discharge. Please try again." },
      { status: 500 }
    );
  }
}
