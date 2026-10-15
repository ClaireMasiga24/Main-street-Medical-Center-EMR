import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/follow-up/flags?patientIds=1,2,3
//
// READ-ONLY. Tells the cashier which patients in their queue are currently in a
// doctor-started follow-up consultation, so they can decide whether the visit is
// chargeable. This is DISPLAY ONLY — it decides nothing about fees, waivers or
// payments, and changes no billing row.
//
// Batched on purpose: the whole queue is answered in a fixed number of queries
// regardless of how many patients are on it. One query per row would be fatal
// here — DATABASE_URL pins connection_limit=1.
//
// The match is deliberately narrow. A FOLLOW_UP_STARTED timeline row is only
// honoured when it points at the encounter the patient is *currently* in, and
// only while that encounter is still with the doctor. So a follow-up from six
// months ago cannot badge today's ordinary new visit, and the badge correctly
// disappears once the encounter moves on to the cashier.
//
// NO prisma.$transaction, and no writes of any kind.

const MAX_IDS = 200;

interface FollowUpMeta {
  newEncounterId?: number;
  previousVisitId?: number;
  type?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const patientIds = (searchParams.get("patientIds") || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0)
      .slice(0, MAX_IDS);

    if (patientIds.length === 0) {
      return NextResponse.json({ flags: {} });
    }

    // Query 1 — follow-up starts for anyone in the queue.
    const timeline = await prisma.patientTimeline.findMany({
      where: { action: "FOLLOW_UP_STARTED", patientId: { in: patientIds } },
      orderBy: { createdAt: "desc" },
      select: { patientId: true, metadata: true },
    });

    // Query 2 — the encounter each of those patients is in right now.
    const currentEncounters = await prisma.encounter.findMany({
      where: { patientId: { in: patientIds }, currentOwnerDept: "DOCTOR" },
      select: { id: true, patientId: true },
    });

    const encounterByPatient = new Map<number, number>();
    for (const e of currentEncounters) {
      if (!encounterByPatient.has(e.patientId)) {
        encounterByPatient.set(e.patientId, e.id);
      }
    }

    const flags: Record<string, { previousVisitId: number; type: string }> = {};

    for (const row of timeline) {
      const currentId = encounterByPatient.get(row.patientId);
      if (!currentId || flags[String(row.patientId)]) continue;

      let meta: FollowUpMeta;
      try {
        meta = JSON.parse(row.metadata || "{}") as FollowUpMeta;
      } catch {
        continue; // not a row we wrote — skip rather than break the queue
      }

      if (meta.newEncounterId !== currentId) continue;
      if (typeof meta.previousVisitId !== "number") continue;

      flags[String(row.patientId)] = {
        previousVisitId: meta.previousVisitId,
        type: meta.type ?? "Follow-up",
      };
    }

    return NextResponse.json({ flags });
  } catch (err) {
    console.error("[follow-up/flags GET]", err);
    // The caller treats a failure as "no flags" and renders the queue exactly
    // as it is today, so this must never be a hard error for the cashier.
    return NextResponse.json({ flags: {} });
  }
}
