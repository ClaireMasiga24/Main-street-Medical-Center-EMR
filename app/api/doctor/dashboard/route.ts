import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";
    const doctorId = searchParams.get("doctorId") ? parseInt(searchParams.get("doctorId")!) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 3600000 * 24);
    const fortyEightHoursAgo = new Date(now - 3600000 * 48);

    // ── Run all queries in parallel ───────────────────────────────────
    const statuses: string[] = ["AWAITING_DOCTOR", "IN_CONSULTATION"];
    const whereStatus: any = { currentStatus: { in: statuses } };
    if (statusFilter) whereStatus.currentStatus = statusFilter;

    const [
      patients,
      awaitingDoctor,
      inConsultation,
      completedToday,
      pendingLabs,
      pendingRadiology,
      todayAppointments,
      admittedPatients,
      recentCompletedLabs,
      recentReportedImaging,
      criticalItems,
      recentNotifications,
    ] = await Promise.all([
      // 1. Patient queue
      prisma.patient.findMany({
        where: whereStatus,
        orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
        include: {
          Triage: { orderBy: { createdAt: "desc" }, take: 1 },
          Visit: { orderBy: { createdAt: "desc" }, take: 1 },
          LabRequest: { where: { status: { not: "COMPLETED" } }, take: 5, orderBy: { createdAt: "desc" } },
          ImagingRequest: { where: { status: { notIn: ["REPORTED", "CANCELLED"] } }, take: 5, orderBy: { createdAt: "desc" } },
          Appointment: { where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor" }, take: 1, orderBy: { appointmentDate: "asc" } },
        },
      }),
      // 2. Metrics
      prisma.patient.count({ where: { currentStatus: "AWAITING_DOCTOR" } }),
      prisma.patient.count({ where: { currentStatus: "IN_CONSULTATION" } }),
      prisma.visit.count({ where: { createdAt: { gte: today, lt: todayEnd }, diagnosis: { not: null }, ...(doctorId ? { doctorId } : {}) } }),
      prisma.labRequest.count({ where: { status: { notIn: ["COMPLETED", "REJECTED"] }, Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } } } }),
      prisma.imagingRequest.count({ where: { status: { notIn: ["REPORTED", "CANCELLED"] }, Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } } } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor", status: { not: "CANCELLED" } } }),
      prisma.patient.count({ where: { currentStatus: "ADMITTED" } }),
      // 3. Clinical updates - combined critical + recent results, last 24h
      prisma.labRequest.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: twentyFourHoursAgo } },
        orderBy: { updatedAt: "desc" }, take: 10,
        include: { Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } } },
      }),
      prisma.imagingRequest.findMany({
        where: { status: "REPORTED", reportedAt: { gte: twentyFourHoursAgo } },
        orderBy: { reportedAt: "desc" }, take: 10,
        include: { Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } } },
      }),
      // Critical items (both lab + imaging) in one combined query
      Promise.all([
        prisma.labRequest.findMany({
          where: { isCritical: true, status: "COMPLETED", updatedAt: { gte: fortyEightHoursAgo } },
          orderBy: { updatedAt: "desc" }, take: 10,
          include: { Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } } },
        }),
        prisma.imagingRequest.findMany({
          where: { isCritical: true, status: "REPORTED", reportedAt: { gte: fortyEightHoursAgo } },
          orderBy: { reportedAt: "desc" }, take: 10,
          include: { Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } } },
        }),
      ]),
      // Notifications
      prisma.notification.findMany({
        where: { department: "Doctor", createdAt: { gte: twentyFourHoursAgo } },
        orderBy: { createdAt: "desc" }, take: 10,
      }),
    ]);

    // ── Filter patients client-side ───────────────────────────────────
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

    // ── Enrich patients ───────────────────────────────────────────────
    const enrichedPatients = filteredPatients.map((p) => {
      const latestTriage = p.Triage?.[0];
      const waitingMs = now - new Date(p.updatedAt).getTime();
      const waitingMinutes = Math.floor(waitingMs / 60000);

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
        waitingDisplay: waitingMinutes < 1 ? "Just now" : waitingMinutes < 60 ? `${waitingMinutes}m` : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`,
        chiefComplaint: latestTriage?.chiefComplaint || p.Visit?.[0]?.symptoms || "",
        esiLevel: latestTriage?.esiLevel || null,
        triageCompletedAt: latestTriage?.createdAt || null,
        source,
        pendingLabs: p.LabRequest?.length || 0,
        pendingImaging: p.ImagingRequest?.length || 0,
        hasAppointment: (p.Appointment?.length ?? 0) > 0,
      };
    });

    // ── Build clinical updates ────────────────────────────────────────
    const [criticalResults, criticalImaging] = criticalItems;

    const clinicalUpdates: any[] = [
      ...criticalResults.map((l) => ({
        id: `lab-critical-${l.id}`, type: "CRITICAL_LAB", title: "Critical Lab Result",
        message: `${l.testName} — ${l.criticalNote || "Urgent review needed"}`,
        patientName: `${l.Patient.firstName} ${l.Patient.lastName}`, patientId: l.Patient.id,
        patientNumber: l.Patient.patientNumber, timestamp: l.updatedAt, severity: "critical",
      })),
      ...criticalImaging.map((i) => ({
        id: `imaging-critical-${i.id}`, type: "CRITICAL_IMAGING", title: "Critical Radiology Finding",
        message: i.criticalNote || `${i.studyType} — Urgent review needed`,
        patientName: `${i.Patient.firstName} ${i.Patient.lastName}`, patientId: i.Patient.id,
        patientNumber: i.Patient.patientNumber, timestamp: i.reportedAt || i.updatedAt, severity: "critical",
      })),
      ...recentCompletedLabs.map((l) => ({
        id: `lab-${l.id}`, type: "LAB_RESULT", title: "Lab Result Ready",
        message: `${l.testName} — Results available for review`,
        patientName: `${l.Patient.firstName} ${l.Patient.lastName}`, patientId: l.Patient.id,
        patientNumber: l.Patient.patientNumber, timestamp: l.updatedAt, severity: "info",
      })),
      ...recentReportedImaging.map((i) => ({
        id: `imaging-${i.id}`, type: "RADIOLOGY_REPORT", title: "Radiology Report Ready",
        message: `${i.studyType} — Report available for review`,
        patientName: `${i.Patient.firstName} ${i.Patient.lastName}`, patientId: i.Patient.id,
        patientNumber: i.Patient.patientNumber, timestamp: i.reportedAt || i.updatedAt, severity: "info",
      })),
      ...recentNotifications.map((n) => ({
        id: `notif-${n.id}`, type: "COMMUNICATION", title: n.title, message: n.message,
        patientName: "", patientId: 0, patientNumber: "", timestamp: n.createdAt,
        severity: (n.type === "CRITICAL_RESULT" ? "critical" : "info") as "critical" | "info",
      })),
    ];
    clinicalUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      patients: enrichedPatients,
      metrics: { awaitingDoctor, inConsultation, completedToday, pendingLabs, pendingRadiology, todayAppointments, admittedPatients },
      clinicalUpdates: clinicalUpdates.slice(0, 30),
    });
  } catch (err) {
    console.error("[doctor/dashboard GET]", err);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
