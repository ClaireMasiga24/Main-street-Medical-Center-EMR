import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { createNotification } from "../../lib/notifications";
import { routeEncounterToDept } from "../../lib/encounterUtils";
import { normalizeDept } from "../../lib/departments";
import { deptForStudy, reporterLabel, resolveReporter, routeImagingResultToDoctor } from "../../lib/imagingUtils";

// ─── GET — list imaging requests with powerful filtering ──────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const studyType = searchParams.get("studyType");
    const priority = searchParams.get("priority");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const isCritical = searchParams.get("isCritical");

    const where: any = {};

    if (status) where.status = status;
    if (studyType) where.studyType = studyType;
    if (priority) where.priority = priority;
    if (patientId) where.patientId = parseInt(patientId);
    if (isCritical === "true") where.isCritical = true;

    if (search) {
      where.OR = [
        { Patient: { firstName: { contains: search, mode: "insensitive" } } },
        { Patient: { lastName: { contains: search, mode: "insensitive" } } },
        { Patient: { patientNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const requests = await prisma.imagingRequest.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            phoneNumber: true,
            isEmergency: true,
            currentStatus: true,
          },
        },
        Visit: { select: { id: true, symptoms: true, diagnosis: true, createdAt: true } },
        Staff: { select: { id: true, fullName: true } },
      },
      orderBy: [
        { isCritical: "desc" },
        { createdAt: "desc" },
      ],
    });

    // reportedById is a bare Int with no Prisma relation, so the reporting
    // radiologist's name has to be resolved separately. One extra statement
    // for the whole page, and sequential rather than a fan-out: DATABASE_URL
    // pins connection_limit=1, so parallel reads just queue on the one
    // connection while holding it open across the fan-out.
    const reporterIds = [...new Set(requests.map((r) => r.reportedById).filter((id): id is number => typeof id === "number"))];
    const reporters = reporterIds.length
      ? await prisma.staff.findMany({ where: { id: { in: reporterIds } }, select: { id: true, fullName: true } })
      : [];
    const reporterNames = new Map(reporters.map((s) => [s.id, s.fullName]));

    return NextResponse.json(
      requests.map((r) => ({ ...r, reportedByName: r.reportedById ? reporterNames.get(r.reportedById) ?? null : null }))
    );
  } catch (err: any) {
    console.error("[Imaging GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST — create a new imaging request ──────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId, visitId, requestedById,
      studyType, priority, referralSource,
      clinicalNotes, clinicalHistory,
    } = body;

    if (!patientId || !studyType) {
      return NextResponse.json(
        { error: "patientId and studyType are required" },
        { status: 400 }
      );
    }

    const imagingRequest = await prisma.imagingRequest.create({
      data: {
        patientId: parseInt(patientId),
        visitId: visitId ? parseInt(visitId) : null,
        requestedById: requestedById ? parseInt(requestedById) : null,
        studyType,
        priority: priority || "ROUTINE",
        referralSource: referralSource || null,
        clinicalNotes: clinicalNotes || null,
        clinicalHistory: clinicalHistory || null,
        status: "ORDERED",
      },
    });

    return NextResponse.json(imagingRequest, { status: 201 });
  } catch (err: any) {
    console.error("[Imaging POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — update imaging request status, report, findings ──────────
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Build update payload — only include provided fields
    const data: any = {};

    if (updates.status) data.status = updates.status;
    if (updates.priority) data.priority = updates.priority;
    if (updates.clinicalNotes !== undefined) data.clinicalNotes = updates.clinicalNotes;
    if (updates.findings !== undefined) data.findings = updates.findings;
    if (updates.impression !== undefined) data.impression = updates.impression;
    if (updates.conclusion !== undefined) data.conclusion = updates.conclusion;
    if (updates.radiologistNotes !== undefined) data.radiologistNotes = updates.radiologistNotes;
    if (updates.isCritical !== undefined) data.isCritical = updates.isCritical;
    if (updates.criticalNote !== undefined) data.criticalNote = updates.criticalNote;
    if (updates.imageCount !== undefined) data.imageCount = updates.imageCount;
    if (updates.machineResults !== undefined) data.machineResults = updates.machineResults;
    if (updates.machineModel !== undefined) data.machineModel = updates.machineModel;
    if (updates.measurements !== undefined) data.measurements = updates.measurements;
    if (updates.annotations !== undefined) data.annotations = updates.annotations;
    if (updates.reportedById !== undefined) data.reportedById = updates.reportedById;

    // The sender is authenticated by session storage on the client, so the
    // browser only knows the User id. Resolve it to the Staff record that
    // signs the report.
    const reporter = await resolveReporter(
      updates.reporterUserId ?? updates.reportedByUserId ?? null
    );
    // Author the report when it is finalized, not on every draft save — this
    // is the signature on the report, and a re-send is credited to whoever
    // last finalized it. An explicit reportedById from the caller still wins.
    if (updates.status === "REPORTED" && data.reportedById === undefined && reporter.staffId) {
      data.reportedById = reporter.staffId;
    }

    // Track when report was finalized
    if (updates.status === "REPORTED") {
      data.reportedAt = new Date();
    }

    const updated = await prisma.imagingRequest.update({
      where: { id: parseInt(id) },
      data,
      include: {
        Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true, currentStatus: true } },
        Encounter: { select: { id: true } },
      },
    });

    // A routing flag already produces a richer notification further down —
    // one carrying patientId and the request id, so the doctor can deep-link
    // straight to this report. Emitting the generic one as well would put two
    // entries in the inbox for a single finalized report.
    const isRouting = !!updates.routeToDoctor || !!updates.routeToReception;
    if (updates.notifyDepartment && !isRouting) {
      await createNotification({
        department: normalizeDept(updates.notifyDepartment),
        title: "Imaging Report Ready",
        message: updates.notifyMessage || `Imaging report finalized for patient`,
        type: "RESULT_READY",
        patientId: updated.patientId,
        referenceId: updated.id,
        referenceType: "imaging_request",
      }).catch((e: any) => console.error("[Imaging] notify error", e));
    }

    if (updates.routeToDoctor && updated.patientId) {
      await routeImagingResultToDoctor({
        imagingRequestId: updated.id,
        patientId: updated.patientId,
        encounterId: (updated as any).Encounter?.id ?? null,
        studyType: updated.studyType,
        reporter,
        patientFirstName: updated.Patient?.firstName,
        patientLastName: updated.Patient?.lastName,
        patientStatus: updated.Patient?.currentStatus,
        message: updates.notifyMessage,
      });
    }

    if (updates.routeToReception && updated.patientId) {
      const dept = deptForStudy(updated.studyType);
      const performedBy = reporterLabel(reporter);
      const encId = (updated as any).Encounter?.id ?? null;
      const isAdmitted = updated.Patient?.currentStatus === "ADMITTED";
      if (isAdmitted) {
        // Admitted patients stay admitted; the doctor is told instead, since
        // reception cannot act on a bed patient.
        await prisma.patient.update({
          where: { id: updated.patientId },
          data: { lastSharedFromDept: dept },
        });
        await createNotification({
          department: "Doctor",
          title: "New Imaging Result",
          message: `${dept} completed a study for ${updated.Patient?.firstName || ""} ${updated.Patient?.lastName || ""}.`,
          type: "RESULT_SHARED",
          patientId: updated.patientId,
          referenceId: updated.id,
          referenceType: "imaging_request",
        }).catch((e: any) => console.error("[Imaging] notify error", e));
      } else {
        await prisma.patient.update({
          where: { id: updated.patientId },
          data: { currentStatus: "AWAITING_CASHIER", lastSharedFromDept: dept },
        });
        if (encId) {
          await routeEncounterToDept(encId, "CASHIER", "AWAITING_CASHIER");
        }
        await createNotification({
          department: "Reception",
          title: `${dept} Report Ready — Patient Routed to Reception`,
          message: updates.notifyMessage || `Imaging report finalized. Patient routed to Reception for billing.`,
          type: "RESULT_READY",
          patientId: updated.patientId,
          referenceId: updated.id,
          referenceType: "imaging_request",
        }).catch((e: any) => console.error("[Imaging] routeToReception notify error", e));
        await prisma.patientTimeline.create({
          data: {
            patientId: updated.patientId,
            action: "TRANSFER",
            fromDepartment: dept,
            toDepartment: "Reception",
            description: `${dept} report completed. Patient routed to Reception for billing.`,
            performedBy,
          },
        }).catch((e: any) => console.error("[Imaging] routeToReception timeline error", e));
      }
    }

    return NextResponse.json({ ...updated, reportedByName: reporter.fullName });
  } catch (err: any) {
    console.error("[Imaging PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
