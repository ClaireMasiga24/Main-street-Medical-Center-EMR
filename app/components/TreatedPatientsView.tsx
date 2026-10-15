"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search, Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight,
  Users, RefreshCw, CalendarPlus,
} from "lucide-react";
import PatientRecordView, { type TreatedRecord } from "./PatientRecordView";
import NewEncounterDialog, {
  type NewEncounterTarget,
  type NewEncounterResult,
} from "./NewEncounterDialog";

// Treated Patients — every consultation this doctor has completed, newest
// first, one row per patient.
//
// The list and the record both come from read-only endpoints that filter by the
// logged-in doctor's own ids on the server. Nothing here edits a consultation.
// The ONE write this screen can cause is starting a brand-new follow-up
// encounter, and even that is delegated to /api/doctor/follow-up, which
// re-checks on the server that this doctor treated the patient and refuses to
// open a second encounter when one is already in flight.

export interface TreatedPatientRow {
  visitId: number;
  encounterId: number | null;
  patientId: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  ageUnit: string;
  gender: string;
  phoneNumber: string | null;
  isEmergency: boolean;
  currentStatus: string;
  seenAt: string;
  doctorName: string | null;
  diagnosis: string;
  treatmentPlan: string;
  outcome: string;
  // Name of the external facility the patient was referred out to. Set only
  // when the consultation ended in a referral, never for a plain discharge.
  referredTo: string | null;
}

const RANGES: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All" },
];

const OUTCOME_STYLES: Record<string, string> = {
  "Sent to cashier": "bg-orange-100 text-orange-700",
  Discharged: "bg-slate-200 text-slate-700",
  Referred: "bg-violet-100 text-violet-700",
  // Indigo, not violet, so a patient sent out of the hospital is never
  // confused with one routed to an in-house department.
  "Referred out": "bg-indigo-100 text-indigo-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-UG", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

const genderLabel = (g: string) =>
  g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Other";

/**
 * The small per-row "New encounter" action. It lives inside the row's clickable
 * div, so it stops both click and keydown from also opening the record.
 */
function RowEncounterAction({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
      }}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:border-[#0a2e1a] hover:text-[#0a2e1a] ${className}`}
    >
      <CalendarPlus size={11} /> New encounter
    </button>
  );
}

export default function TreatedPatientsView({
  doctorId,
  doctorName,
  onBack,
  onStartEncounter,
}: {
  doctorId: number;
  doctorName: string;
  onBack: () => void;
  /** Called once the follow-up is created (or an existing one is found) so the
   *  dashboard can open the consultation screen. */
  onStartEncounter?: (patientId: number, result: NewEncounterResult) => void;
}) {
  const [rows, setRows] = useState<TreatedPatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ row: TreatedPatientRow; record: TreatedRecord } | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [encounterTarget, setEncounterTarget] = useState<NewEncounterTarget | null>(null);

  const targetFor = (row: TreatedPatientRow): NewEncounterTarget => ({
    patientId: row.patientId,
    patientNumber: row.patientNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    previousVisitId: row.visitId,
    previousEncounterId: row.encounterId,
  });

  const handleEncounterStarted = (result: NewEncounterResult) => {
    if (!encounterTarget) return;
    onStartEncounter?.(encounterTarget.patientId, result);
  };

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        doctorId: String(doctorId),
        range,
        page: String(page),
        pageSize: "15",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/doctor/treated?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          [body.error || `Server error (${res.status})`, body.detail].filter(Boolean).join(" — ")
        );
      }

      setRows(body.patients ?? []);
      setTotal(body.total ?? 0);
      setPageCount(body.pageCount ?? 1);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load treated patients.");
    } finally {
      setLoading(false);
    }
  }, [doctorId, range, page, debouncedSearch]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openRecord = async (row: TreatedPatientRow) => {
    setRecordLoading(true);
    setRecordError(null);
    setSelected(null);
    try {
      const params = new URLSearchParams({ doctorId: String(doctorId), visitId: String(row.visitId) });
      const res = await fetch(`/api/doctor/treated/${row.patientId}?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          [body.error || `Server error (${res.status})`, body.detail].filter(Boolean).join(" — ")
        );
      }
      setSelected({ row, record: { ...body.record, outcome: row.outcome, referredTo: row.referredTo } });

      // Audit that this record was opened. Fire-and-forget on purpose: the
      // record GET stays strictly read-only, and a failure here must never stop
      // the doctor from reading the record. The server dedupes this, so a
      // refresh or a React dev-mode double call adds only one timeline row.
      void fetch("/api/doctor/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_OPENED",
          patientId: row.patientId,
          visitId: row.visitId,
          doctorId,
          staffName: doctorName,
        }),
      }).catch(() => {});
    } catch (err: any) {
      setRecordError(err.message || "Failed to open the record.");
    } finally {
      setRecordLoading(false);
    }
  };

  // ── Record view ──
  if (recordLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading patient record…</p>
      </div>
    );
  }

  if (recordError) {
    return (
      <div>
        <button onClick={() => setRecordError(null)} className="mb-4 flex items-center gap-1 text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back to Treated Patients
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
          <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
          <p className="flex-1 text-sm text-red-700">{recordError}</p>
          <button onClick={fetchList} className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <>
        <PatientRecordView
          record={selected.record}
          onBack={() => { setSelected(null); fetchList(); }}
          headerAction={
            <button
              type="button"
              onClick={() => setEncounterTarget(targetFor(selected.row))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a2e1a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#0d3d24]"
            >
              <CalendarPlus size={13} /> New encounter
            </button>
          }
        />
        <NewEncounterDialog
          open={!!encounterTarget}
          target={encounterTarget}
          doctorId={doctorId}
          staffName={doctorName}
          onClose={() => setEncounterTarget(null)}
          onStarted={handleEncounterStarted}
        />
      </>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Treated Patients</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {loading ? "Loading…" : `${total} consultation${total === 1 ? "" : "s"} you completed`}
            {doctorName ? ` · Dr. ${doctorName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchList}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={13} /> Patient Queue
          </button>
        </div>
      </div>

      {/* Search + quick filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or patient number…"
            aria-label="Search treated patients"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0a2e1a] focus:ring-2 focus:ring-[#0a2e1a]/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => { setRange(r.key); setPage(1); }}
              aria-pressed={range === r.key}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                range === r.key
                  ? "border-[#0a2e1a] bg-[#0a2e1a] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="flex-shrink-0 text-red-600" />
          <p className="flex-1 text-xs font-medium text-red-700">{loadError}</p>
          <button onClick={fetchList} className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading treated patients…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <Users size={40} className="text-slate-200" />
          <p className="text-sm font-semibold text-slate-600">No treated patients yet</p>
          <p className="max-w-sm text-xs text-slate-400">
            {debouncedSearch
              ? `No patient matches "${debouncedSearch}" in this period.`
              : "Once you complete a consultation, that patient will appear here so you can follow them up."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {/* Desktop header */}
            <div className="hidden border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_2fr_1fr_1.2fr] lg:gap-4">
              <span>Patient</span>
              <span>Seen</span>
              <span>Age / Sex</span>
              <span>Diagnosis</span>
              <span>Outcome</span>
              <span>Record</span>
            </div>

            {rows.map((row) => (
              /* Was a <button>; now a div with role="button" so the per-row
                 "New encounter" action can live inside it. A real <button>
                 cannot contain another <button> — invalid HTML, and React
                 warns. Click-to-open behaves exactly as before. */
              <div
                key={row.visitId}
                role="button"
                tabIndex={0}
                onClick={() => openRecord(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRecord(row);
                  }
                }}
                className="block w-full cursor-pointer border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
              >
                {/* Mobile / tablet stack */}
                <div className="lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {row.lastName}, {row.firstName}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        <span className="font-mono">{row.patientNumber}</span>
                        <span className="text-slate-300">|</span>
                        <span>{row.age} {row.ageUnit === "months" ? "mo" : "yrs"}</span>
                        <span className="text-slate-300">|</span>
                        <span>{genderLabel(row.gender)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${OUTCOME_STYLES[row.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                        {row.outcome}
                      </span>
                      {row.referredTo ? (
                        <span className="max-w-[9rem] truncate text-[10px] font-semibold text-indigo-600" title={row.referredTo}>
                          {row.referredTo}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-700">
                    <span className="text-slate-400">{fmtTime(row.seenAt)}</span>
                    {row.diagnosis ? ` — ${row.diagnosis}` : " — No diagnosis recorded"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    Visit #{row.visitId}{row.encounterId ? ` · Enc #${row.encounterId}` : ""}
                  </p>
                  <RowEncounterAction
                    className="mt-2"
                    onClick={() => setEncounterTarget(targetFor(row))}
                  />
                </div>

                {/* Desktop row */}
                <div className="hidden items-center gap-4 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_2fr_1fr_1.2fr]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {row.lastName}, {row.firstName}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">{row.patientNumber}</p>
                  </div>
                  <span className="text-xs text-slate-600">{fmtTime(row.seenAt)}</span>
                  <span className="text-xs text-slate-600">
                    {row.age} {row.ageUnit === "months" ? "mo" : "yrs"} · {genderLabel(row.gender)}
                  </span>
                  <span className="truncate text-xs text-slate-700">
                    {row.diagnosis || <span className="text-slate-400">Not recorded</span>}
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${OUTCOME_STYLES[row.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                      {row.outcome}
                    </span>
                    {row.referredTo ? (
                      <span className="max-w-full truncate text-[10px] font-semibold text-indigo-600" title={row.referredTo}>
                        {row.referredTo}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-col items-start gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400">
                      Visit #{row.visitId}{row.encounterId ? ` · Enc #${row.encounterId}` : ""}
                    </span>
                    <RowEncounterAction
                      onClick={() => setEncounterTarget(targetFor(row))}
                    />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {page} of {pageCount} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <NewEncounterDialog
        open={!!encounterTarget}
        target={encounterTarget}
        doctorId={doctorId}
        staffName={doctorName}
        onClose={() => setEncounterTarget(null)}
        onStarted={handleEncounterStarted}
      />
    </div>
  );
}
