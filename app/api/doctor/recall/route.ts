import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

// PATCH — undo a referral and recall the patient back to consultation
export async function PATCH(req: NextRequest) {
  try {
    const { patientId, encounterId } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, patientNumber: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // ── Integrity checks: refuse if work on THIS visit has progressed ───────
    // Scoped to the encounter (plus encounter-less requests raised after it
    // opened, e.g. orders created at reception). The previous check looked at
    // every request the patient had ever had, so a single lab test completed
    // during an earlier visit blocked recall for that patient permanently.
    const visitScope: any[] = [];
    if (encounterId) {
      visitScope.push({ encounterId });
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        select: { openedAt: true },
      });
      if (encounter?.openedAt) {
        visitScope.push({ encounterId: null, createdAt: { gte: encounter.openedAt } });
      }
    }

    const startedLabs = await prisma.labRequest.findFirst({
      where: {
        patientId,
        status: { notIn: ["PENDING", "CANCELLED"] },
        // With no encounter to scope to, fall back to the conservative
        // whole-patient check rather than skipping the guard entirely.
        ...(visitScope.length ? { OR: visitScope } : {}),
      },
      select: { id: true },
    });
    if (startedLabs) {
      return NextResponse.json(
        { error: "Cannot recall — lab work on this visit has already started.", code: "ALREADY_PROCESSED" },
        { status: 409 },
      );
    }

    const startedImaging = await prisma.imagingRequest.findFirst({
      where: {
        patientId,
        status: { notIn: ["ORDERED", "CANCELLED"] },
        ...(visitScope.length ? { OR: visitScope } : {}),
      },
      select: { id: true },
    });
    if (startedImaging) {
      return NextResponse.json(
        { error: "Cannot recall — imaging on this visit has already started.", code: "ALREADY_PROCESSED" },
        { status: 409 },
      );
    }

    // ── Atomic recall ──
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cancel pending lab requests
      await tx.labRequest.updateMany({
        where: { patientId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // 2. Cancel pending/ordered imaging requests
      await tx.imagingRequest.updateMany({
        where: { patientId, status: "ORDERED" },
        data: { status: "CANCELLED" },
      });

      // 3. Reset patient status back to consultation
      await tx.patient.update({
        where: { id: patientId },
        data: {
          currentStatus: "IN_CONSULTATION",
          sentToTreatmentRoom: false,
        },
      });

      // 4. Route the encounter back to the doctor
      if (encounterId) {
        await tx.encounter.update({
          where: { id: encounterId },
          data: {
            currentStatus: "IN_CONSULTATION",
            currentOwnerDept: "DOCTOR",
          },
        });
      }

      // 5. Log timeline
      await tx.patientTimeline.create({
        data: {
          patientId,
          action: "RECALLED",
          fromDepartment: "REFERRAL",
          toDepartment: "DOCTOR",
          description: `Patient recalled back to doctor — referral undone`,
          performedBy: "Doctor",
        },
      });
    }, { maxWait: 15000, timeout: 15000 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[doctor/recall PATCH]", err);
    return NextResponse.json({ error: "Server error recalling patient." }, { status: 500 });
  }
}
