import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { currentStatus: "ADMITTED" },
          { sentToTreatmentRoom: true },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        Triage: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        Prescription: {
          orderBy: { createdAt: "desc" },
	          take: 20,
        },
      },
    });

	    const now = Date.now();
	    const enriched = patients.map((p) => {
	      const latestVisit = p.Visit?.[0];
	      const latestTriage = p.Triage?.[0];
	      // Use the latest Visit's creation time as the admission time —
	      // it's set when the doctor completes the consultation/admission.
	      const admissionTime = latestVisit?.createdAt || p.createdAt;
	      const admittedMs = now - new Date(admissionTime).getTime();
	      const admittedDays = Math.floor(admittedMs / 86400000);
	      const admittedHours = Math.floor((admittedMs % 86400000) / 3600000);

		      return {
		        id: p.id,
		        patientNumber: p.patientNumber,
		        firstName: p.firstName,
		        lastName: p.lastName,
		        gender: p.gender,
		        age: p.age,
	        phoneNumber: p.phoneNumber,
	        address: p.address,
	        isEmergency: p.isEmergency,
		        currentStatus: p.currentStatus,
		        inTreatmentRoom: p.sentToTreatmentRoom,
		        updatedAt: p.updatedAt,
		        admittedAt: admissionTime,
		        lengthOfStay: admittedDays > 0
		          ? `${admittedDays}d ${admittedHours}h`
		          : `${admittedHours}h`,
		        diagnosis: latestVisit?.diagnosis || "",
		        historyOfPresentIllness: latestVisit?.historyOfPresentIllness || "",
		        assessment: latestVisit?.assessment || "",
		        treatmentPlan: latestVisit?.treatmentPlan || "",
		        physicalExamination: latestVisit?.physicalExamination || "",
		        notes: latestVisit?.notes || "",
		        pastMedicalHistory: latestVisit?.pastMedicalHistory || "",
		        reviewOfOtherSystems: latestVisit?.reviewOfOtherSystems || "",
		        differentialDiagnosis: latestVisit?.differentialDiagnosis || "",
		        doctorSignature: latestVisit?.doctorSignature || "",
		        symptoms: latestVisit?.symptoms || "",
		        chiefComplaint: latestTriage?.chiefComplaint || latestVisit?.symptoms || "",
		        admittingDoctor: p.admittingDoctorName || latestVisit?.doctorName || "",
		        prescriptions: (p.Prescription || []).map((rx) => ({
		          id: rx.id,
		          medication: rx.medication,
		          dosage: rx.dosage,
		          instructions: rx.instructions,
		          route: rx.route,
		          frequency: rx.frequency,
		        })),
		      };
    });

    return NextResponse.json({ patients: enriched });
  } catch (err) {
    console.error("[doctor/admitted GET]", err);
    return NextResponse.json(
      { error: "Failed to load admitted patients." },
      { status: 500 }
    );
  }
}

// PATCH — update treatment plan for an admitted patient's latest Visit
export async function PATCH(req: NextRequest) {
  try {
    const { patientId, treatmentPlan, staffName, staffId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Find the latest Visit for this patient
    const latestVisit = await prisma.visit.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latestVisit) {
      return NextResponse.json({ error: "No visit found for this patient" }, { status: 404 });
    }

    // Update the Visit's treatmentPlan
    await prisma.visit.update({
      where: { id: latestVisit.id },
      data: { treatmentPlan: treatmentPlan || null },
    });

    // Log to timeline
    await prisma.patientTimeline.create({
      data: {
        patientId,
        action: "TREATMENT_PLAN_UPDATED",
        fromDepartment: "DOCTOR",
        description: `Treatment plan updated by ${staffName || "Doctor"}`,
        performedBy: staffName || "Doctor",
        performedById: staffId || null,
      },
    });

    return NextResponse.json({ success: true, treatmentPlan });
  } catch (err: any) {
    console.error("[doctor/admitted PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
