import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { drugId, quantity, dispensedTo, notes, nurseName } = body;

    if (!drugId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Valid drug ID and quantity are required" }, { status: 400 });
    }

    const drug = await prisma.drug.findUnique({ where: { id: drugId } });
    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    if (drug.stockQuantity < parseInt(quantity)) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${drug.stockQuantity} available.` },
        { status: 400 }
      );
    }

    const [updatedDrug] = await prisma.$transaction([
      prisma.drug.update({
        where: { id: drugId },
        data: {
          stockQuantity: drug.stockQuantity - parseInt(quantity),
          lastEditedBy: nurseName || drug.lastEditedBy,
          lastEditedOn: new Date(),
        },
      }),
      prisma.dispenseLog.create({
        data: {
          drugId,
          drugName: drug.name,
          quantity: parseInt(quantity),
          dispensedBy: nurseName || "",
          dispensedTo: dispensedTo || null,
          notes: notes || null,
          dispensedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true, drug: updatedDrug });
  } catch (error: any) {
    console.error("Dispense error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
