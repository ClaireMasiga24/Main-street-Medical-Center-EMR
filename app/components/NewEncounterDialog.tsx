"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, AlertTriangle, CalendarPlus, ArrowLeft } from "lucide-react";

// The dialog behind the "NEW ENCOUNTER" action in Treated Patients.
//
// Two outcomes only:
//   • Follow-up review / Results review -> POST /api/doctor/follow-up, which
//     creates a genuinely separate encounter for this doctor.
//   • New complaint -> NO encounter. A different problem needs a different
//     visit with its own registration and fees, so we hand the patient back to
//     reception rather than opening a consultation we should not open.
//
// The server is the authority on both: it re-checks that this doctor treated
// this patient, and it refuses to open a second encounter when one is already
// in flight. This dialog never decides that on its own.

export type FollowUpTypeChoice = "FOLLOW_UP_REVIEW" | "RESULTS_REVIEW" | "NEW_COMPLAINT";

export interface NewEncounterTarget {
  patientId: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  previousVisitId: number;
  /** The Visit the follow-up is attached to, for the header copy. */
  previousEncounterId?: number | null;
}

export interface NewEncounterResult {
  existing: boolean;
  encounterId: number;
  currentOwnerDept?: string;
  currentStatus?: string;
  heldByDoctor?: boolean;
  /** A complete dashboard-shaped patient row, so the consultation screen can
   *  open immediately without waiting for — or finding — the queue row. */
  consultation?: Record<string, unknown> | null;
}

const TYPES: { value: FollowUpTypeChoice; label: string; blurb: string }[] = [
  {
    value: "FOLLOW_UP_REVIEW",
    label: "Follow-up review",
    blurb: "Review how the patient responded to the last visit's treatment.",
  },
  {
    value: "RESULTS_REVIEW",
    label: "Results review",
    blurb: "Discuss investigations that have come back since the last visit.",
  },
  {
    value: "NEW_COMPLAINT",
    label: "New complaint",
    blurb: "A different problem. Needs a new visit, registered by reception.",
  },
];

const NEW_COMPLAINT_MESSAGE =
  "A new complaint needs a new visit. Please ask reception to queue this patient.";

const MAX_REASON = 500;

export default function NewEncounterDialog({
  open,
  target,
  doctorId,
  staffName,
  onClose,
  onStarted,
}: {
  open: boolean;
  target: NewEncounterTarget | null;
  doctorId: number;
  staffName: string;
  onClose: () => void;
  onStarted: (result: NewEncounterResult) => void;
}) {
  const [type, setType] = useState<FollowUpTypeChoice>("FOLLOW_UP_REVIEW");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewComplaint, setShowNewComplaint] = useState(false);

  // Reset each time it is opened so a previous attempt never leaks through.
  useEffect(() => {
    if (!open) return;
    setType("FOLLOW_UP_REVIEW");
    setReason("");
    setError(null);
    setShowNewComplaint(false);
    setSubmitting(false);
  }, [open]);

  // Escape closes, but never mid-flight — that would leave the doctor unsure
  // whether the encounter was created.
  useEffect(() => {
    if (!open || submitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open || !target) return null;

  const isNewComplaint = type === "NEW_COMPLAINT";
  const canSubmit = !submitting && (isNewComplaint || reason.trim().length > 0);

  const submit = async () => {
    // A new complaint never reaches the server.
    if (isNewComplaint) {
      setShowNewComplaint(true);
      return;
    }
    if (!target) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          patientId: target.patientId,
          previousVisitId: target.previousVisitId,
          type: type === "RESULTS_REVIEW" ? "Results review" : "Follow-up review",
          reason: reason.trim(),
          doctorId,
          staffName,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          [body.error || `Server error (${res.status})`, body.detail].filter(Boolean).join(" — ")
        );
      }
      onStarted({
        existing: !!body.existing,
        encounterId: body.encounterId,
        currentOwnerDept: body.currentOwnerDept,
        currentStatus: body.currentStatus,
        heldByDoctor: body.heldByDoctor,
        consultation: body.consultation ?? null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not start the follow-up.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── "New complaint" notice — no encounter is created ──
  if (showNewComplaint) {
    return (
      <Modal onClose={submitting ? () => {} : onClose}>
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <CalendarPlus size={24} className="text-amber-700" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">Reception needs to queue this patient</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            {NEW_COMPLAINT_MESSAGE}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Nothing has been created. The previous record is unchanged.
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-6 rounded-xl bg-[#0a2e1a] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d24]"
          >
            OK
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={submitting ? () => {} : onClose}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">New encounter</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {target.lastName}, {target.firstName} ·{" "}
            <span className="font-mono">{target.patientNumber}</span> · follow-up of Visit #
            {target.previousVisitId}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
          This opens a <span className="font-semibold">separate consultation</span>. The
          record from Visit #{target.previousVisitId} stays exactly as it is, and the new
          consultation starts blank.
        </p>

        {/* Type */}
        <fieldset>
          <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Type
          </legend>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  type === t.value
                    ? "border-[#0a2e1a] bg-[#0a2e1a]/5"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="followup-type"
                  value={t.value}
                  checked={type === t.value}
                  disabled={submitting}
                  onChange={() => {
                    setType(t.value);
                    setError(null);
                  }}
                  className="mt-0.5 accent-[#0a2e1a]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-700">{t.label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">{t.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Reason */}
        {!isNewComplaint && (
          <div>
            <label
              htmlFor="followup-reason"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              id="followup-reason"
              type="text"
              value={reason}
              maxLength={MAX_REASON}
              disabled={submitting}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) void submit();
              }}
              placeholder="e.g. Review blood pressure after two weeks on amlodipine"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0a2e1a] focus:ring-2 focus:ring-[#0a2e1a]/20 disabled:bg-slate-50"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              {reason.trim().length}/{MAX_REASON}. Saved as the chief complaint of the new
              consultation.
            </p>
          </div>
        )}

        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-600" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0a2e1a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d24] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowLeft size={15} />}
          {submitting
            ? "Starting…"
            : isNewComplaint
              ? "What should I do?"
              : "Start consultation"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
