import type { Prisma } from "@prisma/client";

/**
 * One canonical name per department, plus the aliases that show up in the wild.
 *
 * Notifications reach a department's inbox through an exact string match on
 * `Notification.department` (see notificationDeptWhere). Every call site used
 * to invent its own spelling — "DOCTOR", "LAB", "PHARMACY", "Radiology /
 * Sonography" — so results that had been correctly shared landed in an inbox
 * that nobody ever opened. Normalize on write, alias on read.
 */

export const CANONICAL_DEPARTMENTS = [
  "Reception",
  "Triage",
  "Doctor",
  "Laboratory",
  "Radiology",
  "Sonography",
  "Pharmacy",
  "Dentist",
  "Billing",
  "Cashier",
  "Administration",
  "Nurse/Midwife",
  "Ward",
] as const;

export type CanonicalDepartment = (typeof CANONICAL_DEPARTMENTS)[number];

/** Lowercased alias -> canonical department. */
const ALIASES: Record<string, CanonicalDepartment> = {
  // Doctor
  doctor: "Doctor",
  dr: "Doctor",
  "medical": "Doctor",
  "medical officer": "Doctor",
  physician: "Doctor",
  // Laboratory
  lab: "Laboratory",
  labs: "Laboratory",
  laboratory: "Laboratory",
  "lab technician": "Laboratory",
  // Radiology / sonography
  radiology: "Radiology",
  radiologist: "Radiology",
  imaging: "Radiology",
  "x-ray": "Radiology",
  xray: "Radiology",
  "radiology / sonography": "Radiology",
  radiologysonography: "Radiology",
  sonography: "Sonography",
  sono: "Sonography",
  sonographer: "Sonography",
  ultrasound: "Sonography",
  // Pharmacy
  pharmacy: "Pharmacy",
  pharmacist: "Pharmacy",
  // Dentistry
  dentist: "Dentist",
  dental: "Dentist",
  // Nursing
  nurse: "Nurse/Midwife",
  nurses: "Nurse/Midwife",
  midwife: "Nurse/Midwife",
  midwives: "Nurse/Midwife",
  "nurse midwife": "Nurse/Midwife",
  "nurse-midwife": "Nurse/Midwife",
  "nurse/midwife": "Nurse/Midwife",
  "nurse_midwife": "Nurse/Midwife",
  nursemidwife: "Nurse/Midwife",
  triage: "Triage",
  // Front of house
  reception: "Reception",
  receptionist: "Reception",
  "front office": "Reception",
  // Money
  billing: "Billing",
  cashier: "Cashier",
  accounts: "Billing",
  // Admin / ward
  admin: "Administration",
  administrator: "Administration",
  administration: "Administration",
  ward: "Ward",
  inpatient: "Ward",
  "in patient": "Ward",
};

/**
 * Canonical form of any department string the app might hand us. Accepts
 * casing, underscore/dash/spacing variants and the historical role names.
 * Returns null for anything unrecognised so callers can reject it rather than
 * write a value no inbox will ever match.
 */
export function normalizeDept(value: string | null | undefined): CanonicalDepartment | null {
  if (value === null || value === undefined) return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;

  if (ALIASES[key]) return ALIASES[key];

  // "Radiology / Sonography", "Nurse - Midwife", "X_RAY" and friends reduce to
  // the same key once separators go, so try that shape before giving up.
  const collapsed = key.replace(/[\s/_-]+/g, "");
  if (ALIASES[collapsed]) return ALIASES[collapsed];

  // Already canonical, just wrongly cased ("dOcToR").
  const match = CANONICAL_DEPARTMENTS.find(
    (d) => d.toLowerCase() === key
  );
  return match ?? null;
}

/**
 * Every stored spelling that belongs in one inbox: the canonical value first,
 * then the legacy variants that are already sitting in the table.
 *
 * The Radiology row serves radiologists AND sonographers (ROLE_ROUTES sends
 * all three imaging roles to /radiologist_sonographer), so that one inbox
 * accepts both.
 *
 * These are enumerated rather than matched with `mode: "insensitive"` on
 * purpose: the composite index on [department, createdAt] is a b-tree, and
 * Postgres cannot use a b-tree for ILIKE, so an insensitive comparison would
 * turn every 30-second inbox poll across seven inboxes into a seq scan. Plain
 * equality keeps the index.
 *
 * If the data is ever backfilled to canonical values —
 *   UPDATE "Notification" SET "department" = <canonical> WHERE "department" ILIKE '...'
 * — this table shrinks to one entry per inbox. That backfill is deliberately
 * not a required step; the variants here are what make the rows written by
 * earlier, broken releases visible without touching the database.
 */
const STORED_VARIANTS: Record<CanonicalDepartment, string[]> = {
  Doctor: ["Doctor", "DOCTOR"],
  Laboratory: ["Laboratory", "LAB", "LABORATORY"],
  Radiology: [
    "Radiology",
    "Sonography",
    "RADIOLOGY",
    "SONOGRAPHY",
    "Radiology / Sonography",
  ],
  Sonography: ["Sonography", "SONOGRAPHY"],
  Pharmacy: ["Pharmacy", "PHARMACY"],
  Dentist: ["Dentist", "DENTIST", "Dental"],
  "Nurse/Midwife": [
    "Nurse/Midwife",
    "NURSE",
    "NURSE_MIDWIFE",
    "Nurse",
    "Midwife",
    "Triage",
    "TRIAGE",
  ],
  Triage: ["Triage", "TRIAGE", "Nurse", "Nurse/Midwife", "NURSE"],
  Reception: ["Reception", "RECEPTION"],
  Billing: ["Billing", "Cashier", "CASHIER"],
  Cashier: ["Cashier", "CASHIER", "Billing"],
  Administration: ["Administration", "Admin", "ADMIN", "Administrator"],
  Ward: ["Ward", "WARD"],
};

/** Every stored spelling that belongs in the given department's inbox. */
export function deptStoredVariants(dept: string | null | undefined): string[] {
  const canon = normalizeDept(dept);
  if (!canon) return [];
  return STORED_VARIANTS[canon] ?? [canon];
}

/**
 * Prisma `where` fragment matching every notification addressed to a
 * department. Spread it into an existing where object rather than replacing
 * it, so it composes with other predicates:
 *
 *   prisma.notification.findMany({ where: { ...notificationDeptWhere("Doctor"), isRead: false } })
 *
 * An absent or blank department returns `{}` — unfiltered — which preserves
 * the behaviour the cleaner page and the admin tooling rely on.
 */
export function notificationDeptWhere(
  dept: string | null | undefined
): Prisma.NotificationWhereInput {
  const variants = deptStoredVariants(dept);
  if (variants.length === 0) return {};
  if (variants.length === 1) return { department: variants[0] };
  return { OR: variants.map((v) => ({ department: v })) };
}
