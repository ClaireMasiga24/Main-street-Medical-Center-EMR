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

    // Also fetch lab communications for this patient
    const labCommunications = await prisma.labCommunication.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ reviews, labRequests, imagingRequests, labCommunications });
  } catch (err) {
    console.error("[doctor/reviews GET]", err);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}

// ─── Notification department name map ──────────────────────────────────────
const DEPT_NOTIFICATION_MAP: Record<string, string> = {
  LAB: "Laboratory",
  NURSE: "Nurse/Midwife",
  RADIOLOGY: "Radiology",
  SONOGRAPHY: "Sonography",
  DENTIST: "Dentist",
};

// POST — create a new review for a patient
export async function POST(req: NextRequest) {
  try {
    const {
      patientId, doctorId, doctorName,
      followUpNotes, examinationFindings, historyOfPresentIllness,
      diagnosis, treatmentPlan,
      labOrders, imagingOrders,
      testCode,
      notifyDepartment,
      dentistReferral,
      dentistNotes,
      isStaffId,
    } = await req.json();

    if (!patientId || !doctorId || !doctorName) {
      return NextResponse.json({ error: "patientId, doctorId, and doctorName are required" }, { status: 400 });
    }

    // Resolve the correct staff ID: doctorId might be a User.id rather than Staff.id.
    // LabRequest.requestedById requires a valid Staff.id.
    // When isStaffId === true (admitted-patient flows), skip resolution entirely.
    let resolvedStaffId = doctorId;
    if (!isStaffId) {
      const staffExists = await prisma.staff.findUnique({ where: { id: doctorId }, select: { id: true } });
      if (!staffExists) {
        // Look up the Staff record linked to this User
        const user = await prisma.user.findUnique({
          where: { id: doctorId },
          select: { Staff: { select: { id: true } } },
        });
        if (user?.Staff) {
          resolvedStaffId = user.Staff.id;
        } else {
          // Last resort: find the Staff record by name
          const staffByName = await prisma.staff.findFirst({
            where: { fullName: { contains: doctorName, mode: "insensitive" } },
            select: { id: true },
          });
          if (staffByName) resolvedStaffId = staffByName.id;
        }
      }
    }

    // 1. Create the review (skip if this is purely a referral with no clinical fields)
    const hasClinicalFields = followUpNotes || examinationFindings || historyOfPresentIllness || diagnosis || treatmentPlan;
    let review: any = null;
    if (hasClinicalFields || labOrders?.length || imagingOrders?.length || dentistReferral) {
      review = await prisma.patientReview.create({
        data: {
          patientId,
          doctorId,
          doctorName,
          followUpNotes: followUpNotes || null,
          examinationFindings: examinationFindings || null,
          historyOfPresentIllness: historyOfPresentIllness || null,
          diagnosis: diagnosis || null,
          treatmentPlan: treatmentPlan || null,
          labOrders: labOrders?.length ? JSON.stringify(labOrders) : null,
          imagingOrders: imagingOrders?.length ? JSON.stringify(imagingOrders) : null,
        },
      });
    }

    // 2. Create LabRequest records for each ordered lab test (batch create)
    let labCount = 0;
    let createdLabRequests: any[] = [];
    if (labOrders?.length) {
      const labData = labOrders.map((name: string, i: number) => ({
        patientId,
        requestedById: resolvedStaffId,
        testName: name,
        testCode: testCode?.[i] || null,
        priority: "ROUTINE",
        referralSource: "Doctor",
        clinicalNotes: followUpNotes || null,
        status: "PENDING" as const,
      }));
      createdLabRequests = await prisma.labRequest.createManyAndReturn({ data: labData });
      labCount = labOrders.length;
    }

    // 3. Create ImagingRequest records for each ordered imaging study (batch create)
    let imagingCount = 0;
    let createdImagingRequests: any[] = [];
    if (imagingOrders?.length) {
      const imgData = imagingOrders.map((studyType: string) => {
        const mappedStudy = studyType.toUpperCase().includes("X-RAY") ? "X_RAY" :
                            studyType.toUpperCase().includes("ULTRASOUND") ? "ULTRASOUND" :
                            studyType.toUpperCase().includes("CT") ? "CT_SCAN" :
                            studyType.toUpperCase().includes("MRI") ? "MRI" :
                            studyType.toUpperCase().includes("MAMMO") ? "MAMMOGRAPHY" : studyType;
        return {
          patientId,
          requestedById: resolvedStaffId,
          studyType: mappedStudy,
          priority: "ROUTINE",
          referralSource: "Doctor",
          clinicalNotes: followUpNotes || null,
          status: "ORDERED",
        };
      });
      createdImagingRequests = await prisma.imagingRequest.createManyAndReturn({ data: imgData });
      imagingCount = imagingOrders.length;
    }

    // 4. Create notifications (deduplicated — skip notifyDepartment if already covered by labCount/imagingCount)
    const alreadyNotified = new Set<string>();
    if (labCount > 0) {
      await prisma.notification.create({
        data: {
          department: "Laboratory",
          patientId,
          title: "New Lab Orders from Doctor",
          message: `Dr. ${doctorName} ordered ${labCount} test(s) for patient`,
          type: "RESULT_READY",
        },
      });
      alreadyNotified.add("Laboratory");
    }
    if (imagingCount > 0) {
      const imgDept = notifyDepartment && DEPT_NOTIFICATION_MAP[notifyDepartment]
        ? DEPT_NOTIFICATION_MAP[notifyDepartment]
        : "Radiology";
      await prisma.notification.create({
        data: {
          department: imgDept,
          patientId,
          title: "New Imaging Orders from Doctor",
          message: `Dr. ${doctorName} ordered ${imagingCount} study/studies for patient`,
          type: "RESULT_READY",
        },
      });
      alreadyNotified.add(imgDept);
    }
    if (notifyDepartment) {
      const deptName = DEPT_NOTIFICATION_MAP[notifyDepartment] || notifyDepartment;
      // Skip if this department was already notified via labCount or imagingCount
      if (!alreadyNotified.has(deptName)) {
        let title = "Patient referred";
        let message = followUpNotes || `Dr. ${doctorName} sent patient to ${deptName}`;

        if (notifyDepartment === "LAB") {
          title = "New Lab Orders";
        } else if (notifyDepartment === "RADIOLOGY" || notifyDepartment === "SONOGRAPHY") {
          title = "New Imaging Orders";
        } else if (notifyDepartment === "DENTIST") {
          title = "Dental Referral";
          message = dentistNotes || followUpNotes || `Dr. ${doctorName} referred patient to Dentist`;
        } else if (notifyDepartment === "NURSE") {
          title = "Patient sent for monitoring";
        }

        await prisma.notification.create({
          data: { department: deptName, patientId, title, message, type: "RESULT_READY" },
        });
      }
    }

    // 5. Log to timeline
    let timelineAction = "PROCEDURE";
    let timelineDesc = `Dr. ${doctorName} performed a review`;

    if (labCount > 0) {
      timelineAction = "LAB_ORDER";
      timelineDesc = `Dr. ${doctorName} ordered ${labCount} lab test(s)`;
    }
    if (imagingCount > 0) {
      timelineAction = "IMAGING_ORDER";
      timelineDesc = `Dr. ${doctorName} ordered ${imagingCount} imaging study/studies`;
    }
    if (dentistReferral || notifyDepartment === "DENTIST") {
      timelineAction = "REFERRAL";
      timelineDesc = `Dr. ${doctorName} referred patient to Dentist`;
    }
    if (notifyDepartment === "NURSE" && labCount === 0 && imagingCount === 0 && !dentistReferral) {
      timelineAction = "REFERRAL";
      timelineDesc = `Dr. ${doctorName} sent patient to Nurse/Midwife for monitoring`;
    }

    await prisma.patientTimeline.create({
      data: {
        patientId,
        action: timelineAction,
        fromDepartment: "DOCTOR",
        toDepartment: notifyDepartment
          ? (notifyDepartment === "LAB" ? "LAB" :
             notifyDepartment === "RADIOLOGY" ? "RADIOLOGY" :
             notifyDepartment === "SONOGRAPHY" ? "SONOGRAPHY" :
             notifyDepartment === "DENTIST" ? "DENTIST" :
             notifyDepartment === "NURSE" ? "NURSE" : notifyDepartment)
          : null,
        description: timelineDesc,
        metadata: JSON.stringify({
          reviewId: review?.id || null,
          labCount,
          imagingCount,
          notifyDepartment: notifyDepartment || null,
          dentistReferral: dentistReferral || false,
        }),
        performedBy: doctorName,
        performedById: doctorId,
      },
    });

    const result = { review, labCount, imagingCount, createdLabRequests, createdImagingRequests };

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[doctor/reviews POST]", err);
    return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
  }
}
