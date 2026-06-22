import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { PrescriptionStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      // ─────────────────────────────
      // PATIENT FLOW
      // ─────────────────────────────
      case "CREATE_PATIENT": {
        const patient = await prisma.patient.create({
          data: {
            ...payload,
            currentStatus: "AWAITING_TRIAGE",
          },
        });

        return NextResponse.json(patient);
      }

      case "ADVANCE_PATIENT_STATUS": {
        const { patientId, nextStatus } = payload;

        const updated = await prisma.patient.update({
          where: { id: patientId },
          data: { currentStatus: nextStatus },
        });

        return NextResponse.json(updated);
      }

      // ─────────────────────────────
      // VISITS
      // ─────────────────────────────
      case "CREATE_VISIT": {
        const visit = await prisma.visit.create({
          data: payload,
        });

        return NextResponse.json(visit);
      }

      // ─────────────────────────────
      // LAB
      // ─────────────────────────────
      case "CREATE_LAB_REQUEST": {
        const lab = await prisma.labRequest.create({
          data: payload,
        });

        return NextResponse.json(lab);
      }

      case "UPDATE_LAB_RESULT": {
        const { id, results, status } = payload;

        const updated = await prisma.labRequest.update({
          where: { id },
          data: { results, status },
        });

        return NextResponse.json(updated);
      }

      // ─────────────────────────────
      // PRESCRIPTIONS / PHARMACY
      // ─────────────────────────────
      case "CREATE_PRESCRIPTION": {
        const rx = await prisma.prescription.create({
          data: payload,
        });

        return NextResponse.json(rx);
      }

      case "DISPENSE_PRESCRIPTION": {
        const { id } = payload;

        const updated = await prisma.prescription.update({
          where: { id },
          data: {
            status: PrescriptionStatus.DISPENSED,
          },
        });

        return NextResponse.json(updated);
      }

      // ─────────────────────────────
      // BILLING
      // ─────────────────────────────
      case "CREATE_BILL": {
        const bill = await prisma.billing.create({
          data: payload,
        });

        return NextResponse.json(bill);
      }

      case "PAY_BILL": {
        const { id, status } = payload;

        const updated = await prisma.billing.update({
          where: { id },
          data: { status },
        });

        return NextResponse.json(updated);
      }

      // ─────────────────────────────
      // DEFAULT
      // ─────────────────────────────
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}