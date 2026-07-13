import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { Prescription: { some: { status: "PENDING" } } },
          { currentStatus: "AWAITING_PHARMACY" },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        Prescription: {
          orderBy: { createdAt: "desc" },
        },
        Visit: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        Triage: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("Pharmacy API error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { prescriptionId, nurseName, patientName } = await request.json();
    if (!prescriptionId) {
      return NextResponse.json({ error: "prescriptionId is required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Get prescription — only allow if PENDING (guard against double-dispense)
      const prescription = await tx.prescription.findUnique({
        where: { id: prescriptionId },
        select: { id: true, patientId: true, medication: true, status: true },
      });

      if (!prescription) {
        throw new Error("Prescription not found");
      }
      if (prescription.status !== "PENDING") {
        throw new Error("Prescription already dispensed");
      }

      // 2. Mark as DISPENSED
      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { status: "DISPENSED" },
      });

      // 3. Find matching Drug in inventory by medication name
      const drug = await tx.drug.findFirst({
        where: { name: { equals: prescription.medication, mode: "insensitive" } },
      });

      const perfName = nurseName || "Nurse";
      let stockLow = false;

      if (drug) {
        // Deduct 1 from stock
        await tx.drug.update({
          where: { id: drug.id },
          data: {
            stockQuantity: drug.stockQuantity - 1,
            lastEditedBy: perfName,
            lastEditedOn: new Date(),
          },
        });

        // Create DispenseLog
        await tx.dispenseLog.create({
          data: {
            drugId: drug.id,
            drugName: drug.name,
            quantity: 1,
            dispensedBy: perfName,
            dispensedTo: patientName || null,
            dispensedAt: new Date(),
          },
        });

        // Check if stock is now at or below reorder level
        stockLow = drug.stockQuantity - 1 <= drug.reorderLevel;
      }

      // 4. Create notification for Nurse/Midwife
      const drugLabel = drug?.name || prescription.medication;
      await tx.notification.create({
        data: {
          department: "Nurse/Midwife",
          patientId: prescription.patientId,
          title: "Medication Dispensed",
          message: `${perfName} dispensed ${drugLabel} for ${patientName || `Patient #${prescription.patientId}`}`,
          type: "DISPENSE",
        },
      });

      // Notify about stock issues (low stock or drug not found)
      if (stockLow) {
        await tx.notification.create({
          data: {
            department: "Admin",
            patientId: prescription.patientId,
            title: "Low Stock Alert",
            message: `${drug!.name} is running low at ${drug!.stockQuantity - 1} units remaining (reorder level: ${drug!.reorderLevel}).`,
            type: "STOCK_ALERT",
          },
        });
        // Also notify Nurse/Midwife about stock
        await tx.notification.create({
          data: {
            department: "Nurse/Midwife",
            patientId: prescription.patientId,
            title: "Low Stock Alert",
            message: `${drug!.name} is running low at ${drug!.stockQuantity - 1} units remaining (reorder level: ${drug!.reorderLevel}).`,
            type: "STOCK_ALERT",
          },
        });
      }

      if (!drug) {
        await tx.notification.create({
          data: {
            department: "Admin",
            patientId: prescription.patientId,
            title: "Drug Not Found in Inventory",
            message: `"${prescription.medication}" prescribed for ${patientName || `Patient #${prescription.patientId}`} was not found in pharmacy inventory. It was still dispensed by ${perfName}.`,
            type: "STOCK_ALERT",
          },
        });
        await tx.notification.create({
          data: {
            department: "Nurse/Midwife",
            patientId: prescription.patientId,
            title: "Drug Not Found in Inventory",
            message: `"${prescription.medication}" prescribed for ${patientName || `Patient #${prescription.patientId}`} was not found in pharmacy inventory. Please update stock records.`,
            type: "STOCK_ALERT",
          },
        });
      }

      // 5. Check remaining PENDING prescriptions
      const remainingPending = await tx.prescription.count({
        where: { patientId: prescription.patientId, status: "PENDING" },
      });

      if (remainingPending === 0) {
        await tx.patient.update({
          where: { id: prescription.patientId },
          data: { currentStatus: "ADMITTED" },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
