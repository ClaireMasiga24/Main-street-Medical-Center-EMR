import { NextResponse } from "next/server";
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
	        isEmergency: p.isEmergency,
	        currentStatus: p.currentStatus,
	        inTreatmentRoom: p.sentToTreatmentRoom,
	        updatedAt: p.updatedAt,
	        admittedAt: admissionTime,
	        lengthOfStay: admittedDays > 0
	          ? `${admittedDays}d ${admittedHours}h`
	          : `${admittedHours}h`,
	        diagnosis: latestVisit?.diagnosis || "",
	        assessment: latestVisit?.assessment || "",
	        treatmentPlan: latestVisit?.treatmentPlan || "",
	        chiefComplaint: latestTriage?.chiefComplaint || latestVisit?.symptoms || "",
	        admittingDoctor: latestVisit?.notes || "",
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
