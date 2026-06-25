import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Sanitize filename and ensure unique
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const safeName = `${timestamp}-${originalName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "lab");
    const filePath = path.join(uploadDir, safeName);

    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Return the public URL
    const publicUrl = `/uploads/lab/${safeName}`;

    return NextResponse.json({
      success: true,
      attachment: {
        name: originalName,
        url: publicUrl,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[UPLOAD_ERROR]", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
