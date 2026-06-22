import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

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

    return NextResponse.json(requests);
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

    // Track when report was finalized
    if (updates.status === "REPORTED") {
      data.reportedAt = new Date();
    }

    const updated = await prisma.imagingRequest.update({
      where: { id: parseInt(id) },
      data,
      include: {
        Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true } },
      },
    });

    // If the patient's currentStatus is AWAITING_RADIOLOGY/SONOGRAPHY and the report
    // is being finalized, we could update the patient status here
    // (keeping it flexible — the requesting workflow controls the status)

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[Imaging PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
