import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ error: "patientId query param is required" }, { status: 400 });
    }

    const triage = await prisma.triage.findFirst({
      where: { patientId: parseInt(patientId) },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(triage ?? null);
  } catch (err: any) {
    console.error("[Triage GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId,
      visitId,
      modeOfArrival,
      temperature, bpSystolic, bpDiastolic,
      heartRate, respiratoryRate, spo2,
      weight, height,
      painLevel, painLocation,
      chiefComplaint, allergies, medicalHistory,
      nursingObservations, nursingNotes,
      esiLevel, redFlags,
      triageOutcome, referredTo,
      studyType, clinicalNotes,
      status,
    } = body;

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Save the triage record
    const triage = await prisma.triage.create({
      data: {
        patientId: parseInt(patientId),
        visitId: visitId ? parseInt(visitId) : null,
        modeOfArrival: modeOfArrival ?? null,
        temperature: temperature ?? null,
        bpSystolic: bpSystolic ?? null,
        bpDiastolic: bpDiastolic ?? null,
        heartRate: heartRate ?? null,
        respiratoryRate: respiratoryRate ?? null,
        spo2: spo2 ?? null,
        weight: weight ?? null,
        height: height ?? null,
        painLevel: painLevel ?? null,
        painLocation: painLocation ?? null,
        chiefComplaint: chiefComplaint ?? null,
        allergies: allergies ?? null,
        medicalHistory: medicalHistory ?? null,
        nursingObservations: nursingObservations ?? null,
        nursingNotes: nursingNotes ?? null,
        esiLevel: esiLevel ?? null,
        redFlags: redFlags ? JSON.stringify(redFlags) : null,
        triageOutcome: triageOutcome ?? null,
        referredTo: referredTo ?? null,
        status: status ?? "COMPLETED",
      },
    });

    // If the triage has an outcome, update the patient's currentStatus
    if (triageOutcome) {
      const statusMap: Record<string, string> = {
        SEND_DOCTOR: "AWAITING_DOCTOR",
        EMERGENCY: "AWAITING_DOCTOR",
        OBSERVATION: "IN_CONSULTATION",
        SPECIALIST: "AWAITING_DOCTOR",
        DENTIST: "AWAITING_DENTIST",
        LABORATORY: "AWAITING_LAB",
        RADIOLOGY: "AWAITING_RADIOLOGY",
        DISCHARGE: "DISCHARGED",
      };

      const nextStatus = statusMap[triageOutcome];
      if (nextStatus) {
        await prisma.patient.update({
          where: { id: parseInt(patientId) },
          data: { currentStatus: nextStatus as any },
        });
      }
    }

    // Also update the Visit record with the chief complaint and notes
    if (visitId && chiefComplaint) {
      await prisma.visit.update({
        where: { id: parseInt(visitId) },
        data: {
          symptoms: chiefComplaint,
          notes: nursingNotes ?? undefined,
        },
      });
    }

    // If the outcome is RADIOLOGY, create an imaging request automatically
    if (triageOutcome === "RADIOLOGY") {
      const studyTypeValue = studyType || "ULTRASOUND";
      await prisma.imagingRequest.create({
        data: {
          patientId: parseInt(patientId),
          visitId: visitId ? parseInt(visitId) : null,
          studyType: studyTypeValue,
          priority: "ROUTINE",
          referralSource: "TRIAGE",
          clinicalNotes: clinicalNotes || chiefComplaint || null,
          status: "ORDERED",
        },
      });
    }

    return NextResponse.json(triage, { status: 201 });
  } catch (err: any) {
    console.error("[Triage POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
