import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET — serve the raw image data for a dental image
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await prisma.dentalImage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!image || !image.imageData) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    const bytes = new Uint8Array(image.imageData as unknown as ArrayBuffer);
    const blob = new Blob([bytes], { type: image.mimeType || "image/jpeg" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": image.mimeType || "image/jpeg",
        "Content-Length": String(image.imageData.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[dental/image ID GET]", err);
    return NextResponse.json({ error: "Failed to serve image." }, { status: 500 });
  }
}
