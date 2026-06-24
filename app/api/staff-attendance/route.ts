import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

// GET — fetch attendance records and/or staff list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const active = searchParams.get("active"); // "true" = only clocked in but not out
    const staffList = searchParams.get("staffList"); // "true" = return all eligible staff with today's attendance

    // ── Staff list mode — return all staff (except receptionist & admin) with today's attendance ──
    if (staffList === "true") {
      const today = new Date();
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const allStaff = await prisma.staff.findMany({
        where: {
          User: {
            role: {
              notIn: ["RECEPTIONIST", "ADMINISTRATOR"],
            },
          },
        },
        include: {
          User: { select: { role: true } },
          StaffAttendance: {
            where: {
              date: { gte: dayStart, lt: dayEnd },
            },
            orderBy: { clockIn: "desc" },
            take: 1,
          },
        },
        orderBy: { fullName: "asc" },
      });

      const mapped = allStaff.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        department: s.department,
        role: s.User?.role || null,
        todayAttendance: s.StaffAttendance[0] || null,
        isClockedIn: s.StaffAttendance[0]?.clockOut === null || false,
      }));

      return NextResponse.json({ staffList: mapped });
    }

    // ── Normal attendance records mode ──
    const where: any = {};
    if (department) where.department = department;
    if (staffId) where.staffId = parseInt(staffId);
    if (active === "true") where.clockOut = null;
    if (date) {
      const d = new Date(date);
      where.date = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
      };
    }

    // Default to today if no date specified
    if (!date) {
      const today = new Date();
      where.date = {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      };
    }

    const records = await prisma.staffAttendance.findMany({
      where,
      orderBy: { clockIn: "desc" },
      include: {
        Staff: { select: { fullName: true, department: true } },
      },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[staff-attendance GET]", err);
    return NextResponse.json({ error: "Failed to load attendance." }, { status: 500 });
  }
}

// POST — clock in (auto or manual)
export async function POST(req: NextRequest) {
  try {
    const { staffId, staffName, department, clockIn, clockOut, notes } = await req.json();

    // Must have either staffId (linked) or staffName (manual entry)
    if (!staffId && !staffName) {
      return NextResponse.json({ error: "staffId or staffName required." }, { status: 400 });
    }

    // Parse or default clock-in time
    const clockInDate = clockIn ? new Date(clockIn) : new Date();
    const today = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate());

    // Check duplicate clock-in for linked staff only (manual entries always go through)
    if (staffId) {
      const existing = await prisma.staffAttendance.findFirst({
        where: {
          staffId: parseInt(staffId),
          clockOut: null,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: "Already clocked in. Clock out first." }, { status: 400 });
      }
    }

    const data: any = {
      staffName: staffName || null,
      department: department || null,
      clockIn: clockInDate,
      date: today,
      notes: notes || null,
    };

    if (staffId) data.staffId = parseInt(staffId);
    if (clockOut) data.clockOut = new Date(clockOut);

    const record = await prisma.staffAttendance.create({ data });

    return NextResponse.json({ success: true, record });
  } catch (err) {
    console.error("[staff-attendance POST]", err);
    return NextResponse.json({ error: "Failed to clock in." }, { status: 500 });
  }
}

// DELETE — remove a record
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

    await prisma.staffAttendance.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[staff-attendance DELETE]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}

// PATCH — clock out (with optional manual time)
export async function PATCH(req: NextRequest) {
  try {
    const { id, clockOut } = await req.json();
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

    const updated = await prisma.staffAttendance.update({
      where: { id: parseInt(id) },
      data: { clockOut: clockOut ? new Date(clockOut) : new Date() },
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    console.error("[staff-attendance PATCH]", err);
    return NextResponse.json({ error: "Failed to clock out." }, { status: 500 });
  }
}
