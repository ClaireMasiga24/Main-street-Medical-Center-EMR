import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// 1. GET: Fetch patients (Optionally filter by status, e.g., /api/patients?status=AWAITING_SONOGRAPHY)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const data = await prisma.patient.findMany({
      where: status ? { currentStatus: status as any } : {},
      include: { Visit: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }
    });

    // Clean up the data layout directly on the backend so your frontend code stays simple
    const formatted = data.map(p => ({
      id: p.id,
      patientNumber: p.patientNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age,
      dob: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
      gender: p.gender,
      phone: p.phoneNumber,
      address: p.address,
      chiefComplaint: p.Visit[0]?.symptoms || "None noted",
      isEmergency: p.isEmergency,
      status: p.currentStatus,
      createdAt: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Create a new patient profile (With automatic visit initialization)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const careId = `MSMC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPatient = await prisma.patient.create({
      data: {
        patientNumber: careId,
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        age: parseInt(body.age),
        dateOfBirth: body.dob ? new Date(body.dob) : null,
        phoneNumber: body.phone || null,
        address: body.address || null,
        isEmergency: body.isEmergency || false,
        currentStatus: "AWAITING_TRIAGE",
        Visit: {
          create: {
            symptoms: body.chiefComplaint,
            notes: body.isEmergency ? "Emergency intake." : "Routine intake."
          }
        }
      }
    });

    return NextResponse.json(newPatient, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PATCH: Update patient status directly by passing the ID inside the JSON body
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json(); // Clean: no dynamic URL parsing needed

    const updated = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: { currentStatus: status }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}