import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET — fetch dental images for a patient or record
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const recordId = searchParams.get("recordId");

    const where: any = {};
    if (patientId) where.patientId = parseInt(patientId);
    if (recordId) where.dentalRecordId = parseInt(recordId);

    const images = await prisma.dentalImage.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        imageType: true,
        imageSubType: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        findings: true,
        toothNumbers: true,
        isComparison: true,
        comparisonWith: true,
        uploadedBy: true,
        uploadedAt: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ images });
  } catch (err) {
    console.error("[dental/images GET]", err);
    return NextResponse.json({ error: "Failed to load images." }, { status: 500 });
  }
}

// POST — upload a dental image
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const patientId = parseInt(formData.get("patientId") as string);
    const dentalRecordId = parseInt(formData.get("dentalRecordId") as string);
    const imageType = formData.get("imageType") as string;
    const imageSubType = formData.get("imageSubType") as string || null;
    const toothNumbers = formData.get("toothNumbers") as string || null;
    const findings = formData.get("findings") as string || null;
    const uploadedBy = formData.get("uploadedBy") as string || null;
    const file = formData.get("file") as File | null;

    if (!patientId || !dentalRecordId || !file) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const image = await prisma.dentalImage.create({
      data: {
        patientId,
        dentalRecordId,
        imageType: imageType || "INTRAORAL",
        imageSubType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "image/jpeg",
        imageData: buffer,
        thumbnailData: null, // Could generate thumbnail server-side
        toothNumbers,
        findings,
        uploadedBy,
      },
    });

    return NextResponse.json({ success: true, imageId: image.id });
  } catch (err) {
    console.error("[dental/images POST]", err);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }
}

// DELETE — remove a dental image
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");

    if (!id) {
      return NextResponse.json({ error: "Image ID required." }, { status: 400 });
    }

    await prisma.dentalImage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dental/images DELETE]", err);
    return NextResponse.json({ error: "Failed to delete image." }, { status: 500 });
  }
}
