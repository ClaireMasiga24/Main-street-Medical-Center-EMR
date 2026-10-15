import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// POST /api/doctor/draft
//
// Autosave target for the consultation stepper. Writes ONLY the attending
// clinician's ClinicalNote. It never creates a Visit, never touches
// prescriptions, orders, notifications or patient status — /api/doctor owns
// all of that and runs once, on Finalize Encounter.
//
// The field set and the `|| null` coercion deliberately match the ClinicalNote
// upsert in /api/doctor so a draft and a finalized encounter produce byte-
// identical note state.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      encounterId,
      // The consultation panel sends the attending clinician as
      // activeStaffId / activeStaffName; older callers use staffId / staffName.
      staffId: rawStaffId,
      staffName: rawStaffName,
      activeStaffId,
      activeStaffName,
      symptoms,
      historyOfPresentIllness,
      pastMedicalHistory,
      reviewOfOtherSystems,
      physicalExamination,
      diagnosis,
      differentialDiagnosis,
      assessment,
      treatmentPlan,
      notes,
      doctorSignature,
      signature,
    } = body;

    const authorStaffId = rawStaffId ?? activeStaffId;
    const authorName = rawStaffName ?? activeStaffName;

    if (!encounterId || !authorStaffId || !authorName) {
      return NextResponse.json(
        {
          error:
            "encounterId, staffId and staffName are required to save a draft. " +
            "Without staffId the clinical note cannot be attributed to a clinician.",
        },
        { status: 400 }
      );
    }

    // The DB column is `signature`; the form field is `doctorSignature`.
    const fields = {
      symptoms: symptoms || null,
      historyOfPresentIllness: historyOfPresentIllness || null,
      pastMedicalHistory: pastMedicalHistory || null,
      reviewOfOtherSystems: reviewOfOtherSystems || null,
      physicalExamination: physicalExamination || null,
      diagnosis: diagnosis || null,
      differentialDiagnosis: differentialDiagnosis || null,
      assessment: assessment || null,
      treatmentPlan: treatmentPlan || null,
      notes: notes || null,
      signature: doctorSignature || signature || null,
    };

    const note = await prisma.clinicalNote.upsert({
      where: {
        encounterId_authorStaffId: {
          encounterId,
          authorStaffId,
        },
      },
      create: {
        encounterId,
        authorStaffId,
        authorName,
        ...fields,
      },
      update: {
        ...fields,
        editedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: note.id,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[doctor draft POST]", err);
    return NextResponse.json(
      { error: "Failed to save the clinical note draft." },
      { status: 500 }
    );
  }
}
