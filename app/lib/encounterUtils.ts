import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { createNotification } from "./notifications";

/** Prisma client that can be either the global client or a transaction client. */
type PrismaClient = Prisma.TransactionClient | typeof prisma;

/**
 * Route an active encounter back to the doctor queue.
 * Called from every referral-completion path (lab, imaging, dental, nurse).
 * Accepts an optional transaction client (tx) for use inside prisma.$transaction.
 */
export async function returnEncounterToDoctor(
  encounterId: number,
  fromDept: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  await client.encounter.update({
    where: { id: encounterId },
    data: {
      currentStatus: "AWAITING_DOCTOR",
      currentOwnerDept: "DOCTOR",
      lastSharedFromDept: fromDept,
    },
  });

  // Also update Patient's shared-from-dept for backward compat (admitted
  // patients still use Patient.lastSharedFromDept for source detection).
  const encounter = await client.encounter.findUnique({
    where: { id: encounterId },
    select: { patientId: true },
  });
  if (encounter) {
    await client.patient.update({
      where: { id: encounter.patientId },
      data: { lastSharedFromDept: fromDept },
    });
  }
}

/**
 * Route an active encounter to a specific department.
 * Accepts an optional transaction client (tx) for use inside prisma.$transaction.
 */
export async function routeEncounterToDept(
  encounterId: number,
  targetDept: string,
  targetStatus: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  await client.encounter.update({
    where: { id: encounterId },
    data: {
      currentStatus: targetStatus,
      currentOwnerDept: targetDept,
    },
  });
}

/**
 * Close an encounter (used on discharge, full payment, or admission).
 * Accepts an optional transaction client (tx) for use inside prisma.$transaction.
 */
export async function closeEncounter(
  encounterId: number,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  await client.encounter.update({
    where: { id: encounterId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });
}

/**
 * Create an encounter from triage, reception, or doctor registration.
 * Accepts an optional transaction client (tx) for use inside prisma.$transaction.
 */
export async function createEncounter(
  data: {
    patientId: number;
    source: string;
    isEmergency: boolean;
    currentStatus?: string;
    currentOwnerDept?: string;
    chiefComplaint?: string | null;
    esiLevel?: number | null;
    triageCompletedAt?: Date | null;
  },
  tx?: Prisma.TransactionClient
): Promise<{ id: number }> {
  const client = tx ?? prisma;
  return client.encounter.create({
    data: {
      patientId: data.patientId,
      source: data.source,
      isEmergency: data.isEmergency,
      currentStatus: data.currentStatus ?? "AWAITING_DOCTOR",
      currentOwnerDept: data.currentOwnerDept ?? "DOCTOR",
      chiefComplaint: data.chiefComplaint ?? null,
      esiLevel: data.esiLevel ?? null,
      triageCompletedAt: data.triageCompletedAt ?? null,
    },
    select: { id: true },
  });
}

/** Map from the old PatientStatus / routeTo to Encounter status + dept */
export const ROUTE_TO_ENCOUNTER: Record<string, { status: string; dept: string }> = {
  LAB:        { status: "AWAITING_LAB",       dept: "LAB" },
  SONOGRAPHY: { status: "AWAITING_SONOGRAPHY", dept: "SONOGRAPHY" },
  RADIOLOGY:  { status: "AWAITING_RADIOLOGY",  dept: "RADIOLOGY" },
  DENTIST:    { status: "AWAITING_DENTIST",    dept: "DENTIST" },
  NURSE:      { status: "AWAITING_NURSE",      dept: "NURSE" },
  PHARMACY:   { status: "AWAITING_PHARMACY",   dept: "PHARMACY" },
  CASHIER:    { status: "AWAITING_CASHIER",    dept: "CASHIER" },
  DOCTOR:     { status: "AWAITING_DOCTOR",     dept: "DOCTOR" },
};
