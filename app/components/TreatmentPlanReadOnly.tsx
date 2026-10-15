"use client";

import React from "react";
import { ClipboardList, Pill, FlaskConical, Syringe, Info, CalendarClock } from "lucide-react";
import {
  textToPlanItems,
  type PlanItem,
  type PlanItemType,
} from "../lib/treatmentPlan";

const TYPE_ICON: Record<PlanItemType, React.ReactNode> = {
  Medication: <Pill size={13} className="text-green-600" />,
  Investigation: <FlaskConical size={13} className="text-purple-500" />,
  Procedure: <Syringe size={13} className="text-cyan-600" />,
  Advice: <Info size={13} className="text-slate-400" />,
  "Follow-up": <CalendarClock size={13} className="text-amber-500" />,
};

const TYPE_LABEL: Record<PlanItemType, string> = {
  Medication: "Medication",
  Investigation: "Investigation",
  Procedure: "Procedure",
  Advice: "Advice",
  "Follow-up": "Follow-up",
};

interface TreatmentPlanReadOnlyProps {
  /** Raw `treatmentPlan` text as stored in the database. */
  text: string | null | undefined;
  /** Shown when there is no plan at all. */
  emptyText?: string;
  className?: string;
}

/**
 * Read-only checklist rendering of a `treatmentPlan` column.
 *
 * Accepts the raw text, so it works for plans written by the structured editor
 * ("[Medication] ...") and for legacy free-text plans alike — the latter simply
 * come back as a single Advice row. Never throws on malformed input.
 */
export default function TreatmentPlanReadOnly({
  text,
  emptyText = "No treatment plan recorded.",
  className = "",
}: TreatmentPlanReadOnlyProps) {
  const items: PlanItem[] = textToPlanItems(text);

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
        >
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-slate-300 bg-white">
            <ClipboardList size={10} className="text-slate-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {TYPE_ICON[item.type]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {TYPE_LABEL[item.type]}
              </span>
              {item.date ? (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                  {item.date}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-sm whitespace-pre-wrap text-slate-700">
              {item.text}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
