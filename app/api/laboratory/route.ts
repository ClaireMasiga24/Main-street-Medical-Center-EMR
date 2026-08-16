import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { createNotification, sendLabNotificationEmail, labResultEmailHtml, getDepartmentEmails } from "../../lib/notifications";

// ─── GET: Fetch lab requests ──────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    const patientId = url.searchParams.get("patientId");
    const status = url.searchParams.get("status");

    // Single request with full details
    if (id) {
      const request = await prisma.labRequest.findUnique({
        where: { id: parseInt(id) },
        include: {
          Patient: { select: { patientNumber: true, firstName: true, lastName: true, age: true, ageUnit: true, gender: true, phoneNumber: true, address: true, isEmergency: true } },
          Staff: { select: { fullName: true, department: true } },
          Visit: { select: { symptoms: true, diagnosis: true, notes: true } },
          CriticalNotifications: { orderBy: { createdAt: "desc" } },
          LabCommunications: { orderBy: { createdAt: "desc" }, take: 20 },
          ResultShares: { orderBy: { sharedAt: "desc" }, take: 10 },
        },
      });
      if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(request);
    }

    // Patient lab history
    if (action === "patient_history" && patientId) {
      const history = await prisma.labRequest.findMany({
        where: { patientId: parseInt(patientId) },
        include: {
          Staff: { select: { fullName: true, department: true } },
          Visit: { select: { diagnosis: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ success: true, history });
    }

    // Critical notifications
    if (action === "critical_notifications") {
      const notifications = await prisma.criticalNotification.findMany({
        include: {
          LabRequest: { select: { testName: true, specimenId: true } },
          Patient: { select: { patientNumber: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, notifications });
    }

    // Lightweight clinical summary for the lab workflow. The technician only
    // needs the recent consultations' diagnosis/assessment/notes — NOT the
    // full patient-history payload (13 queries), which serializes to seconds
    // on Supabase's pgBouncer single connection. 2 queries, sub-second.
    if (action === "clinical_summary" && patientId) {
      const pid = parseInt(patientId);
      const [visits, latestReview] = await Promise.all([
        prisma.visit.findMany({
          where: { patientId: pid },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            symptoms: true,
            diagnosis: true,
            assessment: true,
            notes: true,
            createdAt: true,
          },
        }),
        prisma.patientReview.findFirst({
          where: { patientId: pid },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            diagnosis: true,
            followUpNotes: true,
            createdAt: true,
          },
        }),
      ]);
      return NextResponse.json({ success: true, data: { visits, review: latestReview } });
    }

    // Communications
    if (action === "communications") {
      const communications = await prisma.labCommunication.findMany({
        include: {
          LabRequest: { select: { testName: true, specimenId: true } },
          Patient: { select: { patientNumber: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, communications });
    }

    // Performance statistics
    if (action === "stats") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [totalToday, pending, completed, rejected, critical, urgent, completedRequests, deptData] = await Promise.all([
        prisma.labRequest.count({ where: { createdAt: { gte: today } } }),
        prisma.labRequest.count({ where: { status: "PENDING" } }),
        prisma.labRequest.count({ where: { status: "COMPLETED" } }),
        prisma.labRequest.count({ where: { specimenRejected: true } }),
        prisma.labRequest.count({ where: { isCritical: true } }),
        prisma.labRequest.count({ where: { priority: { in: ["URGENT", "STAT"] }, status: { notIn: ["COMPLETED", "REJECTED"] } } }),
        prisma.labRequest.findMany({
          where: { createdAt: { gte: today }, status: "COMPLETED", validatedAt: { not: null } },
          select: { createdAt: true, validatedAt: true },
        }),
        prisma.labRequest.groupBy({ by: ["referralSource"], _count: true }),
      ]);

      let avgTatMinutes = 0;
      if (completedRequests.length > 0) {
        const total = completedRequests.reduce((sum, r) => {
          if (r.createdAt && r.validatedAt) return sum + (r.validatedAt.getTime() - r.createdAt.getTime()) / 60000;
          return sum;
        }, 0);
        avgTatMinutes = Math.round(total / completedRequests.length);
      }

      return NextResponse.json({
        success: true,
        stats: { totalToday, pending, completed, rejected, critical, urgent, avgTatMinutes, departments: deptData },
      });
    }

    // Default: fetch all requests
    const allParam = url.searchParams.get("all");
    const where: Prisma.LabRequestWhereInput = {};
    if (status) where.status = status as any;

    let requests = await prisma.labRequest.findMany({
      take: allParam === "true" ? undefined : 500,
      where,
      include: {
        Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, ageUnit: true, gender: true, isEmergency: true } },
        Staff: { select: { fullName: true, department: true } },
      },
      orderBy: [{ isCritical: "desc" }, { createdAt: "desc" }],
    });

    // ── Self-heal orphan AWAITING_LAB patients ───────────────────────────
    // Safety net: any patient whose currentStatus is AWAITING_LAB but who has
    // NO LabRequest record will be invisible in the laboratory view. This
    // auto-creates a "Pending Lab Workup" entry so they appear. Covers edge
    // cases from triage, dental, nurse-share, or any other path that may have
    // set the status without creating the corresponding LabRequest.
    if (!status && !action) {
      const orphanPatients = await prisma.patient.findMany({
        where: {
          currentStatus: "AWAITING_LAB",
          LabRequest: { none: {} },
        },
        select: { id: true },
        take: 20,
      });
      if (orphanPatients.length > 0) {
        const fallbackStaff = await prisma.staff.findFirst({ orderBy: { id: "asc" } });
        if (fallbackStaff?.id) {
          await prisma.labRequest.createMany({
            data: orphanPatients.map(p => ({
              patientId: p.id,
              requestedById: fallbackStaff.id,
              testName: "Pending Lab Workup",
              priority: "ROUTINE",
              referralSource: "SYSTEM_HEAL",
              status: "PENDING",
            })),
            skipDuplicates: true,
          });
        }
        // Re-fetch requests to include the newly created LabRequests
        requests = await prisma.labRequest.findMany({
          take: allParam === "true" ? undefined : 500,
          where,
          include: {
            Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, ageUnit: true, gender: true, isEmergency: true } },
            Staff: { select: { fullName: true, department: true } },
          },
          orderBy: [{ isCritical: "desc" }, { createdAt: "desc" }],
        });
      }
    }

    const shaped = requests.map((r) => ({
      id: r.id, patientId: r.Patient.id, patientNumber: r.Patient.patientNumber, firstName: r.Patient.firstName,
      lastName: r.Patient.lastName, age: r.Patient.age, ageUnit: r.Patient.ageUnit, gender: r.Patient.gender,
      isEmergency: r.Patient.isEmergency, testName: r.testName, testPanel: r.testPanel,
      priority: r.priority, referralSource: r.referralSource,
      referralNotes: r.referralNotes, clinicalNotes: r.clinicalNotes,
      requestedBy: r.Staff.fullName, requestedDepartment: r.Staff.department,
      specimenType: r.specimenType, specimenId: r.specimenId,
      specimenCollectedAt: r.specimenCollectedAt?.toISOString() ?? null,
      collectedByName: r.collectedByName, specimenRejected: r.specimenRejected,
      rejectionReason: r.rejectionReason, rejectionCategory: r.rejectionCategory,
      rejectedAt: r.rejectedAt?.toISOString() ?? null, rejectedBy: r.rejectedBy,
      processingStartedAt: r.processingStartedAt?.toISOString() ?? null,
      processingStartedBy: r.processingStartedBy,
      results: r.results, resultEnteredAt: r.resultEnteredAt?.toISOString() ?? null,
      enteredByName: r.enteredByName, validatedByName: r.validatedByName,
      validatedAt: r.validatedAt?.toISOString() ?? null, isCritical: r.isCritical,
      criticalNote: r.criticalNote, analyzerType: r.analyzerType,
      analyzerModel: r.analyzerModel, analyzerImportStatus: r.analyzerImportStatus,
      chainOfCustody: r.chainOfCustody, attachments: r.attachments,
      status: r.status, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, requests: shaped });
  } catch (error: any) {
    console.error("[LABORATORY_GET]", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to load" }, { status: 500 });
  }
}

// ─── POST: All mutating lab actions ───────────────────────────────────

/**
 * Generate a unique, non-sequential Lab specimen ID, e.g. "LAB-2025-84721".
 * Mirrors the patient-number style (MSMC-{year}-{random}). Every candidate is
 * checked against the LabRequest table (specimenId is @unique), so a collision
 * is retried; the timestamp fallback cannot repeat within the checked space.
 */
async function generateUniqueSpecimenId(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const random = Math.floor(10000 + Math.random() * 90000); // 10000–99999
    const candidate = `LAB-${year}-${random}`;
    const exists = await prisma.labRequest.findUnique({
      where: { specimenId: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  const fallback = `LAB-${year}-${Date.now().toString(36).toUpperCase()}`;
  const taken = await prisma.labRequest.findUnique({
    where: { specimenId: fallback },
    select: { id: true },
  });
  if (!taken) return fallback;
  throw new Error("Could not generate a unique Lab specimen ID");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {

      case "CREATE_REQUEST": {
        const { patientId, visitId, requestedById, testName, testPanel, priority, referralSource, referralNotes, clinicalNotes } = payload;
        if (!patientId || !requestedById || !testName) return NextResponse.json({ error: "patientId, requestedById, and testName are required" }, { status: 400 });
        const request = await prisma.labRequest.create({
          data: {
            patientId: parseInt(patientId), visitId: visitId ? parseInt(visitId) : null,
            requestedById: parseInt(requestedById), testName, testPanel: testPanel || null,
            priority: priority || "ROUTINE", referralSource: referralSource || null,
            referralNotes: referralNotes || null, clinicalNotes: clinicalNotes || null,
            status: "PENDING",
          },
        });
        return NextResponse.json(request, { status: 201 });
      }

      case "RECORD_SPECIMEN": {
        const { id, specimenType, collectedByName } = payload;
        if (!id || !specimenType) return NextResponse.json({ error: "id and specimenType are required" }, { status: 400 });
        const labId = parseInt(id);

        // Keep an already-assigned ID — re-recording must never change a
        // specimen ID that may already be printed on a report. Otherwise
        // assign a fresh random unique one (LAB-{year}-{random}).
        const existing = await prisma.labRequest.findUnique({
          where: { id: labId },
          select: { specimenId: true },
        });
        let specimenId = existing?.specimenId || (await generateUniqueSpecimenId());

        // The update can race with another collection on the @unique
        // specimenId column (P2002) — regenerate and retry, then rethrow.
        let updated;
        for (let attempt = 0; ; attempt++) {
          try {
            updated = await prisma.labRequest.update({
              where: { id: labId },
              data: {
                specimenType, specimenId, specimenCollectedAt: new Date(),
                collectedByName: collectedByName || null, status: "SPECIMEN_COLLECTED",
                chainOfCustody: JSON.stringify([
                  { action: "SPECIMEN_COLLECTED", by: collectedByName || "Unknown", at: new Date().toISOString(), from: "REQUEST", to: "COLLECTION" }
                ]),
              },
            });
            break;
          } catch (e: any) {
            if (e.code !== "P2002" || attempt >= 2) throw e;
            specimenId = await generateUniqueSpecimenId();
          }
        }
        return NextResponse.json({ ...updated, specimenId });
      }

      case "UPDATE_CHAIN_OF_CUSTODY": {
        const { id, action: custAction, by, from: cFrom, to: cTo } = payload;
        const current = await prisma.labRequest.findUnique({ where: { id: parseInt(id) }, select: { chainOfCustody: true } });
        let chain: any[] = [];
        if (current?.chainOfCustody) { try { chain = JSON.parse(current.chainOfCustody); } catch { chain = []; } }
        chain.push({ action: custAction, by, at: new Date().toISOString(), from: cFrom, to: cTo });
        const updated = await prisma.labRequest.update({ where: { id: parseInt(id) }, data: { chainOfCustody: JSON.stringify(chain) } });
        return NextResponse.json(updated);
      }

      case "REJECT_SPECIMEN": {
        const { id, rejectionReason, rejectionCategory, rejectedBy } = payload;
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
        const reason = rejectionReason || "Rejected by lab technician";

        // Fetch lab request with patient + staff info before rejecting
        const labReq = await prisma.labRequest.findUnique({
          where: { id: parseInt(id) },
          include: {
            Patient: { select: { firstName: true, lastName: true, patientNumber: true, id: true } },
            Staff: { select: { fullName: true, department: true } },
          },
        });
        if (!labReq) return NextResponse.json({ error: "Lab request not found" }, { status: 404 });

        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: { specimenRejected: true, rejectionReason: reason, rejectionCategory: rejectionCategory || null, rejectedBy: rejectedBy || null, rejectedAt: new Date(), status: "REJECTED" },
        });

        // Notify the referring department
        const patientName = `${labReq.Patient.firstName} ${labReq.Patient.lastName}`;
        await createNotification({
          department: labReq.referralSource || labReq.Staff.department || "GENERAL",
          title: "Lab Specimen Rejected",
          message: `Lab specimen for ${patientName} (${labReq.Patient.patientNumber}) — ${labReq.testName} has been rejected by ${rejectedBy || "Lab Technician"}. Reason: ${reason}`,
          type: "LAB_REJECTED",
          referenceId: labReq.id,
          referenceType: "lab_request",
          patientId: labReq.Patient.id,
        });

        // Additionally: update the patient's currentStatus so the receptionist
        // correctly sees "Rejected by Lab" — but ONLY for non-admitted patients.
        // Admitted patients must stay ADMITTED (the lab request still gets the
        // REJECTED flag + notification above); flipping them to LAB_REJECTED
        // kicks them out of the doctor's admitted-patients list.
        const admittedCheck = await prisma.patient.findUnique({
          where: { id: labReq.Patient.id },
          select: { currentStatus: true, sentToTreatmentRoom: true },
        });
        const isAdmittedPatient =
          admittedCheck?.currentStatus === "ADMITTED" ||
          admittedCheck?.sentToTreatmentRoom === true;
        if (!isAdmittedPatient) {
          await prisma.patient.update({
            where: { id: labReq.Patient.id },
            data: { currentStatus: "LAB_REJECTED" },
          });
        } else {
          await prisma.patient.update({
            where: { id: labReq.Patient.id },
            data: { lastSharedFromDept: "Lab" },
          });
        }

        return NextResponse.json(updated);
      }

      case "SET_PROCESSING": {
        const { id, processingStartedBy } = payload;
        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: { status: "PROCESSING", processingStartedAt: new Date(), processingStartedBy: processingStartedBy || null },
        });
        return NextResponse.json(updated);
      }

      case "IMPORT_ANALYZER_RESULTS": {
        const { id, analyzerType, analyzerResults, analyzerModel } = payload;
        if (!id || !analyzerType || !analyzerResults) return NextResponse.json({ error: "id, analyzerType, and analyzerResults are required" }, { status: 400 });
        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: {
            analyzerType, analyzerModel: analyzerModel || null,
            analyzerResults: typeof analyzerResults === "string" ? analyzerResults : JSON.stringify(analyzerResults),
            analyzerImportedAt: new Date(), analyzerImportStatus: "IMPORTED",
          },
        });
        return NextResponse.json(updated);
      }

      case "UPDATE_ANALYZER_IMPORT_STATUS": {
        const { id, status } = payload;
        const updated = await prisma.labRequest.update({ where: { id: parseInt(id) }, data: { analyzerImportStatus: status } });
        return NextResponse.json(updated);
      }

      case "ENTER_RESULTS": {
        const { id, results, enteredByName, isCritical, criticalNote } = payload;
        if (!id || !results) return NextResponse.json({ error: "id and results are required" }, { status: 400 });
        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: {
            results: typeof results === "string" ? results : JSON.stringify(results),
            resultEnteredAt: new Date(), enteredByName: enteredByName || null,
            isCritical: isCritical || false, criticalNote: criticalNote || null,
            status: "AWAITING_VALIDATION",
          },
        });
        // Advance patient out of lab-holding status
        const labReqForStatus = await prisma.labRequest.findUnique({
          where: { id: parseInt(id) }, include: { Patient: true, Encounter: true },
        });
        if (labReqForStatus) {
          const ps = labReqForStatus.Patient.currentStatus;
          const encId = labReqForStatus.encounterId;

          if (ps === "AWAITING_LAB") {
            await prisma.patient.update({
              where: { id: labReqForStatus.Patient.id },
              data: { currentStatus: "AWAITING_DOCTOR", lastSharedFromDept: "Lab" },
            });
            // Route encounter back to doctor if present and patient not admitted
            if (encId) {
              const { returnEncounterToDoctor } = await import("../../lib/encounterUtils");
              await returnEncounterToDoctor(encId, "Lab");
            }
          } else if (ps === "ADMITTED") {
            await prisma.patient.update({
              where: { id: labReqForStatus.Patient.id },
              data: { lastSharedFromDept: "Lab" },
            });
            await createNotification({
              department: "Doctor",
              title: "Lab Result Entered",
              message: `Lab results entered for ${labReqForStatus.Patient.firstName} ${labReqForStatus.Patient.lastName} (admitted patient)`,
              type: "LAB_RESULT",
              patientId: labReqForStatus.Patient.id,
            }).catch((e: any) => console.error("[Lab] clinical update error", e));
          }
        }
        return NextResponse.json(updated);
      }

      case "VALIDATE_RESULTS": {
        const { id, validatedByName } = payload;
        if (!id || !validatedByName) return NextResponse.json({ error: "id and validatedByName are required" }, { status: 400 });
        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: { validatedByName, validatedAt: new Date(), status: "COMPLETED" },
        });
        const labReq = await prisma.labRequest.findUnique({
          where: { id: parseInt(id) }, include: { Patient: true, Encounter: true },
        });
        if (labReq) {
          const ps = labReq.Patient.currentStatus;
          const encId = labReq.encounterId;

          if (ps === "AWAITING_LAB") {
            await prisma.patient.update({
              where: { id: labReq.Patient.id },
              data: { currentStatus: "AWAITING_DOCTOR", lastSharedFromDept: "Lab" },
            });
            if (encId) {
              const { returnEncounterToDoctor } = await import("../../lib/encounterUtils");
              await returnEncounterToDoctor(encId, "Lab");
            }
          } else if (ps === "ADMITTED") {
            await prisma.patient.update({
              where: { id: labReq.Patient.id },
              data: { lastSharedFromDept: "Lab" },
            });
          } else {
            await prisma.patient.update({
              where: { id: labReq.Patient.id },
              data: { lastSharedFromDept: "Lab" },
            });
            if (encId) {
              const { returnEncounterToDoctor } = await import("../../lib/encounterUtils");
              await returnEncounterToDoctor(encId, "Lab");
            }
          }
          await createNotification({
            department: labReq.referralSource || "GENERAL",
            title: "Lab Results Ready",
            message: `Results for ${labReq.testName} - ${labReq.Patient.firstName} ${labReq.Patient.lastName} (${labReq.Patient.patientNumber}) are now available.`,
            type: "RESULT_READY", referenceId: labReq.id, referenceType: "lab_request", patientId: labReq.Patient.id,
          });
          // Send email to requesting department
          const emails = await getDepartmentEmails(labReq.referralSource || "");
          if (emails.length > 0) {
            const html = labResultEmailHtml({
              patientName: `${labReq.Patient.firstName} ${labReq.Patient.lastName}`,
              patientNumber: labReq.Patient.patientNumber,
              testName: labReq.testName,
              department: labReq.referralSource || "General",
              sharedByName: validatedByName,
            });
            for (const email of emails) {
              await sendLabNotificationEmail({ to: email, subject: `Lab Results Ready: ${labReq.testName}`, html });
            }
          }
        }
        return NextResponse.json(updated);
      }

      case "RECORD_CRITICAL_NOTIFICATION": {
        const { labRequestId, patientId, notifiedPerson, notifiedDept, notificationMethod, notes } = payload;
        if (!labRequestId || !patientId || !notifiedPerson || !notificationMethod) {
          return NextResponse.json({ error: "labRequestId, patientId, notifiedPerson, and notificationMethod are required" }, { status: 400 });
        }
        const notification = await prisma.criticalNotification.create({
          data: {
            labRequestId: parseInt(labRequestId), patientId: parseInt(patientId), notifiedPerson,
            notifiedDept: notifiedDept || null, notificationMethod, notifiedAt: new Date(), notes: notes || null,
          },
        });
        return NextResponse.json(notification, { status: 201 });
      }

      case "ACKNOWLEDGE_CRITICAL": {
        const { id, acknowledgedBy } = payload;
        if (!id || !acknowledgedBy) return NextResponse.json({ error: "id and acknowledgedBy are required" }, { status: 400 });
        const updated = await prisma.criticalNotification.update({
          where: { id: parseInt(id) },
          data: { acknowledgedAt: new Date(), acknowledgedBy },
        });
        return NextResponse.json(updated);
      }

	      case "SHARE_RESULT": {
	        const { labRequestId, patientId, sharedById, sharedByName, targetUserId, targetDept, includeReport, note } = payload;
	        if (!labRequestId || !patientId || !sharedByName || !targetDept) {
	          return NextResponse.json({ error: "labRequestId, patientId, sharedByName, and targetDept are required" }, { status: 400 });
	        }
	        const share = await prisma.resultShare.create({
	          data: {
	            labRequestId: parseInt(labRequestId), patientId: parseInt(patientId),
	            sharedById: sharedById ? parseInt(sharedById) : null, sharedByName,
	            targetUserId: targetUserId ? parseInt(targetUserId) : null, targetDept,
	            includeReport: includeReport !== false, note: note || null,
	          },
	        });
	        // Route the patient to the correct status based on where results
	        // were shared. The targetDept determines the patient's next queue.
	        const DEPT_TO_STATUS: Record<string, string> = {
	          "Doctor": "AWAITING_DOCTOR",
	          "Reception": "AWAITING_CASHIER",
	          "Nurse/Midwife": "AWAITING_TRIAGE",
	          "Radiology": "AWAITING_RADIOLOGY",
	        };
	        try {
	          const patient = await prisma.patient.findUnique({ where: { id: parseInt(patientId) }, select: { currentStatus: true, sentToTreatmentRoom: true, admittingDoctorName: true } });
	          if (patient) {
	            const isAdmittedPatient =
	              patient.currentStatus === "ADMITTED" ||
	              patient.sentToTreatmentRoom === true ||
	              (patient.admittingDoctorName !== null && patient.currentStatus !== "DISCHARGED");
	            if (isAdmittedPatient) {
	              // Admitted patient — stays admitted; flag that lab results are back.
	              await prisma.patient.update({
	                where: { id: parseInt(patientId) },
	                data: { lastSharedFromDept: "Lab" },
	              });
	            } else {
	              // Route to the status corresponding to the target department
	              const mappedStatus = DEPT_TO_STATUS[targetDept] || "AWAITING_DOCTOR";
	              await prisma.patient.update({
	                where: { id: parseInt(patientId) },
	                data: { currentStatus: mappedStatus as any, lastSharedFromDept: "Lab" },
	              });
	            }
	          }
	        } catch (e) { console.error("[SHARE_RESULT] Patient status update failed:", e); }
        await createNotification({
          department: targetDept,
          title: "Lab Result Shared With Your Department",
          message: `${sharedByName} shared lab results${note ? `: ${note}` : ""}`,
          type: "RESULT_SHARED", referenceId: parseInt(labRequestId), referenceType: "lab_request", patientId: parseInt(patientId),
        });
        // Send email to target department
        const emails = await getDepartmentEmails(targetDept);
        if (emails.length > 0) {
          const labReq = await prisma.labRequest.findUnique({
            where: { id: parseInt(labRequestId) },
            include: { Patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
          });
          if (labReq) {
            const html = labResultEmailHtml({
              patientName: `${labReq.Patient.firstName} ${labReq.Patient.lastName}`,
              patientNumber: labReq.Patient.patientNumber,
              testName: labReq.testName,
              department: targetDept,
              sharedByName,
              note: note || undefined,
            });
            for (const email of emails) {
              await sendLabNotificationEmail({ to: email, subject: `Lab Result Shared: ${labReq.testName}`, html });
            }
          }
        }
        return NextResponse.json(share, { status: 201 });
      }

	      case "SHARE_RESULT_AND_ROUTE_TO_DOCTOR": {
	        const { labRequestId, patientId, sharedById, sharedByName, targetUserId, targetDept, includeReport, note } = payload;
	        if (!labRequestId || !patientId || !sharedByName || !targetDept) {
	          return NextResponse.json({ error: "labRequestId, patientId, sharedByName, and targetDept are required" }, { status: 400 });
	        }
	        const DEPT_TO_STATUS: Record<string, string> = {
	          "Doctor": "AWAITING_DOCTOR",
	          "Reception": "AWAITING_CASHIER",
	          "Nurse/Midwife": "AWAITING_TRIAGE",
	          "Radiology": "AWAITING_RADIOLOGY",
	        };
	        // 1. Create ResultShare record
	        const shareResult = await prisma.resultShare.create({
	          data: {
	            labRequestId: parseInt(labRequestId), patientId: parseInt(patientId),
	            sharedById: sharedById ? parseInt(sharedById) : null, sharedByName,
	            targetUserId: targetUserId ? parseInt(targetUserId) : null, targetDept,
	            includeReport: includeReport !== false, note: note || null,
	          },
	        });
		        // 2. Fetch patient info and lab request info before routing
		        const [patientStatus, labReqInfo] = await Promise.all([
		          prisma.patient.findUnique({
		            where: { id: parseInt(patientId) },
		            select: { currentStatus: true, sentToTreatmentRoom: true, admittingDoctorName: true, firstName: true, lastName: true },
		          }),
		          prisma.labRequest.findUnique({
		            where: { id: parseInt(labRequestId) },
		            select: { testName: true },
		          }),
		        ]);
		        // "Admitted" also covers patients whose status was temporarily moved
		        // off ADMITTED (e.g. LAB_REJECTED by an older rejection flow) but who
		        // were never discharged — they must not be routed back to the queue.
		        const isAdmitted =
		          patientStatus?.currentStatus === "ADMITTED" ||
		          patientStatus?.sentToTreatmentRoom === true ||
		          (patientStatus?.admittingDoctorName !== null && patientStatus?.currentStatus !== "DISCHARGED");
		        if (isAdmitted) {
		          // Admitted patient — stays admitted; flag that results are back + create clinical update
		          await prisma.patient.update({
		            where: { id: parseInt(patientId) },
		            data: { lastSharedFromDept: "Lab" },
		          });
		          await createNotification({
		            department: "Doctor",
		            title: "New Lab Result",
		            message: `Lab has completed ${labReqInfo?.testName || "a test"} for ${patientStatus?.firstName} ${patientStatus?.lastName}`,
		            type: "LAB_RESULT",
		            patientId: parseInt(patientId),
		          });
		          // Log to timeline
		          await prisma.patientTimeline.create({
		            data: {
		              patientId: parseInt(patientId),
		              action: "TRANSFER",
		              fromDepartment: "Laboratory",
		              toDepartment: "Ward",
		              description: `Lab results shared for ${labReqInfo?.testName || "test"} (admitted patient)`,
		              performedBy: sharedByName,
		            },
		          }).catch(() => {});
		        } else {
		          // Non-admitted — route to the status corresponding to targetDept
		          const mappedStatus = DEPT_TO_STATUS[targetDept] || "AWAITING_DOCTOR";
		          await prisma.patient.update({
		            where: { id: parseInt(patientId) },
		            data: { currentStatus: mappedStatus as any, lastSharedFromDept: "Lab" },
		          });
		          // Log to timeline
		          await prisma.patientTimeline.create({
		            data: {
		              patientId: parseInt(patientId),
		              action: "TRANSFER",
		              fromDepartment: "Laboratory",
		              toDepartment: "Doctor",
		              description: `Lab results shared for ${labReqInfo?.testName || "test"}. Patient routed back to Doctor.`,
		              performedBy: sharedByName,
		            },
		          });
		        }
	        // 3. Notify the doctor
	        await createNotification({
	          department: "Doctor",
	          title: isAdmitted ? "Lab Results Ready (Admitted Patient)" : "Lab Results Shared — Patient Returned",
	          message: `${sharedByName} shared lab results for ${patientStatus?.firstName || ""} ${patientStatus?.lastName || ""}${note ? `: ${note}` : ""}`,
	          type: "RESULT_SHARED", referenceId: parseInt(labRequestId), referenceType: "lab_request", patientId: parseInt(patientId),
	        });
        return NextResponse.json(shareResult, { status: 201 });
      }

      case "SEND_COMMUNICATION": {
        const { labRequestId, patientId, messageType, message, senderId, senderName, senderDept, recipientDept } = payload;
        if (!message || !senderId || !senderName) return NextResponse.json({ error: "message, senderId, and senderName are required" }, { status: 400 });
        const comm = await prisma.labCommunication.create({
          data: {
            labRequestId: labRequestId ? parseInt(labRequestId) : null,
            patientId: patientId ? parseInt(patientId) : null,
            messageType: messageType || "GENERAL", message,
            senderId: parseInt(senderId), senderName, senderDept: senderDept || null,
            recipientDept: recipientDept || null,
          },
        });
        if (recipientDept) {
          await prisma.notification.create({
            data: {
              department: recipientDept,
              title: `Lab Communication: ${messageType.replace(/_/g, " ")}`,
              message: `${senderName}: ${message.substring(0, 200)}`,
              type: "COMMUNICATION", referenceId: comm.id, referenceType: "communication",
            },
          });
        }
        return NextResponse.json(comm, { status: 201 });
      }

      case "MARK_COMM_READ": {
        const { id } = payload;
        const updated = await prisma.labCommunication.update({ where: { id: parseInt(id) }, data: { isRead: true, readAt: new Date() } });
        return NextResponse.json(updated);
      }

      case "GET_NOTIFICATIONS": {
        const { department } = payload;
        const deptNotifs = await prisma.notification.findMany({
          where: department ? { department } : {},
          orderBy: { createdAt: "desc" }, take: 50,
        });

        // Enrich lab-request notifications with full lab findings
        const enriched = await Promise.all(
          deptNotifs.map(async (n) => {
            if (n.referenceType === "lab_request" && n.referenceId) {
              const labReq = await prisma.labRequest.findUnique({
                where: { id: n.referenceId },
                include: { Patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } } },
              });
              if (labReq) {
                let attachments: any[] = [];
                try {
                  if (labReq.attachments) attachments = JSON.parse(labReq.attachments);
                } catch {}
                return {
                  ...n,
                  labRequest: {
                    testName: labReq.testName,
                    testPanel: labReq.testPanel,
                    results: labReq.results,
                    priority: labReq.priority,
                    clinicalNotes: labReq.clinicalNotes,
                    criticalNote: labReq.criticalNote,
                    isCritical: labReq.isCritical,
                    enteredByName: labReq.enteredByName,
                    resultEnteredAt: labReq.resultEnteredAt,
                    validatedByName: labReq.validatedByName,
                    validatedAt: labReq.validatedAt,
                    specimenType: labReq.specimenType,
                    specimenId: labReq.specimenId,
                    attachments,
                    analyzerResults: labReq.analyzerResults,
                    analyzerType: labReq.analyzerType,
                    analyzerModel: labReq.analyzerModel,
                    patientName: `${labReq.Patient.firstName} ${labReq.Patient.lastName}`,
                    patientNumber: labReq.Patient.patientNumber,
                  },
                };
              }
            }
            return n;
          })
        );

        return NextResponse.json({ success: true, notifications: enriched });
      }

      case "MARK_NOTIF_READ": {
        const { id } = payload;
        const updated = await prisma.notification.update({ where: { id: parseInt(id) }, data: { isRead: true, readAt: new Date() } });
        return NextResponse.json(updated);
      }

      case "MARK_ALL_NOTIF_READ": {
        const { department } = payload;
        await prisma.notification.updateMany({ where: { department, isRead: false }, data: { isRead: true, readAt: new Date() } });
        return NextResponse.json({ success: true });
      }

      case "ATTACH_FILE": {
        const { id, attachment } = payload;
        if (!id || !attachment) return NextResponse.json({ error: "id and attachment are required" }, { status: 400 });
        const current = await prisma.labRequest.findUnique({ where: { id: parseInt(id) }, select: { attachments: true } });
        let existing: any[] = [];
        if (current?.attachments) { try { existing = JSON.parse(current.attachments); } catch { existing = []; } }
        existing.push(attachment);
        const updated = await prisma.labRequest.update({ where: { id: parseInt(id) }, data: { attachments: JSON.stringify(existing) } });
        return NextResponse.json(updated);
      }

      case "BULK_UPDATE_STATUS": {
        const { ids, status } = payload;
        if (!ids || !Array.isArray(ids) || !status) return NextResponse.json({ error: "ids (array) and status are required" }, { status: 400 });
        await prisma.labRequest.updateMany({
          where: { id: { in: ids.map((i: string) => parseInt(i)) } },
          data: { status },
        });
        return NextResponse.json({ success: true, updated: ids.length });
      }

      case "BULK_START_PROCESSING": {
        const { ids, startedBy } = payload;
        if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: "ids (array) is required" }, { status: 400 });
        await prisma.labRequest.updateMany({
          where: { id: { in: ids.map((i: string) => parseInt(i)) }, status: "SPECIMEN_COLLECTED" },
          data: { status: "PROCESSING", processingStartedAt: new Date(), processingStartedBy: startedBy || null },
        });
        return NextResponse.json({ success: true });
      }

      case "UPDATE_STATUS": {
        const { id, status } = payload;
        if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
        const updated = await prisma.labRequest.update({ where: { id: parseInt(id) }, data: { status } });
        return NextResponse.json(updated);
      }

      case "GET_REQUEST": {
        const { id } = payload;
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
        const request = await prisma.labRequest.findUnique({
          where: { id: parseInt(id) },
          include: {
            Patient: { select: { patientNumber: true, firstName: true, lastName: true, age: true, ageUnit: true, gender: true, phoneNumber: true, address: true, isEmergency: true } },
            Staff: { select: { fullName: true, department: true } },
            Visit: { select: { symptoms: true, diagnosis: true, notes: true } },
            CriticalNotifications: { orderBy: { createdAt: "desc" } },
            LabCommunications: { orderBy: { createdAt: "desc" }, take: 20 },
            ResultShares: { orderBy: { sharedAt: "desc" }, take: 10 },
          },
        });
        if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(request);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[LABORATORY_POST]", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
