import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// GET — fetch appointments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");

    const where: any = {};
    if (department) where.department = department;
    if (staffId) where.staffId = parseInt(staffId);
    if (status) where.status = status;
    if (patientId) where.patientId = parseInt(patientId);
    if (date) {
      const d = new Date(date);
      where.appointmentDate = {
        gte: new Date(d.setHours(0,0,0,0)),
        lt: new Date(d.setHours(23,59,59,999)),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: "asc" },
      include: {
        Patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, age: true, gender: true, phoneNumber: true } },
        Staff: { select: { id: true, fullName: true, department: true } },
        CreatedBy: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error("[appointments GET]", err);
    return NextResponse.json({ error: "Failed to load appointments." }, { status: 500 });
  }
}

// POST — create appointment
export async function POST(req: NextRequest) {
  try {
    const { patientId, staffId, createdById, department, appointmentDate, reason, notes } = await req.json();

    if (!patientId || !appointmentDate) {
      return NextResponse.json({ error: "patientId and appointmentDate are required." }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: parseInt(patientId),
        staffId: staffId ? parseInt(staffId) : null,
        createdById: createdById ? parseInt(createdById) : null,
        department: department || null,
        appointmentDate: new Date(appointmentDate),
        reason: reason || null,
        notes: notes || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, appointment });
  } catch (err) {
    console.error("[appointments POST]", err);
    return NextResponse.json({ error: "Failed to create appointment." }, { status: 500 });
  }
}

// PATCH — update appointment status
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

    const data: any = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data,
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err) {
    console.error("[appointments PATCH]", err);
    return NextResponse.json({ error: "Failed to update appointment." }, { status: 500 });
  }
}

// DELETE — cancel/remove appointment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

    await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[appointments DELETE]", err);
    return NextResponse.json({ error: "Failed to cancel appointment." }, { status: 500 });
  }
}
