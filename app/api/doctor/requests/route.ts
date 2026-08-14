import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// DELETE /api/doctor/requests?id=123&type=LAB
// Cancel a pending lab or imaging request (soft delete — sets status to CANCELLED)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ error: "id and type are required" }, { status: 400 });
    }

    if (type === "LAB") {
      // Only cancel if still PENDING — atomic via updateMany compound where
      const result = await prisma.labRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (result.count === 0) {
        return NextResponse.json(
          { error: "Lab request cannot be cancelled — it may already be processing or completed." },
          { status: 409 }
        );
      }
    } else if (type === "IMAGING") {
      const result = await prisma.imagingRequest.updateMany({
        where: { id, status: "ORDERED" },
        data: { status: "CANCELLED" },
      });
      if (result.count === 0) {
        return NextResponse.json(
          { error: "Imaging request cannot be cancelled — it may already be completed." },
          { status: 409 }
        );
      }
    } else {
      return NextResponse.json({ error: "type must be LAB or IMAGING" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[doctor/requests DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
