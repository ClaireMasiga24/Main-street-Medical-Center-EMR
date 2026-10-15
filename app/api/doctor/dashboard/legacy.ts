import { prisma } from "../../../lib/prisma";
import { AWAITING_RETURN_DEPTS } from "../../../lib/encounterUtils";
import { notificationDeptWhere } from "../../../lib/departments";
import { PatientStatus, Prisma } from "@prisma/client";

/**
 * The original, multi-query implementation of the doctor dashboard.
 *
 * GET /api/doctor/dashboard now answers from the doctor_dashboard() SQL
 * function (prisma/migrations/20250323000000_doctor_dashboard_rpc), which
 * returns an identical payload in a single round trip instead of the 6-8
 * statements this file issues. This is kept as the fallback for the two ways
 * the RPC can be unavailable:
 *
 *   1. the code was deployed before the migration was applied, and
 *   2. the database role the app connects as was not granted EXECUTE, because
 *      the migration revokes the default PUBLIC grant so this patient-data RPC
 *      is not reachable over PostgREST.
 *
 * Neither is worth a doctor losing their queue over, so the route catches the
 * RPC failure, logs it, and replays this instead. It is slower — that is the
 * whole reason the RPC exists — but it is correct, and it is what served this
 * endpoint until now.
 *
 * Keep the two in step: the predicates and JSON field names below are the
 * source the SQL function was copied from.
 */

/**
 * The response contract for GET /api/doctor/dashboard, shared by the RPC path
 * in route.ts and the fallback below so both are held to the same shape.
 * Element types are deliberately loose — the two producers build their rows
 * independently and the page owns its own interfaces for them.
 */
export type DashboardPayload = {
  patients: unknown[];
  awaitingReturn: unknown[];
  metrics: {
    awaitingDoctor: number;
    inConsultation: number;
    completedToday: number;
    pendingLabs: number;
    pendingRadiology: number;
    todayAppointments: number;
    admittedPatients: number;
  };
  clinicalUpdates: unknown[];
  truncated: boolean;
};

// Map old Patient.lastSharedFromDept values back to a source label for the fallback
const DEPT_SOURCE_MAP: Record<string, { label: string; icon: string }> = {
  "Lab":          { label: "Lab Referral",          icon: "microscope" },
  "Lab Referral": { label: "Lab Referral",          icon: "microscope" },
  "Radiology":    { label: "Radiology Referral",    icon: "radio" },
  "Sonography":   { label: "Sonography Referral",   icon: "waves" },
  "Dentist":      { label: "Dentist Referral",      icon: "stethoscope" },
  "Nurse/Midwife":{ label: "Nurse Referral",        icon: "activity" },
  "Nurse":        { label: "Nurse Referral",        icon: "activity" },
};

function inferSource(p: any): string {
  if (p.isEmergency) return "Emergency";
  if (p.lastSharedFromDept) return DEPT_SOURCE_MAP[p.lastSharedFromDept]?.label || "Follow-up";
  return "Triage";
}

/**
 * One clinical update row.
 *
 * Built in one place because both branches below produce this list, and they
 * had already drifted once. The notification's own `type` and the record it
 * points at (`referenceId` / `referenceType`) are carried through on purpose:
 * the Clinical Updates panel needs to know that a "Lab Results Ready" item is
 * about one specific lab request, so clicking it opens that result instead of
 * dropping the doctor on page one of the consultation.
 *
 * `patientName` is "first last"; the page decides how to print it.
 */
function toClinicalUpdate(n: {
  id: number;
  title: string | null;
  message: string | null;
  type: string;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  patientId: number | null;
  createdAt: Date;
  Patient?: { firstName: string; lastName: string; patientNumber: string } | null;
}) {
  return {
    id: String(n.id),
    type: n.type || "COMMUNICATION",
    title: n.title ?? "Update",
    message: n.message ?? "",
    patientName: n.Patient
      ? `${n.Patient.firstName} ${n.Patient.lastName}`.replace(/\s+/g, " ").trim()
      : "",
    patientId: n.patientId ?? 0,
    patientNumber: n.Patient?.patientNumber ?? "",
    referenceId: n.referenceId ?? null,
    referenceType: n.referenceType ?? null,
    isRead: n.isRead,
    timestamp: n.createdAt.toISOString(),
    severity: "info" as "critical" | "info",
  };
}

// ─── Stats cache ─────────────────────────────────────────────────────────────
// These counts move on the order of minutes — a patient gets seen, a lab comes
// back — but the dashboard polls every 15s from every open tab, and against a
// database ~1.3s of round-trip latency away those counts are the expensive part
// of the request. Caching them for 15s makes repeat polls inside the window free
// without making the numbers feel stale to a doctor.
//
// Keyed by doctor id because completedToday is scoped per doctor. Module-scoped
// on purpose: it resets when the dev server reloads, which is just a cold cache.
type DashboardMetrics = {
  awaitingDoctor: number;
  inConsultation: number;
  completedToday: number;
  pendingLabs: number;
  pendingRadiology: number;
  todayAppointments: number;
  admittedPatients: number;
};

/**
 * The counts that are genuinely statistics — read from the database as they
 * are. `awaitingDoctor` is deliberately absent: it is the length of the queue
 * this call returns, so the Waiting card and the list under it are one
 * measurement instead of two that can drift.
 *
 * Typing the cache on the narrower shape is the point — a cached number can
 * never be replayed in place of a live queue length, because the length is
 * never read from the cache in the first place.
 */
type CachedCounts = Omit<DashboardMetrics, "awaitingDoctor">;

const STATS_TTL_MS = 15_000;
const statsCache = new Map<string, { at: number; value: CachedCounts }>();

function cachedStats(key: string, load: () => Promise<CachedCounts>): Promise<CachedCounts> {
  const hit = statsCache.get(key);
  if (hit && Date.now() - hit.at < STATS_TTL_MS) return Promise.resolve(hit.value);
  return load()
    .then((value) => {
      statsCache.set(key, { at: Date.now(), value });
      return value;
    })
    // Don't cache a failure: the next poll should retry rather than replay it.
    .catch((err) => {
      statsCache.delete(key);
      throw err;
    });
}

export async function loadDashboardLegacy(opts: {
  statusFilter: string;
  doctorId: number | null;
}): Promise<DashboardPayload> {
  try {
    const { statusFilter, doctorId } = opts;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 3600000 * 24);

    // ── Step 1: try encounter-based query ───────────────────────────────────
    const statuses: string[] = ["AWAITING_DOCTOR", "IN_CONSULTATION"];

    // LabRequest / ImagingRequest / Appointment are deliberately NOT included
    // here. They were fetched as up-to-5 rows each and then read with .length,
    // costing three extra statements per query purely to compute a number — and
    // capping the badge at 5. They now come from one grouped UNION ALL below.
    // Triage and Visit stay: they feed chiefComplaint and esiLevel.
    const QUEUE_CAP = 500;

    // These four are independent of each other, so they go out concurrently.
    // Previously they were awaited one at a time, and each Prisma `include`
    // with a nested `take: 1` fans out into 3-4 separate statements against
    // the pooler — so the dashboard was paying ~12 serialised round trips per
    // 15s poll, which is what tipped the shared pool over (P2024). Each block
    // below is now ONE statement via a LATERAL join, and it selects only the
    // columns the UI renders.
    type QueueRow = {
      encId: number;
      isEmergency: boolean;
      currentStatus: string;
      currentOwnerDept: string;
      lastSharedFromDept: string | null;
      updatedAt: Date;
      chiefComplaint: string | null;
      esiLevel: number | null;
      triageCompletedAt: Date | null;
      source: string;
      patientId: number;
      patientNumber: string;
      firstName: string;
      lastName: string;
      gender: string;
      age: number;
      phoneNumber: string | null;
      triageChiefComplaint: string | null;
      triageEsiLevel: number | null;
      triageCreatedAt: Date | null;
      visitSymptoms: string | null;
    };

    const [
      queueRows,
      awaitingReturnRows,
      encounterMetrics,
      recentNotifications,
    ] = await Promise.all([
      prisma.$queryRaw<QueueRow[]>(Prisma.sql`
        SELECT
          e.id                    AS "encId",
          e."isEmergency"         AS "isEmergency",
          e."currentStatus"       AS "currentStatus",
          e."currentOwnerDept"    AS "currentOwnerDept",
          e."lastSharedFromDept"  AS "lastSharedFromDept",
          e."updatedAt"           AS "updatedAt",
          e."chiefComplaint"      AS "chiefComplaint",
          e."esiLevel"            AS "esiLevel",
          e."triageCompletedAt"   AS "triageCompletedAt",
          e.source                AS "source",
          p.id                    AS "patientId",
          p."patientNumber"       AS "patientNumber",
          p."firstName"           AS "firstName",
          p."lastName"            AS "lastName",
          p.gender                AS "gender",
          p.age                   AS "age",
          p."phoneNumber"         AS "phoneNumber",
          t."chiefComplaint"      AS "triageChiefComplaint",
          t."esiLevel"            AS "triageEsiLevel",
          t."createdAt"           AS "triageCreatedAt",
          v.symptoms              AS "visitSymptoms"
        FROM "Encounter" e
        JOIN "Patient" p ON p.id = e."patientId"
        LEFT JOIN LATERAL (
          SELECT "chiefComplaint", "esiLevel", "createdAt"
          FROM "Triage"
          WHERE "patientId" = p.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) t ON TRUE
        LEFT JOIN LATERAL (
          SELECT symptoms
          FROM "Visit"
          WHERE "patientId" = p.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) v ON TRUE
        WHERE e."currentOwnerDept" = 'DOCTOR'
          AND e."currentStatus" = ANY(${statusFilter ? [statusFilter] : statuses}::text[])
          AND e.status = 'ACTIVE'
        ORDER BY e."isEmergency" DESC, e."updatedAt" DESC
        LIMIT ${QUEUE_CAP + 1}
      `),

      prisma.$queryRaw<QueueRow[]>(Prisma.sql`
        SELECT
          e.id                    AS "encId",
          e."isEmergency"         AS "isEmergency",
          e."currentStatus"       AS "currentStatus",
          e."currentOwnerDept"    AS "currentOwnerDept",
          e."lastSharedFromDept"  AS "lastSharedFromDept",
          e."updatedAt"           AS "updatedAt",
          e."chiefComplaint"      AS "chiefComplaint",
          e."esiLevel"            AS "esiLevel",
          e."triageCompletedAt"   AS "triageCompletedAt",
          e.source                AS "source",
          p.id                    AS "patientId",
          p."patientNumber"       AS "patientNumber",
          p."firstName"           AS "firstName",
          p."lastName"            AS "lastName",
          p.gender                AS "gender",
          p.age                   AS "age",
          p."phoneNumber"         AS "phoneNumber",
          t."chiefComplaint"      AS "triageChiefComplaint",
          t."esiLevel"            AS "triageEsiLevel",
          t."createdAt"           AS "triageCreatedAt",
          v.symptoms              AS "visitSymptoms"
        FROM "Encounter" e
        JOIN "Patient" p ON p.id = e."patientId"
        LEFT JOIN LATERAL (
          SELECT "chiefComplaint", "esiLevel", "createdAt"
          FROM "Triage"
          WHERE "patientId" = p.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) t ON TRUE
        LEFT JOIN LATERAL (
          SELECT symptoms
          FROM "Visit"
          WHERE "patientId" = p.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) v ON TRUE
        WHERE e.status = 'ACTIVE'
          AND e."currentOwnerDept" = ANY(${[...AWAITING_RETURN_DEPTS]}::text[])
          -- "the doctor engaged it" == it carries a ClinicalNote.
          AND EXISTS (SELECT 1 FROM "ClinicalNote" c2 WHERE c2."encounterId" = e.id)
        ORDER BY e."updatedAt" ASC
        LIMIT 25
      `),

      // Six of the seven counts, in one statement. awaitingDoctor is not one of
      // them any more: it is the length of the patient list this call returns,
      // so it is taken at the bottom of each branch rather than counted here.
      cachedStats(`encounter:${doctorId ?? "all"}`, async () => {
        const [m] = await prisma.$queryRaw<
          Array<{
            in_consultation: bigint;
            completed_today: bigint;
            pending_labs: bigint;
            pending_radiology: bigint;
            today_appointments: bigint;
            admitted_patients: bigint;
          }>
        >(Prisma.sql`
          SELECT
            (SELECT COUNT(*) FROM "Encounter"
              WHERE "currentOwnerDept" = 'DOCTOR' AND "currentStatus" = 'IN_CONSULTATION' AND "status" = 'ACTIVE') AS in_consultation,
            (SELECT COUNT(*) FROM "Visit"
              WHERE "createdAt" >= ${today} AND "createdAt" < ${todayEnd}
                AND "diagnosis" IS NOT NULL
                AND (${doctorId ?? null}::int IS NULL OR "doctorId" = ${doctorId ?? null})) AS completed_today,
            (SELECT COUNT(*) FROM "LabRequest" l
              WHERE l."status" NOT IN ('COMPLETED','REJECTED')
                AND EXISTS (SELECT 1 FROM "Encounter" e
                            WHERE e.id = l."encounterId"
                              AND e."currentOwnerDept" = 'DOCTOR' AND e."status" = 'ACTIVE')) AS pending_labs,
            (SELECT COUNT(*) FROM "ImagingRequest" i
              WHERE i."status" NOT IN ('REPORTED','CANCELLED')
                AND EXISTS (SELECT 1 FROM "Encounter" e
                            WHERE e.id = i."encounterId"
                              AND e."currentOwnerDept" = 'DOCTOR' AND e."status" = 'ACTIVE')) AS pending_radiology,
            (SELECT COUNT(*) FROM "Appointment"
              WHERE "appointmentDate" >= ${today} AND "appointmentDate" < ${todayEnd}
                AND "department" = 'Doctor' AND "status" <> 'CANCELLED') AS today_appointments,
            (SELECT COUNT(*) FROM "Patient" WHERE "currentStatus" = 'ADMITTED') AS admitted_patients
        `);
        // COUNT(*) comes back as BigInt; JSON.stringify throws on BigInt.
        return {
          inConsultation: Number(m.in_consultation),
          completedToday: Number(m.completed_today),
          pendingLabs: Number(m.pending_labs),
          pendingRadiology: Number(m.pending_radiology),
          todayAppointments: Number(m.today_appointments),
          admittedPatients: Number(m.admitted_patients),
        };
      }),

      prisma.notification.findMany({
        where: {
          // Alias-aware: matches legacy spellings ("DOCTOR") as well as the
          // canonical one, so shared results from earlier releases show up.
          ...notificationDeptWhere("Doctor"),
          patientId: { not: null },
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        // The panel names the patient on each item, and a lab-result item has
        // to carry the request it is about so clicking it can open that result
        // instead of the consultation. Both are joined here rather than looked
        // up per row on the page.
        include: {
          Patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        },
      }),
    ]);

    let encounters = queueRows.map((r) => ({
      id: r.encId,
      isEmergency: r.isEmergency,
      currentStatus: r.currentStatus,
      currentOwnerDept: r.currentOwnerDept,
      lastSharedFromDept: r.lastSharedFromDept,
      updatedAt: r.updatedAt,
      chiefComplaint: r.chiefComplaint,
      esiLevel: r.esiLevel,
      triageCompletedAt: r.triageCompletedAt,
      source: r.source,
      patient: {
        id: r.patientId,
        patientNumber: r.patientNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        gender: r.gender,
        age: r.age,
        phoneNumber: r.phoneNumber,
        Triage: r.triageCreatedAt
          ? [{ chiefComplaint: r.triageChiefComplaint, esiLevel: r.triageEsiLevel, createdAt: r.triageCreatedAt }]
          : [],
        Visit: r.visitSymptoms !== null ? [{ symptoms: r.visitSymptoms }] : [],
      },
    }));

    // The doctor-first re-sort below runs after the database take, so a capped
    // queue could otherwise hide a doctor-registered patient. Surface it instead.
    const truncated = encounters.length > QUEUE_CAP;
    if (truncated) encounters = encounters.slice(0, QUEUE_CAP);

    // Sort: doctor-registered patients first, then by most-recently-updated
    encounters.sort((a, b) => {
      const aIsDocReg = a.source === "Doctor Registration" ? 1 : 0;
      const bIsDocReg = b.source === "Doctor Registration" ? 1 : 0;
      if (aIsDocReg !== bIsDocReg) return bIsDocReg - aIsDocReg;
      return 0; // Rest already sorted by Prisma: emergency desc, updatedAt desc
    });

    // ── Step 1b: patients the doctor engaged but never finished ─────────────
    // An encounter that the doctor opened (it carries a ClinicalNote) and then
    // handed to a department that can hand it back. CASHIER is deliberately
    // excluded: routing to the cashier is what pressing "Finish Consultation"
    // does, so anything sitting at the cashier HAS been finished.
    //
    // AWAITING_RETURN_DEPTS now lives in @/app/lib/encounterUtils so the
    // doctor-side follow-up guard reads this same list. Identical values.
    const AWAITING_RETURN_LABELS: Record<string, string> = {
      LAB: "Laboratory",
      LABORATORY: "Laboratory",
      SONOGRAPHY: "Sonography",
      RADIOLOGY: "Radiology",
      NURSE: "Nurse / Midwife",
      NURSE_MIDWIFE: "Nurse / Midwife",
      PHARMACY: "Pharmacy",
      DENTIST: "Dentist",
    };

    const awaitingReturnEncounters = awaitingReturnRows.map((r) => ({
      id: r.encId,
      isEmergency: r.isEmergency,
      currentStatus: r.currentStatus,
      currentOwnerDept: r.currentOwnerDept,
      lastSharedFromDept: r.lastSharedFromDept,
      updatedAt: r.updatedAt,
      chiefComplaint: r.chiefComplaint,
      esiLevel: r.esiLevel,
      triageCompletedAt: r.triageCompletedAt,
      source: r.source,
      patient: {
        id: r.patientId,
        patientNumber: r.patientNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        gender: r.gender,
        age: r.age,
        phoneNumber: r.phoneNumber,
        Triage: r.triageCreatedAt
          ? [{ chiefComplaint: r.triageChiefComplaint, esiLevel: r.triageEsiLevel, createdAt: r.triageCreatedAt }]
          : [],
        Visit: r.visitSymptoms !== null ? [{ symptoms: r.visitSymptoms }] : [],
      },
    }));

    // If we have encounters, use them (new flow). Otherwise fall back to
    // the old Patient-based query for existing data.
    if (encounters.length > 0) {
      // ── Metrics (encounter-based) ───────────────────────────────────────
      // One grouped statement, run as part of the concurrent batch at the top
      // of the handler and cached for 15s (see cachedStats above).
      //
      // Predicates are copied verbatim from the original seven count() calls,
      // less awaitingDoctor (see below). Note pendingLabs here uses NOT IN
      // ('COMPLETED','REJECTED') which is NOT the same as the per-patient badge
      // predicate (status <> 'COMPLETED') further down. That discrepancy is
      // pre-existing and preserved deliberately.
      const {
        inConsultation,
        completedToday,
        pendingLabs,
        pendingRadiology,
        todayAppointments,
        admittedPatients,
      } = encounterMetrics;

      // Per-patient pending lab / imaging counts and today's earliest doctor
      // appointment, resolved in ONE grouped statement for every patient in the
      // response. See patientExtras below.
      type PatientExtra = { labs: number; imaging: number; appointment: Date | null };

      const decorateEncounter = (
        e: {
          id: number;
          isEmergency: boolean;
          currentStatus: string;
          lastSharedFromDept: string | null;
          updatedAt: Date;
          chiefComplaint: string | null;
          esiLevel: number | null;
          triageCompletedAt: Date | null;
          source: string;
          patient: any;
        },
        extras: Map<number, PatientExtra>
      ) => {
        const p = e.patient;
        const triage = p.Triage?.[0];
        const visit = p.Visit?.[0];
        const extra = extras.get(p.id);
        const waitingMs = now - new Date(e.updatedAt).getTime();
        const waitingMinutes = Math.floor(waitingMs / 60000);
        const waitingDisplay =
          waitingMinutes < 1 ? "Just now"
          : waitingMinutes < 60 ? `${waitingMinutes}m`
          : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

        return {
          id: p.id,
          encounterId: e.id,
          patientNumber: p.patientNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          age: p.age,
          phoneNumber: p.phoneNumber ?? null,
          isEmergency: e.isEmergency,
          currentStatus: e.currentStatus,
          lastSharedFromDept: e.lastSharedFromDept ?? null,
          updatedAt: e.updatedAt.toISOString(),
          waitingMinutes,
          waitingDisplay,
          chiefComplaint: e.chiefComplaint ?? triage?.chiefComplaint ?? visit?.symptoms ?? "",
          esiLevel: e.esiLevel ?? triage?.esiLevel ?? null,
          triageCompletedAt: e.triageCompletedAt?.toISOString() ?? triage?.createdAt?.toISOString() ?? null,
          source: e.source,
          pendingLabs: extra?.labs ?? 0,
          pendingImaging: extra?.imaging ?? 0,
          hasAppointment: !!extra?.appointment,
          appointmentTime: extra?.appointment?.toISOString() ?? null,
        };
      };

      // ── Union safety net ───────────────────────────────────────────────
      // A patient can be flagged as the doctor's on the Patient row while their
      // encounter was never routed back (e.g. a lab request created without an
      // encounterId — the lab's "return to doctor" step then has nothing to
      // move). Without this safety net they are silently invisible, because the
      // encounter query above returns rows.
      //
      // Probed with a bare select first. The rich query costs seven statements
      // and in the normal case returns nothing at all, so it only runs when the
      // probe finds rows. No take here on purpose: a cap would drop the very
      // patients this net exists to rescue.
      // Scoped to the main queue only, exactly as before — "sent away" patients
      // are deliberately NOT excluded here, so they can still surface as orphans.
      // Changing that would alter which patients the doctor sees, which is a
      // behaviour change and not a performance one.
      const queuedIds = encounters.map((e) => e.patient.id);
      const orphanStatuses = (statusFilter ? [statusFilter] : statuses) as PatientStatus[];
      const orphanProbe = await prisma.patient.findMany({
        where: {
          currentStatus: { in: orphanStatuses },
          id: { notIn: queuedIds },
        },
        orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
        select: { id: true },
      });
      const orphanIds = orphanProbe.map((p) => p.id);

      // ── One grouped statement for pending labs / imaging / appointments ──
      // Replaces three nested includes per query. Scoped to every patient that
      // can appear in the response, so orphan patients are not left with zeros.
      const patientExtras = new Map<number, PatientExtra>();
      const allPatientIds = [
        ...new Set([
          ...queuedIds,
          ...awaitingReturnEncounters.map((e) => e.patient.id),
          ...orphanIds,
        ]),
      ];
      if (allPatientIds.length > 0) {
        const rows = await prisma.$queryRaw<
          Array<{ patientId: number; kind: string; n: number; at: Date | null }>
        >(Prisma.sql`
          SELECT "patientId", 'lab'::text AS kind, COUNT(*)::int AS n, NULL::timestamptz AS at
            FROM "LabRequest"
            WHERE "patientId" = ANY(${allPatientIds}::int[])
              AND "status" <> 'COMPLETED'::"LabStatus"
            GROUP BY "patientId"
          UNION ALL
          SELECT "patientId", 'img'::text, COUNT(*)::int, NULL::timestamptz
            FROM "ImagingRequest"
            WHERE "patientId" = ANY(${allPatientIds}::int[])
              AND "status" NOT IN ('REPORTED','CANCELLED')
            GROUP BY "patientId"
          UNION ALL
          SELECT "patientId", 'appt'::text, 1, MIN("appointmentDate")
            FROM "Appointment"
            WHERE "patientId" = ANY(${allPatientIds}::int[])
              AND "department" = 'Doctor'
              AND "appointmentDate" >= ${today} AND "appointmentDate" < ${todayEnd}
            GROUP BY "patientId"
        `);

        for (const id of allPatientIds) {
          patientExtras.set(id, { labs: 0, imaging: 0, appointment: null });
        }
        for (const row of rows) {
          const extra = patientExtras.get(row.patientId)!;
          if (row.kind === "lab") extra.labs = row.n;
          else if (row.kind === "img") extra.imaging = row.n;
          else if (row.kind === "appt") extra.appointment = row.at;
        }
      }

      const enrichedPatients = encounters.map((e) => decorateEncounter(e, patientExtras));

      // Rich orphan query, only now that we know there is something to fetch.
      const orphanPatients =
        orphanIds.length > 0
          ? await prisma.patient.findMany({
              where: { id: { in: orphanIds } },
              orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
              include: {
                Encounter: { where: { status: "ACTIVE" }, orderBy: { openedAt: "desc" }, take: 1 },
                Triage: { orderBy: { createdAt: "desc" }, take: 1 },
                Visit: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            })
          : [];

      const orphanRows = orphanPatients.map((p) => {
        const triage = p.Triage?.[0];
        const visit = p.Visit?.[0];
        const activeEncounter = p.Encounter?.[0] ?? null;
        const extra = patientExtras.get(p.id);
        const waitingMs = now - new Date(p.updatedAt).getTime();
        const waitingMinutes = Math.floor(waitingMs / 60000);
        const waitingDisplay =
          waitingMinutes < 1 ? "Just now"
          : waitingMinutes < 60 ? `${waitingMinutes}m`
          : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

        return {
          id: p.id,
          encounterId: activeEncounter?.id ?? 0,
          patientNumber: p.patientNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          age: p.age,
          phoneNumber: p.phoneNumber ?? null,
          isEmergency: p.isEmergency,
          currentStatus: p.currentStatus,
          lastSharedFromDept: p.lastSharedFromDept ?? null,
          updatedAt: p.updatedAt.toISOString(),
          waitingMinutes,
          waitingDisplay,
          chiefComplaint: activeEncounter?.chiefComplaint ?? triage?.chiefComplaint ?? visit?.symptoms ?? "",
          esiLevel: activeEncounter?.esiLevel ?? triage?.esiLevel ?? null,
          triageCompletedAt: activeEncounter?.triageCompletedAt?.toISOString() ?? triage?.createdAt?.toISOString() ?? null,
          source: inferSource(p),
          pendingLabs: extra?.labs ?? 0,
          pendingImaging: extra?.imaging ?? 0,
          hasAppointment: !!extra?.appointment,
          appointmentTime: extra?.appointment?.toISOString() ?? null,
        };
      });

      // One card per patient, and one count per card. A patient can hold two
      // ACTIVE encounters the doctor owns — encounters are reused for life, so
      // a repeat consultation leaves the old row open beside the new one — but
      // every number shown against this list measures patients: the "Patient
      // Queue (n)" heading, the sidebar badge and the Waiting card. Collapsing
      // here is what makes those three the same measurement.
      //
      // Queue rows win over orphan rows, which cannot currently collide (the
      // orphan probe excludes queued patients); the order keeps it true if they
      // ever can.
      const seenPatientIds = new Set<number>();
      const queuePatients = [...enrichedPatients, ...orphanRows].filter((p) => {
        if (seenPatientIds.has(p.id)) return false;
        seenPatientIds.add(p.id);
        return true;
      });

      // ── Sent away, not finished ────────────────────────────────────────
      const awaitingReturn = awaitingReturnEncounters.map((e) => {
        const base = decorateEncounter(e, patientExtras);
        const days = Math.floor(base.waitingMinutes / 1440);
        const hours = Math.floor((base.waitingMinutes % 1440) / 60);
        return {
          ...base,
          sentToDept: e.currentOwnerDept,
          sentToLabel: AWAITING_RETURN_LABELS[e.currentOwnerDept] ?? e.currentOwnerDept,
          sentSince: e.updatedAt.toISOString(),
          waitingDisplay: days > 0 ? `${days}d ${hours}h` : base.waitingDisplay,
        };
      });

      const clinicalUpdates = recentNotifications.map(toClinicalUpdate);

      return {
        patients: queuePatients,
        awaitingReturn,
        // awaitingDoctor is the queue's patient count, not a count over
        // "Encounter". The queue above also carries the orphan patients the
        // safety net rescues — a Patient flagged as the doctor's whose encounter
        // was never routed back, e.g. a lab referral created without an
        // encounterId — and those have no encounter row to be counted.
        metrics: { ...encounterMetrics, awaitingDoctor: queuePatients.length },
        clinicalUpdates,
        truncated,
      };
    }

    // ── Step 2: fallback — old Patient-based query (existing data) ─────────
    const fallbackWhere: any = {
      currentStatus: statusFilter ? { in: [statusFilter] } : { in: statuses },
    };
    // Fallback branch: the encounter queue is empty, so this patient-based query
    // runs instead. The patient list and the seven counts are independent and go
    // out together; the counts go through the same 15s cache as the encounter
    // branch so a 15s poll that lands inside the window costs one query, not
    // eight.
    const [fallbackPatients, fallbackMetrics] = await Promise.all([
      prisma.patient.findMany({
        where: fallbackWhere,
        orderBy: [{ isEmergency: "desc" }, { updatedAt: "asc" }],
        take: QUEUE_CAP,
        include: {
          Encounter: {
            where: { status: "ACTIVE" },
            orderBy: { openedAt: "desc" },
            take: 1,
          },
          Triage: { orderBy: { createdAt: "desc" }, take: 1 },
          Visit: { orderBy: { createdAt: "desc" }, take: 1 },
          LabRequest: {
            where: { status: { not: "COMPLETED" } },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          ImagingRequest: {
            where: { status: { notIn: ["REPORTED", "CANCELLED"] } },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          Appointment: {
            where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor" },
            take: 1,
            orderBy: { appointmentDate: "asc" },
          },
        },
      }),
      cachedStats(`fallback:${doctorId ?? "all"}`, async () => {
        const [
          inCons,
          completedToday,
          pendingLabs,
          pendingRadiology,
          todayAppointments,
          admittedPatients,
        ] = await Promise.all([
          prisma.patient.count({
            where: { currentStatus: "IN_CONSULTATION" },
          }),
          prisma.visit.count({
            where: {
              createdAt: { gte: today, lt: todayEnd },
              diagnosis: { not: null },
              ...(doctorId ? { doctorId } : {}),
            },
          }),
          prisma.labRequest.count({
            where: {
              status: { notIn: ["COMPLETED", "REJECTED"] },
              Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
            },
          }),
          prisma.imagingRequest.count({
            where: {
              status: { notIn: ["REPORTED", "CANCELLED"] },
              Patient: { currentStatus: { in: ["AWAITING_DOCTOR", "IN_CONSULTATION"] } },
            },
          }),
          prisma.appointment.count({
            where: { appointmentDate: { gte: today, lt: todayEnd }, department: "Doctor", status: { not: "CANCELLED" } },
          }),
          prisma.patient.count({
            where: { currentStatus: "ADMITTED" },
          }),
        ]);
        return {
          inConsultation: inCons,
          completedToday,
          pendingLabs,
          pendingRadiology,
          todayAppointments,
          admittedPatients,
        };
      }),
    ]);

    const enriched = fallbackPatients.map((p) => {
      const triage = p.Triage?.[0];
      const visit = p.Visit?.[0];
      const activeEncounter = p.Encounter?.[0] ?? null;
	      const waitingMs = now - new Date(p.updatedAt).getTime();
	      const waitingMinutes = Math.floor(waitingMs / 60000);
	      const waitingDisplay =
	        waitingMinutes < 1 ? "Just now"
	        : waitingMinutes < 60 ? `${waitingMinutes}m`
	        : `${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}m`;

      return {
	        id: p.id,
	        encounterId: activeEncounter?.id ?? 0,
	        patientNumber: p.patientNumber,
	        firstName: p.firstName,
	        lastName: p.lastName,
	        gender: p.gender,
	        age: p.age,
	        phoneNumber: p.phoneNumber ?? null,
	        isEmergency: p.isEmergency,
	        currentStatus: p.currentStatus,
	        lastSharedFromDept: p.lastSharedFromDept ?? null,
	        updatedAt: p.updatedAt.toISOString(),
	        waitingMinutes,
	        waitingDisplay,
	        chiefComplaint: triage?.chiefComplaint ?? visit?.symptoms ?? "",
	        esiLevel: triage?.esiLevel ?? null,
	        triageCompletedAt: triage?.createdAt?.toISOString() ?? null,
	        source: inferSource(p),
	        pendingLabs: p.LabRequest?.length ?? 0,
	        pendingImaging: p.ImagingRequest?.length ?? 0,
	        hasAppointment: (p.Appointment?.length ?? 0) > 0,
	        appointmentTime: p.Appointment?.[0]?.appointmentDate?.toISOString() ?? null,
	      };
	    });

    const clinicalUpdates = recentNotifications.map(toClinicalUpdate);

    return {
      patients: enriched,
      awaitingReturn: [],
      // Same rule as the encounter branch: the count is the list. This branch
      // already builds its list from the same Patient rows the count used, so
      // taking the length makes the Waiting card and the queue one measurement.
      metrics: { ...fallbackMetrics, awaitingDoctor: enriched.length },
      clinicalUpdates,
      truncated: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof Object && "code" in err ? (err as any).code : undefined;
    const meta = err instanceof Object && "meta" in err ? (err as any).meta : undefined;
    console.error("[doctor/dashboard legacy] Error:", message);
    if (code) console.error("[doctor/dashboard legacy] Error code:", code);
    if (meta?.cause) console.error("[doctor/dashboard legacy] Error cause:", meta.cause);
    // The route turns a throw here into the 500 the page knows how to handle.
    throw err;
  }
}
