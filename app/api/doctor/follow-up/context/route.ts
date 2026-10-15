import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { resolveDoctorIds } from "@/app/lib/doctorScope";

// GET /api/doctor/follow-up/context?patientId=&encounterId=&doctorId=
//
// Read-only. Backs two things on the consultation screen:
//   1. the collapsible "Previous visit" card
//   2. the "This encounter is currently with <department>" banner
//
// One request for both, so the panel makes a single round trip on open.
//
// STRICTLY READ-ONLY: no writes, no timeline rows, no $transaction.

interface FollowUpMeta {
  previousVisitId?: number;
  newEncounterId?: number;
  type?: string;
  reason?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const patientId = Number(searchParams.get("patientId"));
    const encounterId = Number(searchParams.get("encounterId"));
    const doctorId = searchParams.get("doctorId");

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ error: "A valid patientId is required." }, { status: 400 });
    }
    if (!Number.isInteger(encounterId) || encounterId <= 0) {
      return NextResponse.json({ error: "A valid encounterId is required." }, { status: 400 });
    }

    const doctor = await resolveDoctorIds(doctorId);
    if (!doctor) {
      return NextResponse.json({ error: "A doctor id is required." }, { status: 400 });
    }

    // Ownership: this doctor must have completed a consultation for the patient.
    // Same proof as the record endpoint (app/api/doctor/treated/[patientId]:38-60).
    const treated = await prisma.visit.findFirst({
      where: { patientId, doctorId: { in: doctor.ids } },
      select: { id: true },
    });
    if (!treated) {
      return NextResponse.json(
        { error: "This patient is not in your treated list." },
        { status: 403 }
      );
    }

    // The encounter itself, confirmed to belong to this patient.
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: {
        id: true,
        patientId: true,
        currentOwnerDept: true,
        currentStatus: true,
        openedAt: true,
        updatedAt: true,
      },
    });
    if (!encounter || encounter.patientId !== patientId) {
      return NextResponse.json(
        { error: "Encounter not found for this patient." },
        { status: 404 }
      );
    }

    // The follow-up link. PatientTimeline is patient-scoped, not
    // encounter-scoped, and metadata is a free-text JSON column, so this is a
    // per-patient read filtered in application code. A real parentEncounterId
    // column would make this a single indexed lookup.
    const timeline = await prisma.patientTimeline.findMany({
      where: { patientId, action: "FOLLOW_UP_STARTED" },
      orderBy: { createdAt: "desc" },
      select: { description: true, metadata: true, createdAt: true },
      take: 50,
    });

    let followUp: {
      previousVisitId: number;
      type: string;
      reason: string;
      startedAt: string;
      description: string;
    } | null = null;

    for (const row of timeline) {
      if (!row.metadata) continue;
      let meta: FollowUpMeta;
      try {
        meta = JSON.parse(row.metadata) as FollowUpMeta;
      } catch {
        continue; // not ours, or malformed — skip rather than fail the panel
      }
      if (meta.newEncounterId !== encounterId) continue;
      if (typeof meta.previousVisitId !== "number") continue;

      followUp = {
        previousVisitId: meta.previousVisitId,
        type: meta.type ?? "Follow-up",
        reason: meta.reason ?? "",
        startedAt: row.createdAt.toISOString(),
        description: row.description ?? "",
      };
      break;
    }

    return NextResponse.json({
      followUp,
      encounter: {
        id: encounter.id,
        currentOwnerDept: encounter.currentOwnerDept,
        currentStatus: encounter.currentStatus,
        openedAt: encounter.openedAt.toISOString(),
        updatedAt: encounter.updatedAt.toISOString(),
        isHeldElsewhere: encounter.currentOwnerDept !== "DOCTOR",
      },
    });
  } catch (err) {
    console.error("[doctor/follow-up/context GET]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to load the encounter context.", detail },
      { status: 500 }
    );
  }
}
