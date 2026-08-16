// ─── Patient-Aware Reference Ranges ────────────────────────────────────────
// Age- and sex-specific reference ranges for CBC fields and glucose tests.
//
// The static `referenceRange` strings in tests.ts are adult defaults. This
// module resolves the correct range for a real patient, given the patient's
// age (value + unit) and sex (as stored on Patient.gender: "MALE" / "FEMALE").
//
// Bands (in months):
//   newborn    0–1mo    | infant   1–12mo   | child_1_5  1–5y  (12–60mo)
//   child_6_12 6–12y    | adolescent 13–17y | adult      18y+
//
// Resolved ranges are returned as bare "low–high" strings (en-dash) so that
// computeFlag() in registry.ts can parse them directly. Unknown field names
// return "" — callers then fall back to the field's static referenceRange.
// ────────────────────────────────────────────────────────────────────────────

// ─── Age bands (inclusive upper bounds, months) ────────────────────────────
const NEWBORN_MAX_MONTHS = 1;      // 0–1 month
const INFANT_MAX_MONTHS = 12;      // 1–12 months
const CHILD_1_5_MAX_MONTHS = 60;   // 1–5 years
const CHILD_6_12_MAX_MONTHS = 144; // 6–12 years
const ADOLESCENT_MAX_MONTHS = 204; // 13–17 years; >204 → adult (18y+)

type Band =
  | "newborn"
  | "infant"
  | "child_1_5"
  | "child_6_12"
  | "adolescent"
  | "adult";

type RangeTuple = [number, number];

/** Per-field banded ranges. Adolescent / adult bands are sex-specific. */
interface BandedRanges {
  newborn: RangeTuple;
  infant: RangeTuple;
  child_1_5: RangeTuple;
  child_6_12: RangeTuple;
  adolescentMale: RangeTuple;
  adolescentFemale: RangeTuple;
  adultMale: RangeTuple;
  adultFemale: RangeTuple;
}

// ─── CBC banded ranges (units as noted per field) ──────────────────────────

const CBC_RANGES: Record<string, BandedRanges> = {
  // Hemoglobin (g/dL)
  HB: {
    newborn: [14, 22], infant: [10, 14], child_1_5: [11, 13.5], child_6_12: [11.5, 15.5],
    adolescentMale: [13, 16], adolescentFemale: [12, 16],
    adultMale: [13, 17], adultFemale: [12, 16],
  },
  // Hematocrit / PCV (%)
  HCT: {
    newborn: [42, 65], infant: [31, 41], child_1_5: [32, 40], child_6_12: [35, 45],
    adolescentMale: [37, 49], adolescentFemale: [36, 46],
    adultMale: [40, 52], adultFemale: [36, 46],
  },
  // Red Blood Cell count (×10¹²/L)
  RBC: {
    newborn: [4.0, 6.6], infant: [3.8, 5.2], child_1_5: [3.9, 5.3], child_6_12: [4.0, 5.2],
    adolescentMale: [4.5, 5.9], adolescentFemale: [4.0, 5.2],
    adultMale: [4.5, 5.9], adultFemale: [4.0, 5.2],
  },
  // Mean Corpuscular Volume (fL)
  MCV: {
    newborn: [95, 121], infant: [70, 86], child_1_5: [70, 86], child_6_12: [77, 95],
    adolescentMale: [78, 98], adolescentFemale: [78, 98],
    adultMale: [80, 100], adultFemale: [80, 100],
  },
  // Mean Corpuscular Hemoglobin (pg)
  MCH: {
    newborn: [31, 37], infant: [23, 31], child_1_5: [23, 31], child_6_12: [25, 33],
    adolescentMale: [25, 33], adolescentFemale: [25, 33],
    adultMale: [27, 33], adultFemale: [27, 33],
  },
  // Mean Corpuscular Hemoglobin Concentration (g/dL)
  MCHC: {
    newborn: [30, 36], infant: [30, 36], child_1_5: [31, 37], child_6_12: [31, 37],
    adolescentMale: [31, 36], adolescentFemale: [31, 36],
    adultMale: [32, 36], adultFemale: [32, 36],
  },
  // RDW-CV (%)
  RDW: {
    newborn: [13, 18], infant: [11, 16], child_1_5: [11, 16], child_6_12: [11, 15],
    adolescentMale: [11, 15], adolescentFemale: [11, 15],
    adultMale: [11.5, 14.5], adultFemale: [11.5, 14.5],
  },
  // White Blood Cell count (×10⁹/L)
  WBC: {
    newborn: [9, 30], infant: [6, 17], child_1_5: [5, 15], child_6_12: [4.5, 13.5],
    adolescentMale: [4.5, 11], adolescentFemale: [4.5, 11],
    adultMale: [4, 11], adultFemale: [4, 11],
  },
  // Neutrophils / Granulocytes (%)
  NEUTROPHILS: {
    newborn: [40, 80], infant: [15, 45], child_1_5: [30, 60], child_6_12: [40, 70],
    adolescentMale: [40, 70], adolescentFemale: [40, 70],
    adultMale: [40, 75], adultFemale: [40, 75],
  },
  // Lymphocytes (%)
  LYMPHOCYTES: {
    newborn: [20, 50], infant: [40, 70], child_1_5: [30, 60], child_6_12: [20, 50],
    adolescentMale: [20, 45], adolescentFemale: [20, 45],
    adultMale: [20, 40], adultFemale: [20, 40],
  },
};

// ─── Flat ranges (no age/sex variation) ────────────────────────────────────
const FLAT_RANGES: Record<string, RangeTuple> = {
  // Platelets (×10⁹/L) — flat, no age/sex variation
  PLATELETS: [150, 450],
  // Glucose tests (mmol/L) — fixed, do not vary by age or sex
  FBS: [4.5, 5.5],
  RBS: [4.5, 7.5],
};

/**
 * Test names whose fields resolve patient-aware ranges via
 * getReferenceRangeForPatient(). Kept here (not in page.tsx) so the list
 * stays co-located with the table.
 *
 * NOTE: doctor-side glucose names ("Blood Glucose (Fasting FBS)" etc.) are
 * intentionally absent — they are defined in mg/dL in tests.ts and must keep
 * their static ranges.
 */
export const REFERENCE_RANGE_TEST_IDS: ReadonlySet<string> = new Set([
  "Full Blood Count (FBC / CBC)",
  "Complete Blood Count with WBC Differential (3-part)",
  "Fasting Blood Sugar / FBS",
  "Random Blood Sugar / RBS",
]);

// ─── Field name → code ─────────────────────────────────────────────────────

/**
 * Map a field display name (TestFieldConfig.test, e.g. "Hemoglobin (HGB)")
 * to a range-table code. Returns null when the field has no structured range
 * (e.g. MPV, LYM#, GRAN#, Widal titres) so callers fall back to the static
 * referenceRange.
 *
 * Order matters: MCHC must be checked before MCH/HGB, and the absolute
 * counts (LYM# / GRAN#) must not match the % fields.
 */
function fieldNameToCode(fieldName: string): string | null {
  const n = fieldName.toLowerCase();

  // Glucose — the only flat, test-specific codes. Field names match the
  // LAB050 / LAB051 definitions in tests.ts.
  if (n.includes("glucose")) {
    if (n.includes("fasting")) return "FBS";
    if (n.includes("random")) return "RBS";
    return null;
  }

  // MCHC before MCH/HGB ("Mean Corpuscular HGB Conc." contains "hgb")
  if (n.includes("mchc") || n.includes("mean corpuscular hgb conc") || n.includes("mean corpuscular hemoglobin conc")) return "MCHC";
  if (n.includes("mean corpuscular volume") || n.includes("mcv")) return "MCV";
  if (n.includes("mean corpuscular hemoglobin") || n.includes("mch")) return "MCH";

  // RDW before RBC ("Red Cell Distribution Width" contains "red cell")
  if (n.includes("rdw")) return "RDW";

  if (n.includes("hematocrit") || n.includes("hct") || n.includes("pcv")) return "HCT";
  if (n.includes("hemoglobin") || n.includes("hgb")) return "HB";
  if (n.includes("red blood cell") || n.includes("rbc")) return "RBC";
  if (n.includes("white blood cell") || n.includes("wbc")) return "WBC";

  // % fields only — LYM# / GRAN# (absolute counts) must NOT match
  if (n.includes("lym%") || n.includes("lymphocyte")) return "LYMPHOCYTES";
  if (n.includes("gran%") || n.includes("granulocyte") || n.includes("neutrophil")) return "NEUTROPHILS";

  // Platelet COUNT only — MPV ("Mean Platelet Volume") must not match
  if (n.includes("mean platelet") || n.includes("mpv")) return null;
  if (n.includes("platelet") || n.includes("plt")) return "PLATELETS";

  return null;
}

// ─── Age / sex resolution ──────────────────────────────────────────────────

/** Convert an age value + unit into months. Unknown units default to years. */
function toMonths(ageValue: number, ageUnit: string): number {
  const unit = (ageUnit || "years").toLowerCase();
  if (unit === "months" || unit === "month" || unit === "mo") return ageValue;
  if (unit === "days" || unit === "day") return ageValue / 30;
  if (unit === "weeks" || unit === "week") return ageValue * (12 / 52);
  return ageValue * 12; // years and anything else
}

function selectBand(months: number): Band {
  if (months <= NEWBORN_MAX_MONTHS) return "newborn";
  if (months <= INFANT_MAX_MONTHS) return "infant";
  if (months <= CHILD_1_5_MAX_MONTHS) return "child_1_5";
  if (months <= CHILD_6_12_MAX_MONTHS) return "child_6_12";
  if (months <= ADOLESCENT_MAX_MONTHS) return "adolescent";
  return "adult";
}

/** Normalize the stored Patient.gender ("MALE"/"FEMALE"/"OTHER") case-insensitively. */
type Sex = "male" | "female" | null;
function normalizeSex(gender: string | undefined | null): Sex {
  const g = (gender ?? "").trim().toLowerCase();
  if (g.startsWith("m")) return "male";
  if (g.startsWith("f")) return "female";
  return null;
}

/** Format a tuple as a bare "low–high" string (en-dash, parsed by computeFlag). */
function formatRange([low, high]: RangeTuple): string {
  return `${low}–${high}`;
}

/**
 * Resolve the reference range for a patient.
 *
 * @param fieldCode  the field's display name (TestFieldConfig.test)
 * @param ageValue   patient's age value
 * @param ageUnit    "years" | "months" (defaults to years)
 * @param gender     Patient.gender — "MALE"/"FEMALE"/"OTHER" (case-insensitive)
 * @returns a "low–high" range string, or "" if this field has no structured range
 */
export function getReferenceRangeForPatient(
  fieldCode: string,
  ageValue: number,
  ageUnit: string,
  gender: string
): string {
  const code = fieldNameToCode(fieldCode);
  if (!code) return "";

  // Flat ranges (platelets, glucose) — ignore age and sex entirely
  const flat = FLAT_RANGES[code];
  if (flat) return formatRange(flat);

  const banded = CBC_RANGES[code];
  if (!banded) return "";

  const band = selectBand(toMonths(ageValue, ageUnit));
  const sex = normalizeSex(gender);

  if (band === "adolescent" || band === "adult") {
    const male = band === "adolescent" ? banded.adolescentMale : banded.adultMale;
    const female = band === "adolescent" ? banded.adolescentFemale : banded.adultFemale;
    if (sex === "male") return formatRange(male);
    if (sex === "female") return formatRange(female);
    // Missing / OTHER gender → the widest span covering both sexes, never throws
    return formatRange([
      Math.min(male[0], female[0]),
      Math.max(male[1], female[1]),
    ]);
  }

  return formatRange(banded[band]);
}
