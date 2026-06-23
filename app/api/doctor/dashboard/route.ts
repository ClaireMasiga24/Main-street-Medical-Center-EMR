import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // ── 1. Patient Queue (AWAITING_DOCTOR or IN_CONSULTATION) ──────
    const statuses: string[] = ["AWAITING_DOCTOR", "IN_CONSULTATION"];
    const whereStatus: any = { currentStatus: { in: statuses } };
    if (statusFilter) whereStatus.currentStatus = statusFilter;

    const patients = await prisma.patient.findMany({
      where: whereStatus,
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Triage: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        LabRequest: {
          where: { status: { not: "COMPLETED" } },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        ImagingRequest: {
          where: { status: { notIn: ["REPORTED", "CANCELLED"] } },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        Appointment: {
          where: {
            appointmentDate: { gte: today, lt: todayEnd },
            department: "Doctor",
          },
          take: 1,
          orderBy: { appointmentDate: "asc" },
        },
      },
    });

    // Apply search filter client-side (after includes)
    const filteredPatients = search
      ? patients.filter((p) => {
          const q = search.toLowerCase();
          return (
            p.firstName.toLowerCase().includes(q) ||
            p.lastName.toLowerCase().includes(q) ||
            p.patientNumber.toLowerCase().includes(q) ||
            p.phoneNumber?.toLowerCase().includes(q)
          );
        })
      : patients;

    // Enrich patients with computed fields
    const now = Date.now();
    const enrichedPatients = filteredPatients.map((p) => {
      const latestTriage = p.Triage?.[0];
      const waitingMs = now - new Date(p.updatedAt).getTime();
      const waitingMinutes = Math.floor(waitingMs / 60000);

      // Determine source / origin
      let source = "Triage";
      if (p.isEmergency) source = "Emergency";
      else if (p.Appointment?.length) source = "Appointment";
      else if (p.LabRequest?.length) source = "Lab Referral";
      else if (p.ImagingRequest?.length) source = "Radiology Referral";
      else if (p.Visit?.length && p.currentStatus === "AWAITING_DOCTOR") source = "Follow-up";

      return {
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        age: p.age,
        phoneNumber: p.phoneNumber,
        isEmergency: p.isEmergency,
        currentStatus: p.currentStatus,
        updatedAt: p.updatedAt,
        waitingMinutes,
        waitingDisplay: formatWaiting(waitingMinutes),
        chiefComplaint: latestTriage?.chiefComplaint || p.Visit?.[0]?.symptoms || "",
        esiLevel: latestTriage?.esiLevel || null,
        triageCompletedAt: latestTriage?.createdAt || null,
        source,
        pendingLabs: p.LabRequest?.length || 0,
        pendingImaging: p.ImagingRequest?.length || 0,
        hasAppointment: (p.Appointment?.length ?? 0) > 0,
      };
    });

    // ── 2. Metrics ──────────────────────────────────────────────────
    const awaitingDoctor = await prisma.patient.count({
      where: { currentStatus: "AWAITING_DOCTOR" },
    });
    const inConsultation = await prisma.patient.count({
      where: { currentStatus: "IN_CONSULTATION" },
    });
    const completedToday = await prisma.visit.count({
      where: { createdAt: { gte: today, lt: todayEnd } },
    });
    const pendingLabs = await prisma.labRequest.count({
      where: {
        status: { notIn: ["COMPLETED", "REJECTED"] },
        Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      },
    });
    const pendingRadiology = await prisma.imagingRequest.count({
      where: {
        status: { notIn: ["REPORTED", "CANCELLED"] },
        Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      },
    });
    const todayAppointments = await prisma.appointment.count({
      where: {
        appointmentDate: { gte: today, lt: todayEnd },
        department: "Doctor",
        status: { not: "CANCELLED" },
      },
    });
    const admittedPatients = await prisma.patient.count({
      where: { currentStatus: "ADMITTED" },
    });

    // ── 3. Clinical Updates ─────────────────────────────────────────
    const recentCompletedLabs = await prisma.labRequest.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: new Date(now - 3600000 * 24) }, // last 24 hours
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
      },
    });

    const recentReportedImaging = await prisma.imagingRequest.findMany({
      where: {
        status: "REPORTED",
        reportedAt: { gte: new Date(now - 3600000 * 24) },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
      include: {
        Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
      },
    });

    const criticalResults = await prisma.labRequest.findMany({
      where: {
        isCritical: true,
        status: "COMPLETED",
        updatedAt: { gte: new Date(now - 3600000 * 48) },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
      },
    });

    const criticalImaging = await prisma.imagingRequest.findMany({
      where: {
        isCritical: true,
        status: "REPORTED",
        reportedAt: { gte: new Date(now - 3600000 * 48) },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
      include: {
        Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
      },
    });

    // ── Notifications as department communications ──────────────────
    const recentNotifications = await prisma.notification.findMany({
      where: {
        department: "Doctor",
        createdAt: { gte: new Date(now - 3600000 * 24) },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Combine clinical updates
    const clinicalUpdates = [
      ...criticalResults.map((l) => ({
        id: `lab-critical-${l.id}`,
        type: "CRITICAL_LAB" as const,
        title: "Critical Lab Result",
        message: `${l.testName} — ${l.criticalNote || "Urgent review needed"}`,
        patientName: `${l.Patient.firstName} ${l.Patient.lastName}`,
        patientId: l.Patient.id,
        patientNumber: l.Patient.patientNumber,
        timestamp: l.updatedAt,
        severity: "critical" as const,
      })),
      ...criticalImaging.map((i) => ({
        id: `imaging-critical-${i.id}`,
        type: "CRITICAL_IMAGING" as const,
        title: "Critical Radiology Finding",
        message: i.criticalNote || `${i.studyType} — Urgent review needed`,
        patientName: `${i.Patient.firstName} ${i.Patient.lastName}`,
        patientId: i.Patient.id,
        patientNumber: i.Patient.patientNumber,
        timestamp: i.reportedAt || i.updatedAt,
        severity: "critical" as const,
      })),
      ...recentCompletedLabs.map((l) => ({
        id: `lab-${l.id}`,
        type: "LAB_RESULT" as const,
        title: "Lab Result Ready",
        message: `${l.testName} — Results available for review`,
        patientName: `${l.Patient.firstName} ${l.Patient.lastName}`,
        patientId: l.Patient.id,
        patientNumber: l.Patient.patientNumber,
        timestamp: l.updatedAt,
        severity: "info" as const,
      })),
      ...recentReportedImaging.map((i) => ({
        id: `imaging-${i.id}`,
        type: "RADIOLOGY_REPORT" as const,
        title: "Radiology Report Ready",
        message: `${i.studyType} — Report available for review`,
        patientName: `${i.Patient.firstName} ${i.Patient.lastName}`,
        patientId: i.Patient.id,
        patientNumber: i.Patient.patientNumber,
        timestamp: i.reportedAt || i.updatedAt,
        severity: "info" as const,
      })),
      ...recentNotifications.map((n) => ({
        id: `notif-${n.id}`,
        type: "COMMUNICATION" as const,
        title: n.title,
        message: n.message,
        patientName: "",
        patientId: 0,
        patientNumber: "",
        timestamp: n.createdAt,
        severity: (n.type === "CRITICAL_RESULT" ? "critical" : "info") as "critical" | "info",
      })),
    ];

    // Sort clinical updates by timestamp descending, limit to 20
    clinicalUpdates.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      patients: enrichedPatients,
      metrics: {
        awaitingDoctor,
        inConsultation,
        completedToday,
        pendingLabs,
        pendingRadiology,
        todayAppointments,
        admittedPatients,
      },
      clinicalUpdates: clinicalUpdates.slice(0, 30),
    });
  } catch (err) {
    console.error("[doctor/dashboard GET]", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}

function formatWaiting(minutes: number): string {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs < 24) return `${hrs}h ${mins}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}
