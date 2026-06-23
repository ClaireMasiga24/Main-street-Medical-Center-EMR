import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET — fetch dental department dashboard statistics
export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [
      waitingPatients,
      inConsultation,
      todayCompleted,
      emergencyCount,
      todayProcedures,
      followUpCount,
      totalRecords,
      proceduresByType,
    ] = await Promise.all([
      // Patients waiting for dentist
      prisma.patient.count({
        where: { currentStatus: "AWAITING_DENTIST" },
      }),

      // Patients in consultation
      prisma.patient.count({
        where: { currentStatus: "IN_CONSULTATION" },
      }),

      // Today's completed dental consultations
      prisma.dentalRecord.count({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // Emergency patients waiting
      prisma.patient.count({
        where: {
          currentStatus: { in: ["AWAITING_DENTIST", "IN_CONSULTATION"] },
          isEmergency: true,
        },
      }),

      // Today's procedures
      prisma.dentalProcedure.count({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // Patients needing follow-up (last 7 days with reviewAppointment set)
      prisma.dentalRecord.count({
        where: {
          reviewAppointment: { gte: now },
          status: "FOLLOW_UP",
        },
      }),

      // Total dental records all time
      prisma.dentalRecord.count(),

      // Procedure type breakdown (last 30 days)
      prisma.dentalProcedure.groupBy({
        by: ["procedureType"],
        where: {
          createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
        },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      waitingPatients,
      inConsultation,
      todayCompleted,
      emergencyCount,
      todayProcedures,
      followUpCount,
      totalRecords,
      proceduresByType: proceduresByType.map((p: any) => ({
        type: p.procedureType,
        count: p._count,
      })),
    });
  } catch (err) {
    console.error("[dental/stats GET]", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
