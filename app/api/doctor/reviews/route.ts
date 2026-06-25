import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET — fetch all reviews for a patient
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = parseInt(searchParams.get("patientId") || "");
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const reviews = await prisma.patientReview.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch pending/completed labs and imaging for this patient
    const labRequests = await prisma.labRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const imagingRequests = await prisma.imagingRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ reviews, labRequests, imagingRequests });
  } catch (err) {
    console.error("[doctor/reviews GET]", err);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}

// POST — create a new review for a patient
export async function POST(req: NextRequest) {
  try {
    const {
      patientId, doctorId, doctorName,
      followUpNotes, examinationFindings,
      diagnosis, treatmentPlan,
      labOrders, imagingOrders,
      notifyDepartment,
    } = await req.json();

    if (!patientId || !doctorId || !doctorName) {
      return NextResponse.json({ error: "patientId, doctorId, and doctorName are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the review
      const review = await tx.patientReview.create({
        data: {
          patientId,
          doctorId,
          doctorName,
          followUpNotes: followUpNotes || null,
          examinationFindings: examinationFindings || null,
          diagnosis: diagnosis || null,
          treatmentPlan: treatmentPlan || null,
          labOrders: labOrders?.length ? JSON.stringify(labOrders) : null,
          imagingOrders: imagingOrders?.length ? JSON.stringify(imagingOrders) : null,
        },
      });

      // 2. Create LabRequest records for each ordered lab test
      const createdLabRequests: any[] = [];
      if (labOrders?.length) {
        for (const testName of labOrders) {
          const lab = await tx.labRequest.create({
            data: {
              patientId,
              requestedById: doctorId,
              testName,
              priority: "URGENT",
              referralSource: "Doctor",
              clinicalNotes: followUpNotes || null,
              status: "PENDING",
            },
          });
          createdLabRequests.push(lab);
        }
      }

      // 3. Create ImagingRequest records for each ordered imaging study
      const createdImagingRequests: any[] = [];
      if (imagingOrders?.length) {
        for (const studyType of imagingOrders) {
          const mappedStudy = studyType.toUpperCase().includes("X-RAY") ? "X_RAY" :
                              studyType.toUpperCase().includes("ULTRASOUND") ? "ULTRASOUND" :
                              studyType.toUpperCase().includes("CT") ? "CT_SCAN" :
                              studyType.toUpperCase().includes("MRI") ? "MRI" :
                              studyType.toUpperCase().includes("MAMMO") ? "MAMMOGRAPHY" : "X_RAY";
          const img = await tx.imagingRequest.create({
            data: {
              patientId,
              requestedById: doctorId,
              studyType: mappedStudy,
              priority: "URGENT",
              referralSource: "Doctor",
              clinicalNotes: followUpNotes || null,
              status: "ORDERED",
            },
          });
          createdImagingRequests.push(img);
        }
      }

      // 4. Create notifications for the target departments
      if (createdLabRequests.length > 0) {
        await tx.notification.create({
          data: {
            department: "Laboratory",
            title: "New Lab Orders from Doctor",
            message: `Dr. ${doctorName} ordered ${createdLabRequests.length} test(s) for patient`,
            type: "RESULT_READY",
          },
        });
      }
      if (createdImagingRequests.length > 0) {
        await tx.notification.create({
          data: {
            department: "Radiology",
            title: "New Imaging Orders from Doctor",
            message: `Dr. ${doctorName} ordered ${createdImagingRequests.length} study/studies for patient`,
            type: "RESULT_READY",
          },
        });
      }

      // 5. Create notification for the target department (e.g. Nurse/Midwife)
      if (notifyDepartment) {
        const deptName = notifyDepartment === "NURSE" ? "Nurse/Midwife" : notifyDepartment;
        await tx.notification.create({
          data: {
            department: deptName,
            title: "Patient sent for monitoring",
            message: `${followUpNotes || `Dr. ${doctorName} sent patient for monitoring`}`,
            type: "RESULT_READY",
          },
        });
      }

      // 6. Log to timeline
      const timelineDesc = notifyDepartment === "NURSE"
        ? `Dr. ${doctorName} sent patient to Nurse/Midwife for monitoring`
        : `Dr. ${doctorName} performed a review — ${createdLabRequests.length} lab(s), ${createdImagingRequests.length} imaging(s) ordered`;

      await tx.patientTimeline.create({
        data: {
          patientId,
          action: notifyDepartment === "NURSE" ? "REFERRAL" : "PROCEDURE",
          fromDepartment: "DOCTOR",
          description: timelineDesc,
          metadata: JSON.stringify({
            reviewId: review.id,
            labCount: createdLabRequests.length,
            imagingCount: createdImagingRequests.length,
            notifyDepartment: notifyDepartment || null,
          }),
          performedBy: doctorName,
          performedById: doctorId,
        },
      });

      return { review, labCount: createdLabRequests.length, imagingCount: createdImagingRequests.length };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[doctor/reviews POST]", err);
    return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
  }
}
