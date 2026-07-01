// ─── Laboratory Configuration Types ────────────────────────────────────────
// Every test defines its own result-entry template, input types, validation
// rules, reference ranges, interpretation rules, and print layout.

export type FieldInputType =
  | "text" | "textarea"
  | "number" | "decimal"
  | "select" | "multiSelect"
  | "positiveNegative" | "reactiveNonReactive" | "detectedNotDetected"
  | "abo" | "rh" | "titre"
  | "dateTime" | "date" | "time"
  | "file";

export interface FieldValidation {
  type: "required" | "min" | "max" | "pattern" | "numeric";
  value?: number | string;
  message: string;
}

export interface TestFieldConfig {
  /** Display name of the parameter (e.g. "Hemoglobin (HGB)") */
  test: string;
  /** Unit of measurement (e.g. "g/dL", "×10⁹/L") */
  unit?: string;
  /** Reference range string shown to the user (e.g. "M: 13.5–17.5; F: 12.0–15.5") */
  referenceRange: string;
  /** How the result is entered */
  inputType: FieldInputType;
  /**
   * Options for "select" / "multiSelect" / "abo" / "rh" input types.
   * Can be simple string values or { label, value } pairs for richer display.
   */
  options?: (string | { label: string; value: string })[];
  /**
   * Placeholder text shown in the input when empty.
   */
  placeholder?: string;
  /**
   * Number of decimal places for "decimal" input type (default auto).
   */
  decimalPlaces?: number;
  /** Per-field validation rules */
  validation?: FieldValidation[];
}

export interface TestSection {
  /** Section heading shown as a tab (e.g. "Dipstick", "Microscopy") */
  title: string;
  /** Optional description below the heading */
  description?: string;
  /** Fields in this section */
  fields: TestFieldConfig[];
}

export interface InterpretationRule {
  /**
   * When this rule triggers:
   *  - "ANY_HIGH"   → at least one field flagged HIGH
   *  - "ANY_LOW"    → at least one field flagged LOW
   *  - "ALL_NORMAL" → every field is NORMAL
   *  - "CUSTOM"     → reserved for future per-test evaluators
   */
  condition: "ANY_HIGH" | "ANY_LOW" | "ALL_NORMAL" | "CUSTOM";
  /** The interpretation/remark text shown on the report */
  interpretation: string;
  /** Mark the entire result as critical when this rule matches */
  isCritical?: boolean;
}

export interface PrintLayoutConfig {
  /**
   * If set, a "WBC DIFFERENTIAL" section header row is inserted
   * before the field at this index in the print table.
   * Used by CBC / differential panels.
   */
  wbcDifferentialStartIndex?: number;
  /** Show watermark on print (default true) */
  showWatermark?: boolean;
}

export interface TestDefinition {
  /** Unique key matching the testName stored in LabRequest.testName */
  id: string;
  /** Human-readable label displayed in the UI */
  label: string;
  /** Category ID from TEST_CATEGORIES */
  category?: string;
  /** Recommended specimen types */
  specimenTypes?: string[];
  /**
   * Optional sections for tabbed display (e.g. Urinalysis:
   * Dipstick tab + Microscopy tab). When present, fields are
   * derived from sections. When absent, the flat `fields` array is used.
   */
  sections?: TestSection[];
  /** Flat list of fields. Required when sections is not set. */
  fields: TestFieldConfig[];
  /** Rules for computing test-level interpretation text */
  interpretationRules?: InterpretationRule[];
  /** Print / report layout overrides */
  printLayout?: PrintLayoutConfig;
}

export interface TestCategory {
  id: string;
  label: string;
  description?: string;
}

// ─── Result entry (runtime) ───────────────────────────────────────────────

export interface ResultEntry {
  test: string;
  unit: string;
  referenceRange: string;
  result: string;
  flag: "" | "HIGH" | "LOW" | "NORMAL";
}

export type ResultFlag = ResultEntry["flag"];
