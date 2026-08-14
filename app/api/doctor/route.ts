import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { PatientStatus, Prisma } from "@prisma/client";
import { createNotification } from "../../lib/notifications";
import {
  ROUTE_TO_ENCOUNTER,
  routeEncounterToDept,
  closeEncounter,
} from "../../lib/encounterUtils";

const ROUTE_TO_STATUS: Record<string, PatientStatus> = {
  LAB:         "AWAITING_LAB",
  SONOGRAPHY:  "AWAITING_SONOGRAPHY",
  RADIOLOGY:   "AWAITING_RADIOLOGY",
  NURSE:       "AWAITING_TRIAGE",
  PHARMACY:    "AWAITING_PHARMACY",
  CASHIER:     "AWAITING_CASHIER",
  DISCHARGE:   "DISCHARGED",
  ADMIT:       "ADMITTED",
  DENTIST:     "AWAITING_DENTIST",
  TREATMENT:   "ADMITTED",
  SEND_ORDERS: "IN_CONSULTATION",
  SHARE:       "IN_CONSULTATION", // share doesn't change status
};

// GET — fetch patients waiting for the doctor or already in consultation
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
      orderBy: [
        { isEmergency: "desc" },
        { updatedAt: "asc" },
      ],
      include: {
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(patients);
  } catch (err) {
    console.error("[doctor GET]", err);
    return NextResponse.json({ error: "Failed to load patients." }, { status: 500 });
  }
}

// POST — complete consultation
export async function POST(req: NextRequest) {
  try {
    const {
      patientId,
      encounterId, // new: optional encounter ID
      staffId,
      staffName,
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
      prescriptions,
      labRequests,
      imagingOrders,
      routeTo,
      action,
      procedureName,
      procedureNotes,
      treatmentFollowUp,
      performedBy,
      // Share-specific fields
      shareTargets,
    } = await req.json();

    // ── SAVE_PROCEDURE action ──
    if (action === "SAVE_PROCEDURE") {
      if (!patientId || !procedureName || !procedureNotes) {
        return NextResponse.json({ error: "Missing required fields: patientId, procedureName, procedureNotes." }, { status: 400 });
      }
      const procedure = await prisma.medicalProcedure.create({
        data: {
          patientId,
          procedureName,
          procedureNotes,
          treatmentFollowUp: treatmentFollowUp || null,
          performedBy: performedBy || staffName || "Doctor",
        },
      });
      return NextResponse.json({ success: true, procedure });
    }

    if (!patientId || !routeTo || !(routeTo in ROUTE_TO_STATUS)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const performerName = staffName || "Doctor";

    // Resolve the correct staff ID: staffId might be a User.id rather than Staff.id.
    // LabRequest.requestedById requires a valid Staff.id.
    let resolvedStaffId = staffId;
    if (resolvedStaffId) {
      const staffExists = await prisma.staff.findUnique({ where: { id: resolvedStaffId }, select: { id: true } });
      if (!staffExists) {
        const user = await prisma.user.findUnique({
          where: { id: resolvedStaffId },
          select: { Staff: { select: { id: true } } },
        });
        if (user?.Staff) {
          resolvedStaffId = user.Staff.id;
        } else {
          const staffByName = await prisma.staff.findFirst({
            where: { fullName: { contains: staffName, mode: "insensitive" } },
            select: { id: true },
          });
          if (staffByName) resolvedStaffId = staffByName.id;
        }
      }
    }

    // ── Admitted patient routing ──
    let effectiveRoute = routeTo;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { currentStatus: true },
    });

    if (patient?.currentStatus === "ADMITTED" && routeTo !== "DISCHARGE") {
      if (routeTo === "NURSE") effectiveRoute = "TREATMENT";
    }

	  const { visit } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.visit.create({
        data: {
          patientId,
          symptoms:              symptoms              || null,
          historyOfPresentIllness: historyOfPresentIllness || null,
          pastMedicalHistory:    pastMedicalHistory    || null,
          reviewOfOtherSystems:  reviewOfOtherSystems  || null,
          physicalExamination:   physicalExamination   || null,
          diagnosis:             diagnosis             || null,
          differentialDiagnosis: differentialDiagnosis || null,
          assessment:            assessment            || null,
          treatmentPlan:         treatmentPlan         || null,
          notes:                 notes                 || null,
          doctorSignature:       doctorSignature       || null,
          doctorId:              staffId                || null,
          doctorName:            staffName              || null,
        },
      });

      // ── Upsert ClinicalNote if encounterId is provided ──
      if (encounterId && staffId && staffName) {
        await tx.clinicalNote.upsert({
          where: {
            encounterId_authorStaffId: {
              encounterId,
              authorStaffId: staffId,
            },
          },
          create: {
            encounterId,
            authorStaffId: staffId,
            authorName: staffName,
            symptoms: symptoms || null,
            historyOfPresentIllness: historyOfPresentIllness || null,
            reviewOfOtherSystems: reviewOfOtherSystems || null,
            pastMedicalHistory: pastMedicalHistory || null,
            physicalExamination: physicalExamination || null,
            diagnosis: diagnosis || null,
            differentialDiagnosis: differentialDiagnosis || null,
            assessment: assessment || null,
            treatmentPlan: treatmentPlan || null,
            notes: notes || null,
            signature: doctorSignature || null,
          },
          update: {
            symptoms: symptoms || null,
            historyOfPresentIllness: historyOfPresentIllness || null,
            reviewOfOtherSystems: reviewOfOtherSystems || null,
            pastMedicalHistory: pastMedicalHistory || null,
            physicalExamination: physicalExamination || null,
            diagnosis: diagnosis || null,
            differentialDiagnosis: differentialDiagnosis || null,
            assessment: assessment || null,
            treatmentPlan: treatmentPlan || null,
            notes: notes || null,
            signature: doctorSignature || null,
            editedAt: new Date(),
          },
        });
      }

      if (prescriptions?.length) {
        await tx.prescription.createMany({
          data: prescriptions.map((p: { medication: string; dosage: string; instructions: string; route?: string; frequency?: string; givenAt?: string; nextDose?: string }) => ({
            patientId,
            visitId:      visit.id,
            medication:   p.medication,
            dosage:       p.dosage,
            instructions: p.instructions,
            route:        p.route || null,
            frequency:    p.frequency || null,
            givenAt:      p.givenAt || null,
            nextDose:     p.nextDose || null,
          })),
        });
      }

      if (labRequests?.length && resolvedStaffId) {
        await tx.labRequest.createMany({
          data: labRequests.map((l: { testName: string }) => ({
            patientId,
            encounterId: encounterId || null,
            visitId:       visit.id,
            requestedById: resolvedStaffId,
            testName:      l.testName,
            referralSource: "Doctor",
            status:        "PENDING",
          })),
        });
      }

      // Fallback "Pending Lab Workup"
      if (effectiveRoute === "LAB" && (!labRequests?.length || !resolvedStaffId)) {
        let docStaffId = resolvedStaffId;
        if (!docStaffId) {
          const fallbackStaff = await tx.staff.findFirst({ orderBy: { id: "asc" } });
          docStaffId = fallbackStaff?.id;
        }
        if (docStaffId) {
          const existingOrders = await tx.labRequest.findMany({
            where: { patientId, status: "PENDING" },
            take: 1,
          });
          if (existingOrders.length === 0) {
            await tx.labRequest.create({
              data: {
                patientId,
                encounterId: encounterId || null,
                visitId: visit.id,
                requestedById: docStaffId,
                testName: "Pending Lab Workup",
                referralSource: "Doctor",
                status: "PENDING",
              },
            });
          }
        }
      }

      // Create imaging request if routing to SONOGRAPHY or RADIOLOGY
      if (effectiveRoute === "SONOGRAPHY" || effectiveRoute === "RADIOLOGY") {
        await tx.imagingRequest.create({
          data: {
            patientId,
            encounterId: encounterId || null,
            visitId:        visit.id,
            requestedById:  staffId ?? undefined,
            studyType:      effectiveRoute === "SONOGRAPHY" ? "ULTRASOUND" : "X_RAY",
            priority:       "ROUTINE",
            referralSource: "DOCTOR",
            clinicalNotes:  symptoms || null,
            status:         "ORDERED",
          },
        });
      }

      // ── Notify relevant departments for SEND_ORDERS ──
      if (effectiveRoute === "SEND_ORDERS") {
        const patientInfo = await tx.patient.findUnique({
          where: { id: patientId },
          select: { firstName: true, lastName: true, patientNumber: true },
        });
        const patName = patientInfo
          ? `${patientInfo.firstName} ${patientInfo.lastName} (${patientInfo.patientNumber})`
          : `Patient #${patientId}`;

        if (labRequests?.length) {
          await tx.notification.create({
            data: {
              department: "LAB",
              title: "New Lab Orders",
              message: `Dr. ${performerName} ordered ${labRequests.length} test(s) for ${patName}`,
              type: "LAB_ORDER",
              patientId,
            },
          });
        }

        if (prescriptions?.length) {
          await tx.notification.create({
            data: {
              department: "PHARMACY",
              title: "New Prescriptions",
              message: `Dr. ${performerName} prescribed ${prescriptions.length} medication(s) for ${patName}`,
              type: "RX_ORDER",
              patientId,
            },
          });
        }

        // Create imaging/sonography orders without routing patient away
        if (imagingOrders?.length && staffId) {
          await tx.imagingRequest.create({
            data: {
              patientId,
              encounterId: encounterId || null,
              visitId: visit.id,
              requestedById: staffId,
              studyType: imagingOrders[0] || "ULTRASOUND",
              priority: "ROUTINE",
              referralSource: "DOCTOR",
              clinicalNotes: symptoms || null,
              status: "ORDERED",
            },
          });
          await tx.notification.create({
            data: {
              department: "Sonography",
              title: "New Sonography Order",
              message: `Dr. ${performerName} ordered ${imagingOrders.length} scan(s) for ${patName}`,
              type: "IMAGING_ORDER",
              patientId,
            },
          });
        }
      }

      // ── SHARE action: send to share targets (no status change) ──
      if (effectiveRoute === "SHARE" && shareTargets?.length) {
        for (const target of shareTargets) {
          const deptMap: Record<string, string> = {
            RECEPTION: "Reception",
            NURSE: "Nurse/Midwife",
            SONOGRAPHY: "Sonography",
          };
          await tx.notification.create({
            data: {
              department: deptMap[target] || target,
              title: "Clinical Results Shared",
              message: `Dr. ${performerName} shared consultation results.`,
              type: "RESULT_SHARED",
              patientId,
            },
          });
        }
      }

      // ── Determine what status to set ──
      const isAdmitted = patient?.currentStatus === "ADMITTED";
      const newStatus = isAdmitted
        ? (effectiveRoute === "DISCHARGE" ? "DISCHARGED" : "ADMITTED" as PatientStatus)
        : ROUTE_TO_STATUS[effectiveRoute];

      const goingToTreatment = effectiveRoute === "TREATMENT" || (isAdmitted && effectiveRoute === "NURSE");
      const beingAdmitted = effectiveRoute === "ADMIT";
      const beingDischarged = effectiveRoute === "DISCHARGE";
      const updateData: any = { currentStatus: newStatus };
      if (goingToTreatment) updateData.sentToTreatmentRoom = true;
      if (beingDischarged) updateData.sentToTreatmentRoom = false;
      if (beingAdmitted) {
        updateData.admittingDoctorName = staffName || "Doctor";
        updateData.admittingDoctorId = staffId || null;
      }

      await tx.patient.update({
        where: { id: patientId },
        data:  updateData,
      });

      // ── Update Encounter if encounterId is provided and not SHARE ──
      if (encounterId) {
        if (effectiveRoute === "ADMIT" || effectiveRoute === "DISCHARGE") {
          await closeEncounter(encounterId, tx);
        } else if (effectiveRoute === "SHARE") {
          // Share doesn't change encounter state
        } else {
          const encounterRoute = ROUTE_TO_ENCOUNTER[effectiveRoute];
          if (encounterRoute) {
            await routeEncounterToDept(encounterId, encounterRoute.dept, encounterRoute.status, tx);
          }
        }
      }

	      return { visit };
	  }, { maxWait: 15000, timeout: 15000 });

	  // ── Log to PatientTimeline (outside transaction — audit trail, not critical) ──
	  const actionLabel =
	    effectiveRoute === "ADMIT" ? "ADMITTED" :
	    effectiveRoute === "CASHIER" ? "FINISHED" :
	    effectiveRoute === "DISCHARGE" ? "DISCHARGED" :
	    effectiveRoute === "TREATMENT" ? "SENT TO TREATMENT ROOM" :
	    effectiveRoute === "SEND_ORDERS" ? "ORDERS_SENT" :
	    effectiveRoute === "SHARE" ? "SHARED" : "REFERRED";

	  try {
	    await prisma.patientTimeline.create({
	      data: {
	        patientId,
	        action:        "CONSULTATION_END",
	        fromDepartment: "DOCTOR",
	        toDepartment:   effectiveRoute === "ADMIT" ? "WARD" :
	                        effectiveRoute === "CASHIER" ? "CASHIER" :
	                        effectiveRoute === "DISCHARGE" ? "DISCHARGE" :
	                        effectiveRoute === "TREATMENT" ? "TREATMENT_ROOM" :
	                        effectiveRoute === "SEND_ORDERS" ? "MULTIPLE" :
	                        effectiveRoute === "SHARE" ? "SHARE" :
	                        effectiveRoute === "REFERRAL" && labRequests?.length ? "LAB" : effectiveRoute,
	        description:   effectiveRoute === "SEND_ORDERS"
	          ? `Orders sent — ${labRequests?.length || 0} lab test(s), ${prescriptions?.length || 0} prescription(s). Diagnosis: ${diagnosis || "N/A"}`
	          : effectiveRoute === "SHARE"
	            ? `Results shared with ${(shareTargets || []).join(", ") || "departments"}`
	            : `Consultation completed — ${actionLabel}. Diagnosis: ${diagnosis || "Not yet diagnosed"}`,
	        metadata:      JSON.stringify({
	          visitId:       visit.id,
	          encounterId,
	          diagnosis,
	          treatmentPlan,
	          prescriptionCount: prescriptions?.length || 0,
	          labCount:          labRequests?.length || 0,
	          routeTo: effectiveRoute,
	          shareTargets: shareTargets || [],
	        }),
	        performedBy:   performerName,
	        performedById: staffId || null,
	      },
	    });

	    await prisma.patientTimeline.create({
	      data: {
	        patientId,
	        action:        "STATUS_CHANGE",
	        fromDepartment: "AWAITING_DOCTOR",
	        toDepartment:   "CONSULTATION",
	        description:   `Consultation began with Dr. ${performerName}`,
	        performedBy:   performerName,
	        performedById: staffId || null,
	      },
	    });
	  } catch (timelineErr) {
	    console.error("[doctor POST] timeline log failed (non-critical)", timelineErr);
	  }

	  return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[doctor POST]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

// PATCH — begin consultation
export async function PATCH(req: NextRequest) {
  try {
    const { patientId, encounterId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Update Patient status (backward compat)
    await prisma.patient.update({
      where: { id: patientId },
      data:  { currentStatus: "IN_CONSULTATION" },
    });

    // Update Encounter status if encounterId provided
    if (encounterId) {
      await prisma.encounter.update({
        where: { id: encounterId },
        data:  { currentStatus: "IN_CONSULTATION" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[doctor PATCH]", err);
    return NextResponse.json({ error: "Failed to start consultation." }, { status: 500 });
  }
}
