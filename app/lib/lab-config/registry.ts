import type {
  TestDefinition,
  TestFieldConfig,
  ResultEntry,
  ResultFlag,
  InterpretationRule,
} from "./types";
import { TEST_DEFINITIONS } from "./tests";

// ─── Config Resolution ───────────────────────────────────────────────────

/**
 * Resolve a test definition from a test name (stored in LabRequest.testName).
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Fallback: generic single-text-field definition
 */
export function getTestDefinition(testName: string): TestDefinition {
  if (TEST_DEFINITIONS[testName]) return TEST_DEFINITIONS[testName];

  const key = Object.keys(TEST_DEFINITIONS).find(
    (k) => k.toLowerCase() === testName.toLowerCase()
  );
  if (key) return TEST_DEFINITIONS[key];

  // Fallback: a single text field — no test falls through to "CBC default"
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
 *   "X–Y"   → LOW if below X, HIGH if above Y
 *   "X-Y"   → same as above (hyphen)
 *   text     → compared against known-negative keywords
 */
export function computeFlag(value: string, range: string): ResultFlag {
  if (!value || !value.trim()) return "";

  const v = parseFloat(value);
  if (isNaN(v)) return "NORMAL";

  // <X pattern (e.g. "<200" for Total Cholesterol)
  const ltMatch = range.match(/^<(\d+\.?\d*)$/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (v > max) return "HIGH";
    return "NORMAL";
  }

  // >X pattern (e.g. ">50")
  const gtMatch = range.match(/^>(\d+\.?\d*)$/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (v < min) return "LOW";
    return "NORMAL";
  }

  // X–Y or X-Y range (e.g. "4.0-11.0", "0.1–1.0")
  const rangeMatch = range.match(/^(\d+\.?\d*)\s*[–-]\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (v < low) return "LOW";
    if (v > high) return "HIGH";
    return "NORMAL";
  }

  // Text-based negative keywords
  const lowValues = ["negative", "none", "nil", "absent", "few"];
  const entered = value.trim().toLowerCase();
  if (lowValues.includes(entered) || lowValues.includes(range.toLowerCase())) {
    if (!lowValues.includes(entered)) return "HIGH";
    return "NORMAL";
  }

  return "NORMAL";
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
