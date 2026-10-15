import { prisma } from "./prisma";

/**
 * Resolve the id a doctor is logged in under into the ids that can appear in
 * clinical data as "this doctor".
 *
 * The client sends `u.staffId || u.staff?.id || u.id` (see app/Doctors/page.tsx).
 * That is usually the `Staff.id` but falls back to the `User.id`, and
 * `/api/doctor` writes `Visit.doctorId` from that RAW value without resolving
 * it. So for one doctor, `Visit.doctorId` can hold either id depending on how
 * the session was populated. `Staff` and `User` are 1:1 (`Staff.userId` is
 * `@unique`), so we look up both and match on either.
 *
 * Filtering on a single id would silently hide part of a doctor's own history,
 * which is the "my patients disappeared" bug this exists to prevent.
 */
export async function resolveDoctorIds(
  rawId: number | string | null | undefined
): Promise<{ staffId: number; userId: number; ids: number[] } | null> {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;

  // 1. The id is a Staff.id (the normal case).
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (staff) {
    return { staffId: staff.id, userId: staff.userId, ids: [staff.id, staff.userId] };
  }

  // 2. The id is a User.id (the client fallback). Map it to the Staff row.
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, Staff: { select: { id: true } } },
  });
  if (user?.Staff) {
    return { staffId: user.Staff.id, userId: user.id, ids: [user.Staff.id, user.id] };
  }

  // 3. Neither. Match only the raw id so a valid-but-unlinked id still works.
  return { staffId: id, userId: id, ids: [id] };
}
