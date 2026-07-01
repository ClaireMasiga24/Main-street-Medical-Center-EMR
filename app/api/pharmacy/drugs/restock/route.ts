import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { drugId, quantity, note, nurseName } = body;

    if (!drugId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Valid drug ID and quantity are required" }, { status: 400 });
    }

    const drug = await prisma.drug.findUnique({ where: { id: drugId } });
    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    const updated = await prisma.drug.update({
      where: { id: drugId },
      data: {
        stockQuantity: drug.stockQuantity + parseInt(quantity),
        lastEditedBy: nurseName || drug.lastEditedBy,
        lastEditedOn: new Date(),
      },
    });

    return NextResponse.json({ success: true, drug: updated });
  } catch (error: any) {
    console.error("Restock error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
