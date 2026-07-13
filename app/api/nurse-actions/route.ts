import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// GET — fetch all nurse actions for a patient
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = parseInt(searchParams.get("patientId") || "");
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const actions = await prisma.nurseAction.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ actions });
  } catch (err) {
    console.error("[nurse-actions GET]", err);
    return NextResponse.json({ error: "Failed to load nurse actions." }, { status: 500 });
  }
}

// POST — save a batch of nurse actions (treatment entries + optional comment)
export async function POST(req: NextRequest) {
  try {
    const { patientId, treatments, notes, performedBy } = await req.json();

    if (!patientId || !performedBy) {
      return NextResponse.json({ error: "patientId and performedBy are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created: any[] = [];

      // Save each treatment entry
      if (treatments?.length) {
        for (const t of treatments) {
          const action = await tx.nurseAction.create({
            data: {
              patientId,
              medication: t.drug || t.medication || null,
              dose: t.dose || null,
              route: t.route || null,
              timeAdministered: t.time ? new Date(`${t.date || new Date().toISOString().split("T")[0]}T${t.time}:00`) : null,
              notes: null, // individual treatment entries don't get the main notes field
              performedBy,
            },
          });
          created.push(action);
        }
      }

      // Save a separate note entry for free-text nurse comments
      if (notes?.trim()) {
        const note = await tx.nurseAction.create({
          data: {
            patientId,
            notes: notes.trim(),
            performedBy,
          },
        });
        created.push(note);
      }

      return { count: created.length };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[nurse-actions POST]", err);
    return NextResponse.json({ error: "Failed to save nurse actions." }, { status: 500 });
  }
}
