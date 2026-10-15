// Treatment plan — structured items stored in the existing `treatmentPlan`
// text column. NO schema change.
//
// A plan is serialised as one readable line per item:
//
//     [Medication] Amoxicillin 500mg TID for 5 days
//     [Investigation] Full blood count
//     [Follow-up] Review (2025-04-01)
//
// `planItemsToText` and `textToPlanItems` are the ONLY two functions that know
// this format. Everything else — the consultation editor, the admitted patient
// file, the Treated Patients record — goes through them. When the column is
// eventually replaced with real rows, these two functions are the seam: callers
// keep their `PlanItem[]` and only the two functions change.
//
// Round-tripping is lossless for text written by these helpers. Legacy plans
// that were typed as free text carry no `[Type]` prefix and are surfaced as a
// single `Advice` item so no words are ever dropped or rendered as a crash.

export type PlanItemType =
  | "Medication"
  | "Investigation"
  | "Procedure"
  | "Advice"
  | "Follow-up";

export interface PlanItem {
  /** Stable key for React lists. Generated client-side; never persisted. */
  id: string;
  type: PlanItemType;
  text: string;
  /** Follow-up only. Rendered as a trailing "(...)" on the serialised line. */
  date?: string;
}

export const PLAN_ITEM_TYPES: PlanItemType[] = [
  "Medication",
  "Investigation",
  "Procedure",
  "Advice",
  "Follow-up",
];

// Matches a leading "[Type]" on a single line. The text may contain newlines in
// the sense that we read line by line, so `.` is safe here (no `s` flag).
const TYPED_LINE = /^\s*\[(Medication|Investigation|Procedure|Advice|Follow-up)\]\s*(.*)$/;

// A trailing parenthesised date, e.g. "Review (2025-04-01)". Only stripped from
// Follow-up lines so that "[Advice] Paracetamol (twice daily)" keeps its text.
const TRAILING_DATE = /^(.*?)\s*\(([^()]{3,40})\)\s*$/;

// ─── id generation ──────────────────────────────────────────────────────────

let idCounter = 0;

/**
 * Client-side only — the id is never written to the database.
 *
 * Parsed ids are derived from the item's content and position, so re-parsing
 * the same text yields the same ids. That stops React remounting every row on
 * a re-render, and keeps an in-progress edit attached to its item.
 */
export function planItemId(
  type: string,
  text: string,
  date: string,
  index: number
): string {
  let hash = 5381;
  const key = `${type}|${text}|${date}|${index}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash * 33) ^ key.charCodeAt(i)) | 0;
  }
  return `plan-${index}-${(hash >>> 0).toString(36)}`;
}

let newItemCounter = 0;

/** A freshly created item, not yet part of any saved text. */
export function makePlanItem(
  type: PlanItemType,
  text: string,
  date?: string
): PlanItem {
  newItemCounter += 1;
  return { id: `plan-new-${newItemCounter}`, type, text, date: date || undefined };
}

// ─── serialise ──────────────────────────────────────────────────────────────

/**
 * Turn plan items into the plain text persisted in `treatmentPlan`.
 * Blank items are skipped. One item per line.
 */
export function planItemsToText(items: PlanItem[]): string {
  return items
    .map((item) => {
      const text = (item.text || "").trim();
      if (!text) return "";
      const date = item.type === "Follow-up" ? (item.date || "").trim() : "";
      return date
        ? `[${item.type}] ${text} (${date})`
        : `[${item.type}] ${text}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

// ─── parse ──────────────────────────────────────────────────────────────────

/**
 * Turn persisted `treatmentPlan` text back into plan items.
 *
 * - A line matching `[Type] text` starts a new typed item.
 * - An untyped line continues the item above it, so a doctor's own line
 *   breaks survive a save/reload cycle instead of silently re-shaping into
 *   extra rows. A leading untyped line starts an `Advice` item.
 * - On a Follow-up item, a trailing "(...)" on its FIRST line is split out
 *   into `date`.
 * - Text with no `[Type]` line at all is returned as one `Advice` item,
 *   verbatim. Empty / nullish input returns an empty list.
 */
export function textToPlanItems(text: string | null | undefined): PlanItem[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  const items: PlanItem[] = [];
  let typedCount = 0;

  const push = (type: PlanItemType, text: string, date?: string) => {
    const index = items.length;
    items.push({
      id: planItemId(type, text, date || "", index),
      type,
      text,
      date: date || undefined,
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = TYPED_LINE.exec(trimmed);

    // An untyped line belongs to the item above it — that is what keeps a
    // legacy plan shaped the same way every time it is loaded.
    if (!match) {
      if (items.length > 0) {
        const last = items[items.length - 1];
        last.text = `${last.text}\n${trimmed}`;
        last.id = planItemId(last.type, last.text, last.date || "", items.length - 1);
      } else {
        push("Advice", trimmed);
      }
      continue;
    }

    typedCount += 1;
    const type = match[1] as PlanItemType;
    let body = match[2].trim();
    let date: string | undefined;

    if (type === "Follow-up") {
      const dated = TRAILING_DATE.exec(body);
      // Only treat the parenthesised part as a date if it reads like one, so
      // "[Follow-up] Review (after results)" stays a single text item.
      if (dated && /[\d/-]/.test(dated[2])) {
        body = dated[1].trim();
        date = dated[2].trim();
      }
    }

    // "[Follow-up]" with nothing after it — keep the item so the doctor can see
    // and fix it rather than losing the row entirely.
    push(type, body || "—", date);
  }

  if (items.length === 0) return [];
  if (typedCount === 0) {
    // Pure legacy free text: one item, original line breaks preserved.
    return [makePlanItem("Advice", raw)];
  }
  return items;
}
