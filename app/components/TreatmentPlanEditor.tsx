"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Plus, X, ChevronUp, ChevronDown, Pill, FlaskConical, Syringe,
  Info, CalendarClock, Pencil,
} from "lucide-react";
import {
  planItemsToText,
  textToPlanItems,
  makePlanItem,
  PLAN_ITEM_TYPES,
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

/** Placeholder shown in the add-item field, per type. */
const PLACEHOLDER: Record<PlanItemType, string> = {
  Medication: "e.g. Amoxicillin 500mg TID for 5 days",
  Investigation: "e.g. Full blood count",
  Procedure: "e.g. Wound dressing",
  Advice: "e.g. Rest and plenty of fluids",
  "Follow-up": "e.g. Review after results",
};

const INPUT_CLASS =
  "rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-[#0a2e1a] focus:ring-2 focus:ring-[#0a2e1a]/20";

interface TreatmentPlanEditorProps {
  /** The `treatmentPlan` text, as held by the consultation panel. */
  value: string;
  /** Receives the re-serialised plan text. Same string format as before. */
  onChange: (text: string) => void;
  /** "Add as prescription" on a Medication item. */
  onAddPrescription?: (item: PlanItem) => void;
  /** "Request" on an Investigation item. */
  onRequestInvestigation?: (item: PlanItem) => void;
}

/**
 * Structured treatment-plan editor.
 *
 * Edits a `PlanItem[]` in local state and hands the parent a plain text string
 * via `planItemsToText`, so every existing save path (finalize, draft autosave,
 * order-lab-without-routing) keeps working byte-for-byte as before.
 *
 * Items loaded from a legacy free-text plan come back as `Advice` rows and can
 * be retyped, edited, reordered or removed in place.
 */
export default function TreatmentPlanEditor({
  value,
  onChange,
  onAddPrescription,
  onRequestInvestigation,
}: TreatmentPlanEditorProps) {
  const [items, setItems] = useState<PlanItem[]>(() => textToPlanItems(value));
  const [draftType, setDraftType] = useState<PlanItemType>("Advice");
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

  // What we last handed upward. Used to tell "the parent changed the value"
  // apart from "we just changed it", so the textarea cursor is never fought.
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setItems(textToPlanItems(value));
  }, [value]);

  const commit = (next: PlanItem[]) => {
    setItems(next);
    const text = planItemsToText(next);
    lastEmitted.current = text;
    onChange(text);
  };

  const addItem = () => {
    const text = draftText.trim();
    if (!text) return;
    const date = draftType === "Follow-up" ? draftDate.trim() : "";
    const item = makePlanItem(draftType, text, date);
    commit([...items, item]);
    setDraftText("");
    setDraftDate("");
    // Stay on the same type so entering a list of the same kind is quick.
  };

  const removeItem = (id: string) => {
    if (editingId === id) setEditingId(null);
    commit(items.filter((i) => i.id !== id));
  };

  const moveItem = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const startEdit = (item: PlanItem) => {
    setEditingId(item.id);
    setEditText(item.text === "—" ? "" : item.text);
    setEditDate(item.date || "");
  };

  const saveEdit = (id: string) => {
    const text = editText.trim();
    commit(
      items.map((i) =>
        i.id === id
          ? { ...i, text: text || i.text, date: i.type === "Follow-up" ? editDate.trim() || undefined : undefined }
          : i
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex flex-shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.type} item up`}
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.type} item down`}
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={13} />
                  </button>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {TYPE_ICON[item.type]}
                      {item.type}
                    </span>
                    {item.date ? (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        {item.date}
                      </span>
                    ) : null}
                  </div>

                  {editingId === item.id ? (
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      <input
                        autoFocus
                        aria-label="Plan item text"
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveEdit(item.id); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className={`${INPUT_CLASS} sm:col-span-2`}
                      />
                      {item.type === "Follow-up" ? (
                        <input
                          aria-label="Follow-up date"
                          type="text"
                          placeholder="Follow-up date (optional)"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className={INPUT_CLASS}
                        />
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="rounded-lg bg-[#0a2e1a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0d3d24]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-slate-700">{item.text}</p>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  {item.type === "Medication" && onAddPrescription ? (
                    <button
                      type="button"
                      onClick={() => onAddPrescription(item)}
                      title="Add this medicine as a prescription"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700 transition-colors hover:bg-green-100"
                    >
                      <Pill size={11} /> Add as prescription
                    </button>
                  ) : null}
                  {item.type === "Investigation" && onRequestInvestigation ? (
                    <button
                      type="button"
                      onClick={() => onRequestInvestigation(item)}
                      title="Request this investigation"
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-700 transition-colors hover:bg-purple-100"
                    >
                      <FlaskConical size={11} /> Request
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.type} item`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.type} item`}
                    className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">
          No plan items yet. Add medicines, investigations, procedures, advice and
          follow-up below.
        </p>
      )}

      {/* ── Quick add ── */}
      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick add
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_ITEM_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDraftType(type)}
              aria-pressed={draftType === type}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2e1a]/50 ${
                draftType === type
                  ? "border-[#0a2e1a] bg-[#0a2e1a] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {TYPE_ICON[type]} {type}
            </button>
          ))}
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <input
            data-step-focus
            aria-label={`${draftType} plan item`}
            type="text"
            placeholder={PLACEHOLDER[draftType]}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(); }
            }}
            className={`${INPUT_CLASS} sm:col-span-2`}
          />
          {draftType === "Follow-up" ? (
            <input
              aria-label="Follow-up date"
              type="text"
              placeholder="Date (optional) — e.g. 2025-04-01 or in 3 days"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addItem(); }
              }}
              className={`${INPUT_CLASS} sm:col-span-2`}
            />
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={addItem}
              disabled={!draftText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a2e1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d3d24] disabled:opacity-40"
            >
              <Plus size={15} /> Add to plan
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400">
        Saved with the consultation exactly as before — the plan is stored as
        readable lines like &ldquo;[Medication] Amoxicillin 500mg TID&rdquo;.
      </p>
    </div>
  );
}
