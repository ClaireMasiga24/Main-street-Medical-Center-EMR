/**
 * One doctor submission = one laboratory card.
 *
 * A doctor ordering six investigations writes six `LabRequest` rows, and the
 * laboratory queue used to render six cards for the same patient, same visit,
 * same doctor. Everything a technician needs to judge priority (who, when, how
 * many tests) was repeated six times, and the one test that was urgent was easy
 * to lose in the wall of cards.
 *
 * The rows of a submission share `LabRequest.requestGroupId`, written by the
 * doctor routes that create them. Rows written before that column existed (and
 * rows created by the single-test paths — triage, dental, nurse-share, the
 * laboratory's own recorder) carry no id, so they fall back to a key built from
 * patient + requesting doctor + encounter/visit + creation minute. Rows created
 * by one `createMany` statement share a statement timestamp, so the minute
 * bucket is exact for a batch and never merges two visits (the encounter/visit
 * part of the key separates those).
 *
 * Every test keeps its own record, specimen, results and rejection — grouping
 * happens at display time only.
 */

/** Where one test sits in the workflow, from the technician's point of view. */
export type LabTestStatus = "PENDING" | "COLLECTED" | "PROCESSING" | "RESULTED" | "REJECTED";

/**
 * Where a whole request sits.
 * - ACTIVE: at least one test still needs work — shown in the Active Queue.
 * - COMPLETED: every test is finished (resulted, or rejected) and at least one
 *   produced a result — shown under Completed.
 * - REJECTED: every single test was rejected — shown under Rejected.
 */
export type LabGroupStatus = "ACTIVE" | "COMPLETED" | "REJECTED";

/**
 * The subset of a lab request the grouping needs. Deliberately structural, so
 * the laboratory page can pass its richer `LabRequestItem` straight in and get
 * its own type back out.
 */
export interface LabRequestGroupSource {
  id: number;
  patientId: number;
  patientNumber?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  ageUnit?: string;
  gender?: string;
  isEmergency?: boolean;
  testName: string;
  status: string;
  priority: string;
  isCritical?: boolean;
  results?: string | null;
  resultEnteredAt?: string | null;
  specimenRejected?: boolean;
  specimenId?: string | null;
  specimenCollectedAt?: string | null;
  processingStartedAt?: string | null;
  requestGroupId?: string | null;
  encounterId?: number | null;
  visitId?: number | null;
  requestedById?: number | null;
  requestedBy?: string;
  requestedDepartment?: string;
  clinicalNotes?: string | null;
  referralNotes?: string | null;
  createdAt: string;
}

export interface LabRequestGroup<T extends LabRequestGroupSource = LabRequestGroupSource> {
  /** Stable identity of the group — use it as the React key. */
  key: string;
  requestGroupId: string | null;
  patientId: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  ageUnit: string;
  gender: string;
  isEmergency: boolean;
  /** Earliest test in the group. */
  createdAt: string;
  /** Highest urgency across the group: STAT > URGENT > ROUTINE. */
  priority: string;
  requestedBy: string;
  requestedDepartment: string;
  clinicalNotes: string | null;
  /** True when any test in the group reported a critical value. */
  isCritical: boolean;
  tests: T[];
  status: LabGroupStatus;
  /** Tests that produced a result — the "3 of 6 resulted" numerator. */
  resultedCount: number;
  /** Tests rejected without a result. */
  rejectedCount: number;
}

const PRIORITY_RANK: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };

/** Same ranking the queue sorts by: STAT, then URGENT, then ROUTINE. */
export function labPriorityRank(priority: string | null | undefined): number {
  return PRIORITY_RANK[priority ?? ""] ?? 99;
}

/**
 * A test has produced a result once the technician saves Step 2, which moves it
 * to AWAITING_VALIDATION. Completed/validated counts too. `resultEnteredAt` is
 * the authoritative marker — the status check is there for rows written by an
 * older release that set results without it.
 */
export function labTestHasResult(r: LabRequestGroupSource): boolean {
  if (r.resultEnteredAt) return true;
  return r.status === "AWAITING_VALIDATION" || r.status === "COMPLETED";
}

export function labTestStatus(r: LabRequestGroupSource): LabTestStatus {
  // Rejection wins over everything: a rejected test never produces a result.
  if (r.specimenRejected || r.status === "REJECTED") return "REJECTED";
  if (labTestHasResult(r)) return "RESULTED";
  if (r.status === "PROCESSING" || r.processingStartedAt) return "PROCESSING";
  if (r.status === "SPECIMEN_COLLECTED" || r.specimenCollectedAt) return "COLLECTED";
  return "PENDING";
}

/** Short label for the per-test badge on a card. */
export function labTestStatusLabel(status: LabTestStatus): string {
  switch (status) {
    case "COLLECTED": return "Collected";
    case "PROCESSING": return "Processing";
    case "RESULTED": return "Resulted";
    case "REJECTED": return "Rejected";
    default: return "Pending";
  }
}

/** True for tests that are neither resulted nor rejected — still work to do. */
export function labTestIsOpen(r: LabRequestGroupSource): boolean {
  const status = labTestStatus(r);
  return status !== "RESULTED" && status !== "REJECTED";
}

/**
 * Group status, derived from the tests rather than stored.
 *
 * "All rejected" only when every test is rejected — a group with one rejected
 * test and the rest resulted is finished, not rejected, and must not sit in the
 * Rejected bucket as if the whole order had been thrown away.
 */
export function labGroupStatus(tests: LabRequestGroupSource[]): LabGroupStatus {
  if (tests.length === 0) return "ACTIVE";
  if (tests.every(t => labTestStatus(t) === "REJECTED")) return "REJECTED";
  const finished = tests.every(t => {
    const status = labTestStatus(t);
    return status === "RESULTED" || status === "REJECTED";
  });
  return finished ? "COMPLETED" : "ACTIVE";
}

const MINUTE_MS = 60_000;

/**
 * The key two rows must share to be drawn as one card.
 *
 * The explicit id wins whenever it is there — it is the only thing that can
 * tell two same-minute submissions apart. Without it (older rows), fall back to
 * patient + requesting doctor + encounter AND visit + minute. Deliberately NOT
 * patient alone, and deliberately not encounter alone either: the doctor routes
 * set one encounter for the whole consultation while each lab order carries its
 * own visit, so two orders raised in the same encounter (the real "Malaria RDT
 * then a full workup" case) share an encounterId and must still be two cards.
 */
export function labRequestGroupKey(r: LabRequestGroupSource): string {
  if (r.requestGroupId) return `group:${r.requestGroupId}`;
  const created = new Date(r.createdAt).getTime();
  const minute = Number.isFinite(created) ? Math.floor(created / MINUTE_MS) : 0;
  const encounter = r.encounterId != null ? `e${r.encounterId}` : "e-";
  const visit = r.visitId != null ? `v${r.visitId}` : "v-";
  return `fallback:${r.patientId}:${r.requestedById ?? "none"}:${encounter}:${visit}:${minute}`;
}

/** Highest urgency in the group, so one urgent test makes the whole card urgent. */
function topPriority(tests: LabRequestGroupSource[]): string {
  let best = "ROUTINE";
  for (const t of tests) {
    if (labPriorityRank(t.priority) < labPriorityRank(best)) best = t.priority;
  }
  return best;
}

/**
 * Collapse a flat list of lab requests into one entry per request. Order is
 * preserved from the input, so the caller keeps control of sorting.
 */
export function groupLabRequests<T extends LabRequestGroupSource>(requests: T[]): LabRequestGroup<T>[] {
  const groups = new Map<string, LabRequestGroup<T>>();

  for (const r of requests) {
    const key = labRequestGroupKey(r);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        requestGroupId: r.requestGroupId ?? null,
        patientId: r.patientId,
        patientNumber: r.patientNumber ?? "",
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
        age: r.age ?? 0,
        ageUnit: r.ageUnit ?? "years",
        gender: r.gender ?? "",
        isEmergency: r.isEmergency ?? false,
        createdAt: r.createdAt,
        priority: r.priority,
        requestedBy: r.requestedBy ?? "",
        requestedDepartment: r.requestedDepartment ?? "",
        clinicalNotes: r.clinicalNotes || r.referralNotes || null,
        isCritical: false,
        tests: [],
        status: "ACTIVE",
        resultedCount: 0,
        rejectedCount: 0,
      };
      groups.set(key, group);
    }

    group.tests.push(r);
    // The card's date is the moment the request was raised, not the last edit.
    if (new Date(r.createdAt).getTime() < new Date(group.createdAt).getTime()) {
      group.createdAt = r.createdAt;
    }
    if (r.isCritical) group.isCritical = true;
    if (!group.clinicalNotes && (r.clinicalNotes || r.referralNotes)) {
      group.clinicalNotes = r.clinicalNotes || r.referralNotes || null;
    }
  }

  for (const group of groups.values()) {
    group.priority = topPriority(group.tests);
    group.status = labGroupStatus(group.tests);
    group.resultedCount = group.tests.filter(t => labTestStatus(t) === "RESULTED").length;
    group.rejectedCount = group.tests.filter(t => labTestStatus(t) === "REJECTED").length;
    // Oldest test first inside the card, so the list reads in the order the
    // doctor wrote it.
    group.tests.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
  }

  return Array.from(groups.values());
}

/**
 * Search over the whole request, not just the first test — looking for
 * "Malaria RDT" must find the card even when it groups five other tests, and
 * the patient's name or number must match from any row.
 */
export function labGroupMatches(group: LabRequestGroup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (`${group.firstName} ${group.lastName}`.toLowerCase().includes(q)) return true;
  if (group.patientNumber.toLowerCase().includes(q)) return true;
  if (group.requestedBy.toLowerCase().includes(q)) return true;
  return group.tests.some(
    t =>
      t.testName?.toLowerCase().includes(q) ||
      t.specimenId?.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
  );
}

/** "3 of 6 resulted" — the summary line on a grouped card. */
export function labGroupProgressLabel(group: LabRequestGroup): string {
  return `${group.resultedCount} of ${group.tests.length} resulted`;
}
