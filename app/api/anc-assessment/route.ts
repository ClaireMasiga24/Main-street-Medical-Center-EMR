import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// GET — fetch ANC patients (appointments + existing assessments, merged & deduped)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (patientId) {
      // Return assessment history for a specific patient
      const assessments = await prisma.aNCAssessment.findMany({
        where: { patientId: parseInt(patientId) },
        orderBy: { createdAt: "desc" },
        include: { Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true } } },
      });
      return NextResponse.json({ assessments });
    }

    // ── Source 1: ANC Appointments ──────────────────────────────────────
    const ancAppointments = await prisma.appointment.findMany({
      where: {
        department: "Nurse_Midwife",
        OR: [
          { reason: { contains: "ANC", mode: "insensitive" } },
          { reason: { contains: "antenatal", mode: "insensitive" } },
          { reason: { contains: "Antenatal", mode: "insensitive" } },
        ],
        status: { not: "CANCELLED" },
      },
      orderBy: { appointmentDate: "desc" },
      include: {
        Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true, phoneNumber: true, createdAt: true } },
        Staff: { select: { id: true, fullName: true } },
        CreatedBy: { select: { id: true, fullName: true } },
      },
    });

    // ── Source 2: Patients with existing ANC assessments ────────────────
    const ancAssessmentPatients = await prisma.aNCAssessment.findMany({
      orderBy: { createdAt: "desc" },
      distinct: ["patientId"],
      include: {
        Patient: {
          select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true, phoneNumber: true, createdAt: true },
        },
      },
    });

    // ── Merge & deduplicate by patientId ───────────────────────────────
    const seen = new Set<number>();
    const merged: any[] = [];

    // Appointments first (give priority)
    for (const apt of ancAppointments) {
      if (!apt.Patient || seen.has(apt.Patient.id)) continue;
      seen.add(apt.Patient.id);
      merged.push({
        ...apt.Patient,
        source: "appointment",
        appointmentDate: apt.appointmentDate,
        appointmentReason: apt.reason,
        appointmentNotes: apt.notes,
        appointmentStatus: apt.status,
        referredBy: apt.CreatedBy?.fullName || "Receptionist",
        referringDoctorName: apt.Staff?.fullName || null,
      });
    }

    // Then existing assessments
    for (const a of ancAssessmentPatients) {
      if (!a.Patient || seen.has(a.Patient.id)) continue;
      seen.add(a.Patient.id);

      // Fetch latest assessment for this patient
      const latest = await prisma.aNCAssessment.findFirst({
        where: { patientId: a.Patient.id },
        orderBy: { createdAt: "desc" },
      });

      merged.push({
        ...a.Patient,
        source: "assessment",
        referredBy: latest?.referredBy || "System",
        referringDoctorName: latest?.referringDoctorName || null,
        latestAssessment: latest,
      });
    }

    return NextResponse.json({ patients: merged });
  } catch (err) {
    console.error("[anc-assessment GET]", err);
    return NextResponse.json({ error: "Failed to load ANC patients." }, { status: 500 });
  }
}

// POST — save a new ANC assessment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      gestationalAgeWeeks, gravida, para, LMP, EDD,
      fundalHeight, fetalHeartRate, fetalPresentation, fetalMovement,
      bpSystolic, bpDiastolic, maternalWeight,
      urineProtein, urineGlucose, urineNitrites,
      edema, edemaLocation,
      complaints, clinicalNotes,
      nextAppointmentDate, outcome,
      referredBy, referringDoctorName,
      assessedBy, assessedById,
    } = body;

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required." }, { status: 400 });
    }

    const assessment = await prisma.aNCAssessment.create({
      data: {
        patientId: parseInt(patientId),
        gestationalAgeWeeks: gestationalAgeWeeks ? parseInt(gestationalAgeWeeks) : null,
        gravida: gravida ? parseInt(gravida) : null,
        para: para ? parseInt(para) : null,
        LMP: LMP ? new Date(LMP) : null,
        EDD: EDD ? new Date(EDD) : null,
        fundalHeight: fundalHeight ? parseFloat(fundalHeight) : null,
        fetalHeartRate: fetalHeartRate ? parseInt(fetalHeartRate) : null,
        fetalPresentation: fetalPresentation || null,
        fetalMovement: fetalMovement || null,
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
        maternalWeight: maternalWeight ? parseFloat(maternalWeight) : null,
        urineProtein: urineProtein || null,
        urineGlucose: urineGlucose || null,
        urineNitrites: urineNitrites || null,
        edema: edema || null,
        edemaLocation: edemaLocation || null,
        complaints: complaints || null,
        clinicalNotes: clinicalNotes || null,
        nextAppointmentDate: nextAppointmentDate ? new Date(nextAppointmentDate) : null,
        outcome: outcome || null,
        referredBy: referredBy || null,
        referringDoctorName: referringDoctorName || null,
        assessedBy: assessedBy || null,
        assessedById: assessedById ? parseInt(assessedById) : null,
      },
    });

    return NextResponse.json({ success: true, assessment });
  } catch (err) {
    console.error("[anc-assessment POST]", err);
    return NextResponse.json({ error: "Failed to save ANC assessment." }, { status: 500 });
  }
}
