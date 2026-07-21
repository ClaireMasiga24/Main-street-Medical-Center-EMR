import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// PUT /api/encounters/note
// Upsert a ClinicalNote for a doctor on an encounter
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      encounterId,
      authorStaffId,
      authorName,
      historyOfPresentIllness,
      reviewOfOtherSystems,
      pastMedicalHistory,
      physicalExamination,
      diagnosis,
      differentialDiagnosis,
      assessment,
      treatmentPlan,
      notes,
      signature,
    } = body;

    if (!encounterId || !authorStaffId || !authorName) {
      return NextResponse.json(
        {
          error:
            "encounterId, authorStaffId, and authorName are required",
        },
        { status: 400 }
      );
    }

    const note = await prisma.clinicalNote.upsert({
      where: {
        encounterId_authorStaffId: { encounterId, authorStaffId },
      },
      create: {
        encounterId,
        authorStaffId,
        authorName,
        historyOfPresentIllness: historyOfPresentIllness ?? null,
        reviewOfOtherSystems: reviewOfOtherSystems ?? null,
        pastMedicalHistory: pastMedicalHistory ?? null,
        physicalExamination: physicalExamination ?? null,
        diagnosis: diagnosis ?? null,
        differentialDiagnosis: differentialDiagnosis ?? null,
        assessment: assessment ?? null,
        treatmentPlan: treatmentPlan ?? null,
        notes: notes ?? null,
        signature: signature ?? null,
      },
      update: {
        historyOfPresentIllness: historyOfPresentIllness ?? null,
        reviewOfOtherSystems: reviewOfOtherSystems ?? null,
        pastMedicalHistory: pastMedicalHistory ?? null,
        physicalExamination: physicalExamination ?? null,
        diagnosis: diagnosis ?? null,
        differentialDiagnosis: differentialDiagnosis ?? null,
        assessment: assessment ?? null,
        treatmentPlan: treatmentPlan ?? null,
        notes: notes ?? null,
        signature: signature ?? null,
        editedAt: new Date(),
      },
    });

    return NextResponse.json(note);
  } catch (err: any) {
    console.error("[encounters/note PUT]", err);
    return NextResponse.json(
      { error: "Failed to save clinical note." },
      { status: 500 }
    );
  }
}
