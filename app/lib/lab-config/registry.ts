import type {
  TestDefinition,
  TestFieldConfig,
  ResultEntry,
  ResultFlag,
  InterpretationRule,
} from "./types";
import { TEST_DEFINITIONS } from "./tests";
import { LAB_TEST_CATALOG } from "../labTestCatalog";

// ─── Catalog → Definition Resolution ───────────────────────────────────────
// LabRequest.testName stores the name exactly as picked at ordering time:
// reception / cashier orders use LAB_TEST_CATALOG names, doctor orders use
// DOCTOR_LAB_TESTS names. These name spaces differ from TEST_DEFINITIONS keys
// ("Full Haemogram / CBC" [T001] vs the key "Full Blood Count (FBC / CBC)").
// A name that misses every key used to fall through to a generic single
// "Result" row — silently destroying multi-field panels (CBC, LFT, RFT,
// Electrolytes, Malaria). Resolution order is now:
//   1. Exact key match
//   2. Case-insensitive key match
//   3. Catalog template resolution — any name registered in LAB_TEST_CATALOG
//      under a panel template ("CBC" / "URINALYSIS") resolves to the canonical
//      definition for that template, no matter how the name is written.
//      "GLUCOSE" resolves by keyword (fasting → FBS, random → RBS).
//   4. Explicit alias map — known catalog / free-text names that differ from
//      their definition key (e.g. "Liver Function Test (LFTs)").
//   5. Fallback: generic single-text-field definition — only for tests with
//      no registered panel at all.
// ────────────────────────────────────────────────────────────────────────────

/** Catalog panel template → the canonical TEST_DEFINITIONS key that renders it. */
const TEMPLATE_DEFINITION_KEYS: Record<string, string | undefined> = {
  CBC: "Full Blood Count (FBC / CBC)",
  URINALYSIS: "Urinalysis",
};

/**
 * Known names that differ from their TEST_DEFINITIONS key. Multi-field panels
 * first (the critical class — a single "Result" row destroys them), then
 * single-field equivalents so they render their proper label / reference
 * range instead of a bare "Result". Only unambiguous mappings are listed —
 * a test is NEVER guessed onto a panel.
 */
const TEST_NAME_ALIASES: Record<string, string> = {
  // Multi-field panels ordered under catalog names that differ from the key
  "Liver Function Test (LFTs)": "Liver Function Test (LFT)",
  "Renal Function Test (RFTs)": "Renal Function Test (RFT)",
  "Electrolytes": "Serum Electrolytes",
  "Malaria MRDT": "Malaria RDT",
  "Malaria BS × MPS": "Blood Smear for Malaria Parasites (MPS)",
  "Post BS": "Post Blood Sugar (Post BS)",
  // Single-field equivalents (correct label + reference range + flag)
  "Prostate Specific Antigen (PSA)": "PSA (Prostate Specific Antigen)",
  "Hepatitis B SAg": "Hepatitis B Surface Antigen (HepBSAg)",
  "H. Pylori Antigen": "H. Pylori Stool Antigen",
  "H. Pylori Antibody": "H. Pylori Antibody Test",
  "HIV 1/2": "HIV Screen (1/2)",
  "Syphilis TPHA": "TPHA (Syphilis)",
  "Pregnancy Urine Test": "Urine hCG (Pregnancy Test)",
  // Free-text variants observed on real orders in the database
  "Full Blood Count": "Full Blood Count (FBC / CBC)",
  "Blood smear for malaria parasites": "Blood Smear for Malaria Parasites (MPS)",
  "Random blood sugar (RBS)": "Random Blood Sugar / RBS",
};

/** Find the catalog entry's template by name (exact, then case-insensitive). */
function findCatalogTemplate(testName: string): string | null {
  const entry =
    LAB_TEST_CATALOG.find((c) => c.name === testName) ??
    LAB_TEST_CATALOG.find(
      (c) => c.name.toLowerCase() === testName.toLowerCase()
    );
  return entry ? entry.template : null;
}

/** Resolve a catalog template to a TEST_DEFINITIONS key for this name. */
function resolveTemplateKey(testName: string, template: string): string | null {
  if (template === "GLUCOSE") {
    const n = testName.toLowerCase();
    if (n.includes("fasting")) return "Fasting Blood Sugar / FBS";
    if (n.includes("random")) return "Random Blood Sugar / RBS";
    return null;
  }
  return TEMPLATE_DEFINITION_KEYS[template] ?? null;
}

/** Look up the alias map (exact, then case-insensitive). */
function findAliasKey(testName: string): string | null {
  if (TEST_NAME_ALIASES[testName]) return TEST_NAME_ALIASES[testName];
  const lower = testName.toLowerCase();
  const aliasName = Object.keys(TEST_NAME_ALIASES).find(
    (k) => k.toLowerCase() === lower
  );
  return aliasName ? TEST_NAME_ALIASES[aliasName] : null;
}

/**
 * Resolve a test definition from a test name (stored in LabRequest.testName).
 * See the resolution order documented above — the catalog template mechanism
 * guarantees every name registered under a panel template (CBC, URINALYSIS,
 * GLUCOSE) resolves to that panel's full field list, regardless of the exact
 * name string it was ordered under.
 */
export function getTestDefinition(testName: string): TestDefinition {
  // 1. Exact key match
  if (TEST_DEFINITIONS[testName]) return TEST_DEFINITIONS[testName];

  // 2. Case-insensitive key match
  const key = Object.keys(TEST_DEFINITIONS).find(
    (k) => k.toLowerCase() === testName.toLowerCase()
  );
  if (key) return TEST_DEFINITIONS[key];

  // 3. Catalog template resolution — the panel-level mechanism. Any name in
  //    LAB_TEST_CATALOG under a panel template resolves to the canonical
  //    definition, so both "Complete Blood Count / CBC" [LAB009] and
  //    "Full Haemogram / CBC" [T001] render the identical CBC field panel.
  const template = findCatalogTemplate(testName);
  if (template) {
    const tKey = resolveTemplateKey(testName, template);
    if (tKey && TEST_DEFINITIONS[tKey]) return TEST_DEFINITIONS[tKey];
  }

  // 4. Explicit alias map for names that differ from their definition key
  const aliasKey = findAliasKey(testName);
  if (aliasKey && TEST_DEFINITIONS[aliasKey]) return TEST_DEFINITIONS[aliasKey];

  // 5. Fallback: a single text field — reserved for tests with no registered
  //    panel (e.g. "Blood Group", "Genotype", culture workups)
  return {
    id: testName,
    label: testName,
    fields: [{ test: "Result", unit: "", referenceRange: "", inputType: "text" }],
  };
}

/**
 * Get the flat list of fields from a definition, merging sections if present.
 */
export function getFlatFields(def: TestDefinition): TestFieldConfig[] {
  if (def.sections) {
    return def.sections.flatMap((s) => s.fields);
  }
  return def.fields;
}

/**
 * Get the number of fields per section (for index mapping when sections exist).
 * Returns an array of cumulative counts, e.g. [12, 20] means section 0 has 12 fields, section 1 has 8.
 */
export function getSectionFieldBounds(def: TestDefinition): number[] {
  if (!def.sections) return [def.fields.length];
  const bounds: number[] = [];
  let acc = 0;
  for (const s of def.sections) {
    acc += s.fields.length;
    bounds.push(acc);
  }
  return bounds;
}

// ─── Flag Computation ─────────────────────────────────────────────────────

/**
 * Compute an abnormal flag for a single result value against its reference range.
 *
 * Parses patterns:
 *   "<X"    → HIGH if value > X
 *   ">X"    → LOW  if value < X
 *   "X–Y"   → LOW if below X, HIGH if above Y (en-dash U+2013)
 *   "X-Y"   → same as above (hyphen-minus U+002D — the regex accepts both)
 *   text     → exact match or known-negative keyword → NORMAL
 *
 * Safety invariant (patient-safety fix): a value or range that cannot be
 * parsed NEVER returns "NORMAL". Both failure paths return "UNVERIFIED" so
 * the UI renders "range unavailable" instead of a false-green badge — a
 * silently-missing range is worse than no flag at all. Comparisons are
 * numeric (parseFloat), never string.
 */
export function computeFlag(value: string, range: string): ResultFlag {
  if (!value || !value.trim()) return "";

  const trimmed = value.trim();
  const trimmedRange = (range ?? "").trim();
  const entered = trimmed.toLowerCase();
  const rangeLower = trimmedRange.toLowerCase();

  // Text semantics checked BEFORE the numeric parse so that "Negative" /
  // "Nil" / "Few" / "Clear" / "Yellow" etc. are NORMAL, and any other
  // non-numeric value is UNVERIFIED rather than silently NORMAL.
  const lowValues = ["negative", "none", "nil", "absent", "few", "neg"];
  if (lowValues.includes(entered)) return "NORMAL";
  if (trimmed === trimmedRange) return "NORMAL"; // exact match, e.g. "Clear" vs "Clear"
  if (lowValues.includes(rangeLower)) {
    return "HIGH"; // value present but the expected result is "Negative" etc.
  }

  const v = parseFloat(trimmed);
  if (isNaN(v)) return "UNVERIFIED"; // non-numeric value that isn't a known keyword

  // No range to check against → cannot verify, must not default to NORMAL
  if (!trimmedRange) return "UNVERIFIED";

  // <X pattern (e.g. "<200" for Total Cholesterol)
  const ltMatch = trimmedRange.match(/^<(\d+\.?\d*)$/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (v > max) return "HIGH";
    return "NORMAL";
  }

  // >X pattern (e.g. ">50")
  const gtMatch = trimmedRange.match(/^>(\d+\.?\d*)$/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (v < min) return "LOW";
    return "NORMAL";
  }

  // X–Y or X-Y range (e.g. "4.0-11.0", "0.1–1.0"). The character class
  // [–-] accepts BOTH the en-dash (U+2013) and hyphen-minus (U+002D).
  const rangeMatch = trimmedRange.match(/^(\d+\.?\d*)\s*[–-]\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (v < low) return "LOW";
    if (v > high) return "HIGH";
    return "NORMAL";
  }

  // Range present but unparseable (e.g. sex-split "M: 13.5–17.5; F: 12.0–15.5")
  // → cannot verify, never NORMAL
  return "UNVERIFIED";
}

/**
 * Tailwind CSS classes for each flag level.
 */
export function getFlagColor(flag: ResultFlag): string {
  switch (flag) {
    case "HIGH":
      return "text-red-600 bg-red-50 border-red-200";
    case "LOW":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "NORMAL":
      return "text-green-700 bg-green-50 border-green-200";
    case "UNVERIFIED":
      return "text-gray-600 bg-gray-100 border-gray-300";
    default:
      return "text-gray-400";
  }
}

// ─── Interpretation ───────────────────────────────────────────────────────

/**
 * Compute the interpretation / remarks text for a set of results
 * based on the test's interpretation rules, or fall back to the
 * generic "Abnormal results detected" text.
 */
export function computeInterpretation(
  results: ResultEntry[],
  rules?: InterpretationRule[]
): { text: string; isCritical: boolean } {
  const hasHigh = results.some((r) => r.flag === "HIGH");
  const hasLow = results.some((r) => r.flag === "LOW");
  const allNormal = results.length > 0 && results.every((r) => r.flag === "NORMAL" || r.flag === "");
  const flagged = results.filter((r) => r.flag === "HIGH" || r.flag === "LOW");
  const unverified = results.filter((r) => r.flag === "UNVERIFIED");

  if (rules && rules.length > 0) {
    for (const rule of rules) {
      let matches = false;
      switch (rule.condition) {
        case "ANY_HIGH":
          matches = hasHigh;
          break;
        case "ANY_LOW":
          matches = hasLow;
          break;
        case "ALL_NORMAL":
          matches = allNormal;
          break;
        case "CUSTOM":
          matches = false; // reserved for future evaluator functions
          break;
      }
      if (matches) {
        return { text: rule.interpretation, isCritical: rule.isCritical ?? false };
      }
    }
  }

  // Fallback: generic interpretation based on flags
  if (flagged.length > 0) {
    return {
      text: `Abnormal results detected: ${flagged
        .map((r) => `${r.test} (${r.result}, ${r.flag})`)
        .join("; ")}. Clinical correlation advised.`,
      isCritical: true,
    };
  }

  // Never say "No remarks." while some results could not be verified —
  // a silent all-clear is the exact false-normal this system must avoid.
  if (unverified.length > 0) {
    return {
      text: `Reference range unavailable for: ${unverified
        .map((r) => `${r.test} (${r.result})`)
        .join("; ")}. Values not verified — clinical correlation advised.`,
      isCritical: false,
    };
  }

  return { text: "No remarks.", isCritical: false };
}

// ─── Validation ───────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

/**
 * Validate results against the field-level validation rules in a test definition.
 * Returns an array of error messages, empty if valid.
 */
export function validateResults(
  results: ResultEntry[],
  def: TestDefinition
): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  const fields = getFlatFields(def);

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const result = results[i];
    if (!result) continue;

    const rules = field.validation;
    if (!rules || rules.length === 0) continue;

    for (const rule of rules) {
      switch (rule.type) {
        case "required":
          if (!result.result || !result.result.trim()) {
            errors.push({
              field: field.test,
              message: rule.message || `${field.test} is required.`,
            });
          }
          break;
        case "numeric":
          if (result.result.trim() && isNaN(parseFloat(result.result))) {
            errors.push({
              field: field.test,
              message: rule.message || `${field.test} must be a numeric value.`,
            });
          }
          break;
        case "min":
          if (result.result.trim()) {
            const val = parseFloat(result.result);
            if (!isNaN(val) && val < (rule.value as number)) {
              errors.push({
                field: field.test,
                message:
                  rule.message ||
                  `${field.test} must be at least ${rule.value}.`,
              });
            }
          }
          break;
        case "max":
          if (result.result.trim()) {
            const val = parseFloat(result.result);
            if (!isNaN(val) && val > (rule.value as number)) {
              errors.push({
                field: field.test,
                message:
                  rule.message ||
                  `${field.test} must be at most ${rule.value}.`,
              });
            }
          }
          break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
