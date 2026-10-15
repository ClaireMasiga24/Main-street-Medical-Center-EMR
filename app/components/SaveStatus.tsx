"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: Date }
  | { status: "error"; message: string };

/** Zero-padded 24-hour stamp, hand-formatted so it never depends on ICU data. */
const clockLabel = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Draft feedback, shown next to the patient number in the encounter header.
 * Deliberately only reports "Saved" once the server has confirmed the write —
 * a failed autosave must never look like a success.
 */
export default function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === "idle") {
    return (
      <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:inline">
        Draft not saved yet
      </span>
    );
  }

  if (state.status === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200"
      >
        <Loader2 size={11} className="animate-spin" />
        Saving&hellip;
      </span>
    );
  }

  if (state.status === "saved") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200"
      >
        <Check size={11} strokeWidth={3} />
        Saved {clockLabel(state.at)}
      </span>
    );
  }

  return (
    <span
      role="alert"
      title={state.message}
      className="inline-flex max-w-[190px] items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 ring-1 ring-red-200"
    >
      <AlertCircle size={11} className="flex-shrink-0" />
      <span className="truncate">{state.message}</span>
    </span>
  );
}
