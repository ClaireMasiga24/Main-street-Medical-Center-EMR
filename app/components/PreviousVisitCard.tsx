"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, History, Loader2, AlertTriangle } from "lucide-react";
import PatientRecordView, { type TreatedRecord } from "./PatientRecordView";

// Collapsible, read-only "Previous visit" card for the top of the consultation
// screen.
//
// It exists only while the doctor is inside a follow-up. Renders nothing at all
// for a normal reception-queued patient, so those consultations are unchanged.
//
// Reuses the existing read-only record renderer rather than a second one, and
// fetches the record through the existing doctor-scoped endpoint — which
// already refuses a visit that is not this doctor's. Nothing here writes.

interface FollowUpLink {
  previousVisitId: number;
  type: string;
  reason: string;
  startedAt: string;
  description: string;
}

export default function PreviousVisitCard({
  patientId,
  encounterId,
  doctorId,
}: {
  patientId: number;
  encounterId: number | null;
  doctorId: number;
}) {
  const [link, setLink] = useState<FollowUpLink | null>(null);
  const [record, setRecord] = useState<TreatedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — is this encounter a follow-up, and if so of which visit?
  useEffect(() => {
    if (!encounterId) {
      setLink(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          patientId: String(patientId),
          encounterId: String(encounterId),
          doctorId: String(doctorId),
        });
        const res = await fetch(`/api/doctor/follow-up/context?${params.toString()}`);
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        setLink(body.followUp ?? null);
      } catch {
        if (!cancelled) setLink(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, encounterId, doctorId]);

  // Step 2 — load the previous record. Scoped to that consultation so the card
  // shows the labs and prescriptions belonging to it, not a later visit's.
  const loadRecord = useCallback(async () => {
    if (!link) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        doctorId: String(doctorId),
        visitId: String(link.previousVisitId),
        scope: "consultation",
      });
      const res = await fetch(`/api/doctor/treated/${patientId}?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          [body.error || `Server error (${res.status})`, body.detail].filter(Boolean).join(" — ")
        );
      }
      setRecord(body.record ?? null);
    } catch (err: any) {
      setError(err.message || "Could not load the previous visit.");
    } finally {
      setLoading(false);
    }
  }, [link, doctorId, patientId]);

  // Only fetch once the doctor actually opens the card.
  useEffect(() => {
    if (expanded && link && !record && !loading && !error) void loadRecord();
  }, [expanded, link, record, loading, error, loadRecord]);

  // Not a follow-up: render nothing at all.
  if (!link) return null;

  const when = new Date(link.startedAt).toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#0a2e1a]/20 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 bg-[#0a2e1a]/5 px-4 py-3 text-left transition-colors hover:bg-[#0a2e1a]/10"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <History size={15} className="flex-shrink-0 text-[#0a2e1a]" />
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#0a2e1a]">
              Previous visit
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
              Visit #{link.previousVisitId} · {link.type}
              {link.reason ? ` · ${link.reason}` : ""}
            </span>
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-[#0a2e1a]/10 p-4">
          <p className="mb-4 text-[11px] text-slate-500">
            Started {when}. This is the completed record and is read-only — nothing below
            can be changed, and nothing has been copied into the current consultation.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading previous visit…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertTriangle size={14} className="flex-shrink-0 text-red-600" />
              <p className="flex-1 text-xs text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadRecord()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : record ? (
            <PatientRecordView record={record} embedded />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
