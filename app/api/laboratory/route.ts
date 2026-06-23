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
          Patient: { select: { patientNumber: true, firstName: true, lastName: true, age: true, gender: true, phoneNumber: true, address: true, isEmergency: true } },
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
    const where: Prisma.LabRequestWhereInput = {};
    if (status) where.status = status as any;

    const requests = await prisma.labRequest.findMany({
      take: 500,
      where,
      include: {
        Patient: { select: { patientNumber: true, firstName: true, lastName: true, age: true, gender: true, isEmergency: true } },
        Staff: { select: { fullName: true, department: true } },
      },
      orderBy: [{ isCritical: "desc" }, { createdAt: "desc" }],
    });

    const shaped = requests.map((r) => ({
      id: r.id, patientNumber: r.Patient.patientNumber, firstName: r.Patient.firstName,
      lastName: r.Patient.lastName, age: r.Patient.age, gender: r.Patient.gender,
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
        const specimenId = `LAB-${new Date().getFullYear()}-${String(labId).padStart(5, "0")}`;
        const updated = await prisma.labRequest.update({
          where: { id: labId },
          data: {
            specimenType, specimenId, specimenCollectedAt: new Date(),
            collectedByName: collectedByName || null, status: "SPECIMEN_COLLECTED",
            chainOfCustody: JSON.stringify([
              { action: "SPECIMEN_COLLECTED", by: collectedByName || "Unknown", at: new Date().toISOString(), from: "REQUEST", to: "COLLECTION" }
            ]),
          },
        });
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
        if (!id || !rejectionReason) return NextResponse.json({ error: "id and rejectionReason are required" }, { status: 400 });
        const updated = await prisma.labRequest.update({
          where: { id: parseInt(id) },
          data: { specimenRejected: true, rejectionReason, rejectionCategory: rejectionCategory || null, rejectedBy: rejectedBy || null, rejectedAt: new Date(), status: "REJECTED" },
        });
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
          where: { id: parseInt(id) }, include: { Patient: true },
        });
        if (labReq) {
          await createNotification({
            department: labReq.referralSource || "GENERAL",
            title: "Lab Results Ready",
            message: `Results for ${labReq.testName} - ${labReq.Patient.firstName} ${labReq.Patient.lastName} (${labReq.Patient.patientNumber}) are now available.`,
            type: "RESULT_READY", referenceId: labReq.id, referenceType: "lab_request",
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
        if (!labRequestId || !patientId || !sharedById || !sharedByName || !targetDept) {
          return NextResponse.json({ error: "labRequestId, patientId, sharedById, sharedByName, and targetDept are required" }, { status: 400 });
        }
        const share = await prisma.resultShare.create({
          data: {
            labRequestId: parseInt(labRequestId), patientId: parseInt(patientId),
            sharedById: parseInt(sharedById), sharedByName,
            targetUserId: targetUserId ? parseInt(targetUserId) : null, targetDept,
            includeReport: includeReport !== false, note: note || null,
          },
        });
        await createNotification({
          department: targetDept,
          title: "Lab Result Shared With Your Department",
          message: `${sharedByName} shared lab results${note ? `: ${note}` : ""}`,
          type: "RESULT_SHARED", referenceId: parseInt(labRequestId), referenceType: "lab_request",
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
        return NextResponse.json({ success: true, notifications: deptNotifs });
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
            Patient: { select: { patientNumber: true, firstName: true, lastName: true, age: true, gender: true, phoneNumber: true, address: true, isEmergency: true } },
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
