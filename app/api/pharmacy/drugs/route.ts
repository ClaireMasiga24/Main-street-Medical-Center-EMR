import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET /api/pharmacy/drugs?search=&category=&lowStock=&uncounted=&page=1&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const uncounted = searchParams.get("uncounted") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { itemCode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (lowStock) {
      where.stockQuantity = { gt: 0, lte: prisma.drug.fields.reorderLevel ? undefined : 10 };
      // We'll filter low stock in-memory since we can't reference reorderLevel in a Prisma where easily
    }

    if (uncounted) {
      where.stockQuantity = 0;
    }

    const [total, drugs] = await Promise.all([
      prisma.drug.count({ where }),
      prisma.drug.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
    ]);

    // Filter low stock in-memory (stockQuantity > 0 AND <= reorderLevel)
    let filteredDrugs = drugs;
    if (lowStock) {
      filteredDrugs = drugs.filter((d: any) => d.stockQuantity > 0 && d.stockQuantity <= d.reorderLevel);
    }

    // Get uncounted count for badge
    const uncountedCount = await prisma.drug.count({
      where: { isActive: true, stockQuantity: 0 },
    });

    return NextResponse.json({
      drugs: filteredDrugs,
      total: lowStock ? filteredDrugs.length : total,
      page,
      totalPages: Math.ceil((lowStock ? filteredDrugs.length : total) / limit),
      uncountedCount,
    });
  } catch (error: any) {
    console.error("Drugs API error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/pharmacy/drugs — create drug
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, costCentre, buyingCost, sellingPrice, stockQuantity, reorderLevel, nurseName } = body;

    if (!name) {
      return NextResponse.json({ error: "Drug name is required" }, { status: 400 });
    }

    // Auto-generate item code based on highest existing DRG prefix number
    const lastDrug = await prisma.drug.findFirst({
      where: { itemCode: { startsWith: "DRG" } },
      orderBy: { id: "desc" },
    });
    let newCode = "DRG0001";
    if (lastDrug) {
      const lastNum = parseInt(lastDrug.itemCode.replace("DRG", ""), 10);
      if (!isNaN(lastNum)) {
        newCode = `DRG${String(lastNum + 1).padStart(4, "0")}`;
      }
    }

    const drug = await prisma.drug.create({
      data: {
        itemCode: newCode,
        name,
        category: category || "Drug",
        costCentre: costCentre || "Pharmacy",
        buyingCost: parseFloat(buyingCost) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stockQuantity: parseInt(stockQuantity) || 0,
        reorderLevel: parseInt(reorderLevel) || 10,
        lastEditedBy: nurseName || "",
        lastEditedOn: new Date(),
        registeredOn: new Date(),
      },
    });

    return NextResponse.json({ success: true, drug });
  } catch (error: any) {
    console.error("Drug create error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/pharmacy/drugs?id=XX — update drug
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "Drug ID is required" }, { status: 400 });

    const body = await request.json();
    const { name, category, costCentre, buyingCost, sellingPrice, reorderLevel, customPrice, nurseName } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (costCentre !== undefined) updateData.costCentre = costCentre;
    if (buyingCost !== undefined) updateData.buyingCost = parseFloat(buyingCost);
    if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);
    if (reorderLevel !== undefined) updateData.reorderLevel = parseInt(reorderLevel);
    if (customPrice !== undefined) updateData.customPrice = customPrice === null ? null : parseFloat(customPrice);
    updateData.lastEditedBy = nurseName || "";
    updateData.lastEditedOn = new Date();

    const drug = await prisma.drug.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, drug });
  } catch (error: any) {
    console.error("Drug update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/pharmacy/drugs?id=XX — soft-delete
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "Drug ID is required" }, { status: 400 });

    await prisma.drug.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Drug delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
