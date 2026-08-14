import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// Map old Patient.lastSharedFromDept values back to a source label for the fallback
const DEPT_SOURCE_MAP: Record<string, { label: string; icon: string }> = {
  "Lab":          { label: "Lab Referral",          icon: "microscope" },
  "Lab Referral": { label: "Lab Referral",          icon: "microscope" },
  "Radiology":    { label: "Radiology Referral",    icon: "radio" },
  "Sonography":   { label: "Sonography Referral",   icon: "waves" },
  "Dentist":      { label: "Dentist Referral",      icon: "stethoscope" },
  "Nurse/Midwife":{ label: "Nurse Referral",        icon: "activity" },
  "Nurse":        { label: "Nurse Referral",        icon: "activity" },
};

function inferSource(p: any): string {
  if (p.isEmergency) return "Emergency";
  if (p.lastSharedFromDept) return DEPT_SOURCE_MAP[p.lastSharedFromDept]?.label || "Follow-up";
  return "Triage";
}

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

    // ── Step 1: try encounter-based query ───────────────────────────────────
    const statuses: string[] = ["AWAITING_DOCTOR", "IN_CONSULTATION"];
    const encounterWhere: any = {
      currentOwnerDept: "DOCTOR",
      currentStatus: { in: statuses },
      status: "ACTIVE",
    };
    if (statusFilter) {
      encounterWhere.currentStatus = statusFilter;
    }

    let encounters = await prisma.encounter.findMany({
      where: encounterWhere,
      orderBy: [{ isEmergency: "desc" }, { updatedAt: "desc" }],
      include: {
        patient: {
          include: {
            Triage: { orderBy: { createdAt: "desc" }, take: 1 },
            Visit: { orderBy: { createdAt: "desc" }, take: 1 },
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
        },
      },
    });

    // Sort: doctor-registered patients first, then by most-recently-updated
    encounters.sort((a, b) => {
      const aIsDocReg = a.source === "Doctor Registration" ? 1 : 0;
      const bIsDocReg = b.source === "Doctor Registration" ? 1 : 0;
      if (aIsDocReg !== bIsDocReg) return bIsDocReg - aIsDocReg;
      return 0; // Rest already sorted by Prisma: emergency desc, updatedAt desc
    });

    const recentNotifications = await prisma.notification.findMany({
      where: {
        department: "Doctor",
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // If we have encounters, use them (new flow). Otherwise fall back to
    // the old Patient-based query for existing data.
    if (encounters.length > 0) {
      // ── Metrics (encounter-based) ───────────────────────────────────────
      const awaitingDoctor = await prisma.encounter.count({
        where: {
          currentOwnerDept: "DOCTOR",
          currentStatus: "AWAITING_DOCTOR",
          status: "ACTIVE",
        },
      });
      const inConsultation = await prisma.encounter.count({
        where: {
          currentOwnerDept: "DOCTOR",
          currentStatus: "IN_CONSULTATION",
          status: "ACTIVE",
        },
      });
      const completedToday = await prisma.visit.count({
        where: {
          createdAt: { gte: today, lt: todayEnd },
          diagnosis: { not: null },
          ...(doctorId ? { doctorId } : {}),
        },
      });
      const pendingLabs = await prisma.labRequest.count({
        where: {
          status: { notIn: ["COMPLETED", "REJECTED"] },
          Encounter: { currentOwnerDept: "DOCTOR", status: "ACTIVE" },
        },
      });
      const pendingRadiology = await prisma.imagingRequest.count({
        where: {
          status: { notIn: ["REPORTED", "CANCELLED"] },
          Encounter: { currentOwnerDept: "DOCTOR", status: "ACTIVE" },
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

      const enrichedPatients = encounters.map((e) => {
        const p = e.patient;
        const triage = p.Triage?.[0];
        const visit = p.Visit?.[0];
        const waitingMs = now - new Date(e.updatedAt).getTime();
        const waitingMinutes = Math.floor(waitingMs / 60000);
        const waitingDisplay =
          waitingMinutes < 1 ? "Just now"
          : waitingMinutes < 60 ? `${waitingMinutes}m`
          : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

        return {
          id: p.id,
          encounterId: e.id,
          patientNumber: p.patientNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          age: p.age,
          phoneNumber: p.phoneNumber ?? null,
          isEmergency: e.isEmergency,
          currentStatus: e.currentStatus,
          lastSharedFromDept: e.lastSharedFromDept ?? null,
          updatedAt: e.updatedAt.toISOString(),
          waitingMinutes,
          waitingDisplay,
          chiefComplaint: e.chiefComplaint ?? triage?.chiefComplaint ?? visit?.symptoms ?? "",
          esiLevel: e.esiLevel ?? triage?.esiLevel ?? null,
          triageCompletedAt: e.triageCompletedAt?.toISOString() ?? triage?.createdAt?.toISOString() ?? null,
          source: e.source,
          pendingLabs: p.LabRequest?.length ?? 0,
          pendingImaging: p.ImagingRequest?.length ?? 0,
          hasAppointment: (p.Appointment?.length ?? 0) > 0,
          appointmentTime: p.Appointment?.[0]?.appointmentDate?.toISOString() ?? null,
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
    }

    // ── Step 2: fallback — old Patient-based query (existing data) ─────────
    const fallbackWhere: any = {
      currentStatus: statusFilter ? { in: [statusFilter] } : { in: statuses },
    };
    const fallbackPatients = await prisma.patient.findMany({
      where: fallbackWhere,
      orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
      include: {
        Encounter: {
          where: { status: "ACTIVE" },
          orderBy: { openedAt: "desc" },
          take: 1,
        },
        Triage: { orderBy: { createdAt: "desc" }, take: 1 },
        Visit: { orderBy: { createdAt: "desc" }, take: 1 },
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
          where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor" },
          take: 1,
          orderBy: { appointmentDate: "asc" },
        },
      },
    });

    const awaiting = await prisma.patient.count({
      where: { currentStatus: "AWAITING_DOCTOR" },
    });
    const inCons = await prisma.patient.count({
      where: { currentStatus: "IN_CONSULTATION" },
    });
    const completedToday = await prisma.visit.count({
      where: {
        createdAt: { gte: today, lt: todayEnd },
        diagnosis: { not: null },
        ...(doctorId ? { doctorId } : {}),
      },
    });
    const pendingLabCount = await prisma.labRequest.count({
      where: {
        status: { notIn: ["COMPLETED", "REJECTED"] },
        Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      },
    });
    const pendingRadCount = await prisma.imagingRequest.count({
      where: {
        status: { notIn: ["REPORTED", "CANCELLED"] },
        Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      },
    });
    const todayAppointments = await prisma.appointment.count({
      where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor", status: { not: "CANCELLED" } },
    });
    const admittedPatients = await prisma.patient.count({
      where: { currentStatus: "ADMITTED" },
    });

    const enriched = fallbackPatients.map((p) => {
      const triage = p.Triage?.[0];
      const visit = p.Visit?.[0];
      const activeEncounter = p.Encounter?.[0] ?? null;
	      const waitingMs = now - new Date(p.updatedAt).getTime();
	      const waitingMinutes = Math.floor(waitingMs / 60000);
	      const waitingDisplay =
	        waitingMinutes < 1 ? "Just now"
	        : waitingMinutes < 60 ? `${waitingMinutes}m`
	        : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

      return {
	        id: p.id,
	        encounterId: activeEncounter?.id ?? 0,
	        patientNumber: p.patientNumber,
	        firstName: p.firstName,
	        lastName: p.lastName,
	        gender: p.gender,
	        age: p.age,
	        phoneNumber: p.phoneNumber ?? null,
	        isEmergency: p.isEmergency,
	        currentStatus: p.currentStatus,
	        lastSharedFromDept: p.lastSharedFromDept ?? null,
	        updatedAt: p.updatedAt.toISOString(),
	        waitingMinutes,
	        waitingDisplay,
	        chiefComplaint: triage?.chiefComplaint ?? visit?.symptoms ?? "",
	        esiLevel: triage?.esiLevel ?? null,
	        triageCompletedAt: triage?.createdAt?.toISOString() ?? null,
	        source: inferSource(p),
	        pendingLabs: p.LabRequest?.length ?? 0,
	        pendingImaging: p.ImagingRequest?.length ?? 0,
	        hasAppointment: (p.Appointment?.length ?? 0) > 0,
	        appointmentTime: p.Appointment?.[0]?.appointmentDate?.toISOString() ?? null,
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
      patients: enriched,
      metrics: {
        awaitingDoctor: awaiting,
        inConsultation: inCons,
        completedToday,
        pendingLabs: pendingLabCount,
        pendingRadiology: pendingRadCount,
        todayAppointments,
        admittedPatients,
      },
      clinicalUpdates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof Object && "code" in err ? (err as any).code : undefined;
    const meta = err instanceof Object && "meta" in err ? (err as any).meta : undefined;
    console.error("[doctor/dashboard GET] Error:", message);
    if (code) console.error("[doctor/dashboard GET] Error code:", code);
    if (meta?.cause) console.error("[doctor/dashboard GET] Error cause:", meta.cause);
    return NextResponse.json(
      {
        error: "Failed to load dashboard data.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
        code: process.env.NODE_ENV === "development" ? code : undefined,
      },
      { status: 500 }
    );
  }
}
