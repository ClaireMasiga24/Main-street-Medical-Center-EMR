// ─── Final Diagnosis ──────────────────────────────────────────────────────
// The doctor confirms or changes the suspected diagnosis once results are
// back, so Final Diagnosis has to be separate from the Provisional one. There
// is no column for it on ClinicalNote or Visit, so for now it lives inside
// `notes` in a reserved fenced block:
//
//   <!--FINAL_DIAGNOSIS-->
//   Malaria
//   <!--/FINAL_DIAGNOSIS-->
//
// EVERY read and write of that block goes through extractFinalDiagnosis,
// injectFinalDiagnosis and notesWithoutFinalDiagnosis below. When the real
// `finalDiagnosis` column is added, only this file changes — no page has to
// know where it is stored.
//
// This lives in lib/ rather than on the doctor's page because the block leaks
// onto any screen that renders Visit.notes — the laboratory's Clinical Summary
// panel, for one. Those screens must not have to re-implement the markers.

const FD_OPEN = "<!--FINAL_DIAGNOSIS-->";
const FD_CLOSE = "<!--/FINAL_DIAGNOSIS-->";
/** Non-greedy, so a doctor typing a stray open marker cannot swallow the note. */
const FD_BLOCK = new RegExp(`${FD_OPEN}[\\s\\S]*?${FD_CLOSE}[\\r\\n]*`);

/** The final diagnosis, or "" when the block is absent, empty or malformed. */
export const extractFinalDiagnosis = (notes: string | null | undefined): string => {
  if (!notes) return "";
  const match = notes.match(FD_BLOCK);
  if (!match) return "";
  return match[0].split(FD_OPEN)[1].split(FD_CLOSE)[0].trim();
};

/** `notes` with any previous block replaced by `finalDiagnosis` (or removed). */
export const injectFinalDiagnosis = (notes: string | null | undefined, finalDiagnosis: string): string => {
  const base = (notes ?? "").replace(FD_BLOCK, "").replace(/\n{3,}$/, "\n");
  const value = (finalDiagnosis ?? "").trim();
  if (!value) return base;
  return `${base}${base ? "\n" : ""}${FD_OPEN}\n${value}\n${FD_CLOSE}\n`;
};

/** Clinical notes as they should be shown: the block is never rendered raw. */
export const notesWithoutFinalDiagnosis = (notes: string | null | undefined): string =>
  (notes ?? "").replace(FD_BLOCK, "").trimEnd();
