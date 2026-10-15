"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Loader2, AlertTriangle, FlaskConical, Copy, Check, ClipboardPlus, Share2, Clock,
} from "lucide-react";
import LabResultDetail from "./LabResultDetail";

// ─── Types ──────────────────────────────────────────────────────────────────

/** One row of a stored `LabRequest.results` JSON array. */
export interface LabResultParameter {
  test?: string;
  parameter?: string;
  result?: string | number;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}

/** One row of `ResultShare` — who released the result, to whom, and when. */
export interface LabResultShare {
  sharedByName: string | null;
  targetDept: string | null;
  sharedAt: string | null;
  note: string | null;
  includeReport?: boolean;
}

/**
 * A LabRequest as GET /api/doctor/lab-results returns it. Dates arrive as ISO
 * strings because the route goes through JSON.
 */
export interface LabResultRow {
  id: number;
  testName: string;
  testPanel: string | null;
  requestGroupId: string | null;
  status: string;
  priority: string | null;
  results: string | null;
  interpretation: string | null;
  isCritical: boolean;
  criticalNote: string | null;
  specimenType: string | null;
  specimenId: string | null;
  collectedByName: string | null;
  specimenCollectedAt: string | null;
  enteredByName: string | null;
  resultEnteredAt: string | null;
  validatedByName: string | null;
  validatedAt: string | null;
  attachments: string | null;
  analyzerResults: string | null;
  analyzerType: string | null;
  analyzerModel: string | null;
  createdAt: string | null;
  ResultShares?: LabResultShare[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * The same status wording the Investigations page uses. Kept local rather than
 * imported from the doctor page: that page is one 5000-line module with no
 * exports, and this view is also opened from the queue, where none of it is
 * loaded.
 */
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Requested", ORDERED: "Requested", ACCEPTED: "In progress",
  SPECIMEN_COLLECTED: "In progress", PROCESSING: "In progress",
  IN_PROGRESS: "In progress", AWAITING_VALIDATION: "Awaiting validation",
  AWAITING_INTERPRETATION: "Awaiting interpretation",
  COMPLETED: "Result ready", REPORTED: "Result ready",
  CANCELLED: "Cancelled", REJECTED: "Rejected", LAB_REJECTED: "Rejected",
};

/** Parse the stored results JSON into rows. Anything unparseable is no result. */
export function parseLabParameters(results: string | null | undefined): LabResultParameter[] {
  if (!results) return [];
  try {
    const parsed = typeof results === "string" ? JSON.parse(results) : results;
    if (Array.isArray(parsed)) return parsed as LabResultParameter[];
  } catch {
    // Not JSON — a free-text result is not a parameter table, so there is
    // nothing to flag. The raw text is not shown: every writer in this codebase
    // stores JSON, so an unparseable value means a corrupt row, not a result.
  }
  return [];
}

/** Does this request actually carry results to read? */
export const hasLabResult = (lr: LabResultRow) => parseLabParameters(lr.results).length > 0;

/** The most recent share of a request, if any. */
const latestShare = (lr: LabResultRow): LabResultShare | null => lr.ResultShares?.[0] ?? null;

const isAbnormal = (p: LabResultParameter) => p.flag === "HIGH" || p.flag === "LOW";

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-UG", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

/**
 * The abnormal parameters across every result given, one line per test, ready
 * to paste into the assessment. Empty when nothing is flagged — the caller
 * decides whether that disables a button or hides it.
 */
export function buildAbnormalFindings(rows: LabResultRow[]): string {
  const lines: string[] = [];
  for (const lr of rows) {
    const abnormal = parseLabParameters(lr.results).filter(isAbnormal);
    if (abnormal.length === 0) continue;
    const parts = abnormal.map((p) => {
      const name = p.test || p.parameter || "Result";
      const value = [p.result ?? "", p.unit ?? ""].filter((v) => String(v).trim()).join(" ");
      const range = p.referenceRange ? `, ref ${p.referenceRange}` : "";
      return `${name} ${value} (${p.flag}${range})`.replace(/\s+/g, " ").trim();
    });
    lines.push(`${lr.testName}: ${parts.join("; ")}`);
  }
  return lines.join("\n");
}

/** `buildAbnormalFindings` with a dated heading, for the clipboard/assessment. */
export function buildFindingsNote(rows: LabResultRow[]): string {
  const body = buildAbnormalFindings(rows);
  if (!body) return "";
  const stamp = new Date().toLocaleDateString("en-UG", {
    day: "numeric", month: "short", year: "numeric",
  });
  return `Lab findings (${stamp}):\n${body}`;
}

// ─── Grouping ───────────────────────────────────────────────────────────────

interface RequestGroup {
  key: string;
  createdAt: string | null;
  tests: LabResultRow[];
}

/**
 * One group per doctor submission: rows written together share a
 * `requestGroupId`, so that is the group key. Rows from before that column
 * existed are grouped by nothing and stand alone — which is also what a
 * single-test request looks like.
 */
function groupByRequest(rows: LabResultRow[]): RequestGroup[] {
  const groups = new Map<string, RequestGroup>();
  for (const lr of rows) {
    const key = lr.requestGroupId || `solo-${lr.id}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, createdAt: lr.createdAt, tests: [] };
      groups.set(key, group);
    }
    group.tests.push(lr);
    if (lr.createdAt && (!group.createdAt || lr.createdAt > group.createdAt)) {
      group.createdAt = lr.createdAt;
    }
  }
  return [...groups.values()];
}

type Tone = "ready" | "progress" | "stopped";

const TONE_CLASS: Record<Tone, string> = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  progress: "bg-amber-50 text-amber-700 border-amber-200",
  stopped: "bg-red-50 text-red-700 border-red-200",
};

/** What one request reads as, given the state of the tests inside it. */
function groupStatus(tests: LabResultRow[]): { label: string; tone: Tone } {
  const ready = tests.filter(hasLabResult).length;
  if (ready === tests.length && ready > 0) return { label: "Result ready", tone: "ready" };
  if (ready > 0) return { label: `${ready} of ${tests.length} ready`, tone: "progress" };
  const first = tests[0]?.status ?? "";
  const tone: Tone = first === "REJECTED" || first === "LAB_REJECTED" ? "stopped" : "progress";
  return { label: STATUS_LABELS[first] ?? first ?? "Requested", tone };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface LabResultsViewProps {
  patientId: number;
  patientName?: string;
  patientNumber?: string;
  /**
   * Highlight and scroll to this request on open. Set from a notification's
   * referenceId so the doctor lands on the result that was announced.
   */
  focusLabRequestId?: number | null;
  onClose: () => void;
  /**
   * When given, the view offers to fold the abnormal findings into the
   * doctor's assessment. Absent outside a consultation.
   */
  onAddToAssessment?: (text: string) => void;
}

export default function LabResultsView({
  patientId,
  patientName,
  patientNumber,
  focusLabRequestId = null,
  onClose,
  onAddToAssessment,
}: LabResultsViewProps) {
  const [rows, setRows] = useState<LabResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/doctor/lab-results?patientId=${patientId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Could not load lab results (${res.status})`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data.labRequests) ? data.labRequests : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load lab results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const groups = useMemo(() => {
    const list = groupByRequest(rows);
    if (focusLabRequestId == null) return list;
    const at = list.findIndex((g) => g.tests.some((t) => t.id === focusLabRequestId));
    if (at <= 0) return list;
    return [list[at], ...list.slice(0, at), ...list.slice(at + 1)];
  }, [rows, focusLabRequestId]);

  const withResults = useMemo(() => rows.filter(hasLabResult), [rows]);
  const findingsNote = useMemo(() => buildFindingsNote(withResults), [withResults]);
  const abnormalCount = useMemo(
    () => withResults.reduce((n, lr) => n + parseLabParameters(lr.results).filter(isAbnormal).length, 0),
    [withResults]
  );

  // Land the doctor on the request the notification named, not at the top of a
  // list they then have to search.
  useEffect(() => {
    if (loading || !focusLabRequestId) return;
    const el = document.getElementById(`lab-req-${focusLabRequestId}`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [loading, focusLabRequestId]);

  const copyFindings = useCallback(async () => {
    if (!findingsNote) return;
    try {
      await navigator.clipboard.writeText(findingsNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — the assessment button still works.
      setError("Could not copy to the clipboard. Use “Add to assessment” instead.");
    }
  }, [findingsNote]);

  const addFindings = useCallback(() => {
    if (!findingsNote || !onAddToAssessment) return;
    onAddToAssessment(findingsNote);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [findingsNote, onAddToAssessment]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#0a2e1a] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={16} className="text-emerald-200" />
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Lab Results</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close lab results"
            >
              <X size={16} />
            </button>
          </div>
          {(patientName || patientNumber) && (
            <p className="mt-1 text-[11px] text-emerald-100">
              {patientName}
              {patientName && patientNumber ? " — " : ""}
              {patientNumber}
            </p>
          )}
          {!loading && !error && rows.length > 0 && (
            <p className="mt-1 text-[10px] text-emerald-200/80">
              {withResults.length} of {rows.length} test{rows.length === 1 ? "" : "s"} resulted
              {abnormalCount > 0 ? ` · ${abnormalCount} abnormal finding${abnormalCount === 1 ? "" : "s"}` : ""}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-3 py-3 sm:px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin text-[#0a2e1a]" />
              <p className="mt-2 text-xs font-medium">Loading lab results…</p>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
              <AlertTriangle size={24} className="mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-bold text-slate-800">Could not load results</p>
              <p className="mt-1 text-xs text-slate-600">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <FlaskConical size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-medium">No lab tests recorded for this patient</p>
              <p className="mt-1 text-xs text-slate-300">Results appear here as soon as the laboratory shares them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group, gi) => {
                const status = groupStatus(group.tests);
                return (
                  <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Request {groups.length > 1 ? `#${gi + 1}` : ""}
                      </span>
                      <span className="text-[11px] text-slate-500">{formatDateTime(group.createdAt)}</span>
                      <span className="text-[10px] text-slate-400">
                        {group.tests.length} test{group.tests.length === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[status.tone]}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-2.5 bg-white p-2.5">
                      {group.tests.map((lr) => {
                        const share = latestShare(lr);
                        return (
                          <div
                            key={lr.id}
                            id={`lab-req-${lr.id}`}
                            className={
                              lr.id === focusLabRequestId
                                ? "rounded-xl ring-2 ring-[#0a2e1a]/30 ring-offset-2 ring-offset-white"
                                : ""
                            }
                          >
                            <LabResultDetail lr={lr} />
                            {share ? (
                              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-[10px] text-slate-500">
                                <Share2 size={10} className="flex-shrink-0 text-emerald-600" />
                                <span>
                                  Shared by <strong className="font-semibold text-slate-700">{share.sharedByName || "the laboratory"}</strong>
                                  {share.targetDept ? ` with ${share.targetDept}` : ""}
                                  {share.sharedAt ? ` · ${formatDateTime(share.sharedAt)}` : ""}
                                </span>
                                {share.note ? <span className="text-slate-400 italic">— “{share.note}”</span> : null}
                              </p>
                            ) : (
                              <p className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
                                <Clock size={10} className="flex-shrink-0" />
                                Not yet shared with your department
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={copyFindings}
              disabled={!findingsNote}
              title={findingsNote ? "Copy the flagged parameters" : "No abnormal findings to copy"}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy abnormal findings"}
            </button>

            {onAddToAssessment ? (
              <button
                onClick={addFindings}
                disabled={!findingsNote}
                title={findingsNote ? "Append the flagged parameters to the assessment" : "No abnormal findings to add"}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0a2e1a] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#0d3d24] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {added ? <Check size={13} /> : <ClipboardPlus size={13} />}
                {added ? "Added to assessment" : "Add to assessment"}
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 sm:w-24"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
