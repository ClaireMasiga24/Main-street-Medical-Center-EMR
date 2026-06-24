import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "";
    const doctorId = searchParams.get("doctorId") ? parseInt(searchParams.get("doctorId")!) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 3600000 * 24);

    const statuses: string[] = ["AWAITING_DOCTOR", "IN_CONSULTATION"];
    const whereStatus: any = { currentStatus: { in: statuses } };
    if (statusFilter) whereStatus.currentStatus = statusFilter;

    const patients = await prisma.patient.findMany({
      where: whereStatus,
      orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
      include: {
        Triage: { orderBy: { createdAt: "desc" }, take: 1 },
        Visit: { orderBy: { createdAt: "desc" }, take: 1 },
        LabRequest: { where: { status: { not: "COMPLETED" } }, take: 5, orderBy: { createdAt: "desc" } },
        ImagingRequest: { where: { status: { notIn: ["REPORTED", "CANCELLED"] } }, take: 5, orderBy: { createdAt: "desc" } },
        Appointment: { where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor" }, take: 1, orderBy: { appointmentDate: "asc" } },
      },
    });

    const [awaitingDoctor, inConsultation, completedToday, pendingLabs, pendingRadiology, todayAppointments, admittedPatients] = await Promise.all([
      prisma.patient.count({ where: { currentStatus: "AWAITING_DOCTOR" } }),
      prisma.patient.count({ where: { currentStatus: "IN_CONSULTATION" } }),
      prisma.visit.count({ where: { createdAt: { gte: today, lt: todayEnd }, diagnosis: { not: null }, ...(doctorId ? { doctorId } : {}) } }),
      prisma.labRequest.count({ where: { status: { notIn: ["COMPLETED", "REJECTED"] }, Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } } } }),
      prisma.imagingRequest.count({ where: { status: { notIn: ["REPORTED", "CANCELLED"] }, Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } } } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor", status: { not: "CANCELLED" } } }),
      prisma.patient.count({ where: { currentStatus: "ADMITTED" } }),
    ]);

    const recentNotifications = await prisma.notification.findMany({
      where: { department: "Doctor", createdAt: { gte: twentyFourHoursAgo } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const enrichedPatients = patients.map((p) => {
      const triage = p.Triage?.[0];
      const visit = p.Visit?.[0];
      const waitingMs = now - new Date(p.updatedAt).getTime();
      const waitingMinutes = Math.floor(waitingMs / 60000);
      const waitingDisplay =
        waitingMinutes < 1 ? "Just now" :
        waitingMinutes < 60 ? `${waitingMinutes}m` :
        `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

      let source = "Triage";
      if (p.isEmergency) source = "Emergency";
      else if (p.Appointment?.length > 0) source = "Appointment";
      else if (p.LabRequest?.length > 0) source = "Lab Referral";
      else if (p.ImagingRequest?.length > 0) source = "Radiology Referral";

      return {
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        age: p.age,
        phoneNumber: p.phoneNumber ?? null,
        isEmergency: p.isEmergency,
        currentStatus: p.currentStatus,
        updatedAt: p.updatedAt.toISOString(),
        waitingMinutes,
        waitingDisplay,
        chiefComplaint: triage?.chiefComplaint ?? visit?.symptoms ?? "",
        esiLevel: triage?.esiLevel ?? null,
        triageCompletedAt: triage?.createdAt?.toISOString() ?? null,
        source,
        pendingLabs: p.LabRequest?.length ?? 0,
        pendingImaging: p.ImagingRequest?.length ?? 0,
        hasAppointment: (p.Appointment?.length ?? 0) > 0,
      };
    });

    const clinicalUpdates = recentNotifications.map((n) => ({
      id: String(n.id),
      type: "COMMUNICATION" as const,
      title: n.title ?? "Update",
      message: n.message ?? "",
      patientName: "",
      patientId: n.patientId ?? 0,
      patientNumber: "",
      timestamp: n.createdAt.toISOString(),
      severity: "info" as "critical" | "info",
    }));

    return NextResponse.json({
      patients: enrichedPatients,
      metrics: { awaitingDoctor, inConsultation, completedToday, pendingLabs, pendingRadiology, todayAppointments, admittedPatients },
      clinicalUpdates,
    });
  } catch (err: any) {
    console.error("[doctor/dashboard GET] Error:", err.message || err);
    if (err.code) console.error("[doctor/dashboard GET] Error code:", err.code);
    if (err?.meta?.cause) console.error("[doctor/dashboard GET] Error cause:", err.meta.cause);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}