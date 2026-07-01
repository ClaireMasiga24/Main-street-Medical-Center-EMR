import type { TestDefinition } from "./types";

// ─── Laboratory Test Configuration ─────────────────────────────────────────
// Each test registers its own result-entry template, input types, validation,
// reference ranges, interpretation rules, and print-layout overrides.
// To add a new test, add an entry here — no other code changes needed.
// ──────────────────────────────────────────────────────────────────────────

export const TEST_DEFINITIONS: Record<string, TestDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════
  // HAEMATOLOGY
  // ═══════════════════════════════════════════════════════════════════════

  "Full Blood Count (FBC / CBC)": {
    id: "Full Blood Count (FBC / CBC)",
    label: "Complete Blood Count (CBC)",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "White Blood Cell (WBC)", unit: "×10⁹/L", referenceRange: "4.0-11.0", inputType: "decimal" },
      { test: "Red Blood Cell (RBC)", unit: "×10¹²/L", referenceRange: "M: 4.5–5.9; F: 4.1–5.1", inputType: "decimal" },
      { test: "Hemoglobin (HGB)", unit: "g/dL", referenceRange: "M: 13.5–17.5; F: 12.0–15.5", inputType: "decimal" },
      { test: "Hematocrit (HCT)", unit: "%", referenceRange: "M: 41–53; F: 36–46", inputType: "decimal" },
      { test: "Mean Corpuscular Volume (MCV)", unit: "fL", referenceRange: "80–100", inputType: "decimal" },
      { test: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", referenceRange: "27–33", inputType: "decimal" },
      { test: "Mean Corpuscular HGB Conc. (MCHC)", unit: "g/dL", referenceRange: "32–36", inputType: "decimal" },
      { test: "RDW-CV (Red Cell Distribution Width)", unit: "%", referenceRange: "11.5–14.5", inputType: "decimal" },
      { test: "Platelet Count (PLT)", unit: "×10⁹/µL", referenceRange: "150–450", inputType: "number" },
      { test: "MPV (Mean Platelet Volume)", unit: "fL", referenceRange: "7.5–12.0", inputType: "decimal" },
      // WBC Differential (3-part)
      { test: "LYM% (Lymphocytes)", unit: "%", referenceRange: "20–40", inputType: "decimal" },
      { test: "MID% (Monocytes + Eosinophils + Basophils)", unit: "%", referenceRange: "2–15", inputType: "decimal" },
      { test: "GRAN% (Granulocytes)", unit: "%", referenceRange: "50–70", inputType: "decimal" },
      { test: "LYM#", unit: "×10⁹/µL", referenceRange: "1.0–4.0", inputType: "decimal" },
      { test: "MID#", unit: "×10⁹/µL", referenceRange: "0.1–1.5", inputType: "decimal" },
      { test: "GRAN#", unit: "×10⁹/µL", referenceRange: "2.0–7.5", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "One or more parameters are above reference range. Clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "One or more parameters are below reference range. Clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "All parameters within normal reference ranges." },
    ],
    printLayout: {
      wbcDifferentialStartIndex: 10,
      showWatermark: true,
    },
  },

  "Complete Blood Count with WBC Differential (3-part)": {
    id: "Complete Blood Count with WBC Differential (3-part)",
    label: "Complete Blood Count (CBC) with Differential",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "White Blood Cell (WBC)", unit: "×10⁹/L", referenceRange: "4.0-11.0", inputType: "decimal" },
      { test: "Red Blood Cell (RBC)", unit: "×10¹²/L", referenceRange: "M: 4.5–5.9; F: 4.1–5.1", inputType: "decimal" },
      { test: "Hemoglobin (HGB)", unit: "g/dL", referenceRange: "M: 13.5–17.5; F: 12.0–15.5", inputType: "decimal" },
      { test: "Hematocrit (HCT)", unit: "%", referenceRange: "M: 41–53; F: 36–46", inputType: "decimal" },
      { test: "Mean Corpuscular Volume (MCV)", unit: "fL", referenceRange: "80–100", inputType: "decimal" },
      { test: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", referenceRange: "27–33", inputType: "decimal" },
      { test: "Mean Corpuscular HGB Conc. (MCHC)", unit: "g/dL", referenceRange: "32–36", inputType: "decimal" },
      { test: "RDW-CV (Red Cell Distribution Width)", unit: "%", referenceRange: "11.5–14.5", inputType: "decimal" },
      { test: "Platelet Count (PLT)", unit: "×10⁹/µL", referenceRange: "150–450", inputType: "number" },
      { test: "MPV (Mean Platelet Volume)", unit: "fL", referenceRange: "7.5–12.0", inputType: "decimal" },
      { test: "LYM% (Lymphocytes)", unit: "%", referenceRange: "20–40", inputType: "decimal" },
      { test: "MID% (Monocytes + Eosinophils + Basophils)", unit: "%", referenceRange: "2–15", inputType: "decimal" },
      { test: "GRAN% (Granulocytes)", unit: "%", referenceRange: "50–70", inputType: "decimal" },
      { test: "LYM#", unit: "×10⁹/µL", referenceRange: "1.0–4.0", inputType: "decimal" },
      { test: "MID#", unit: "×10⁹/µL", referenceRange: "0.1–1.5", inputType: "decimal" },
      { test: "GRAN#", unit: "×10⁹/µL", referenceRange: "2.0–7.5", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "One or more parameters are above reference range. Clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "One or more parameters are below reference range. Clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "All parameters within normal reference ranges." },
    ],
    printLayout: {
      wbcDifferentialStartIndex: 10,
      showWatermark: true,
    },
  },

  "ESR": {
    id: "ESR",
    label: "ESR",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "ESR (Westergren)", unit: "mm/hr", referenceRange: "M: 0–22; F: 0–29", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated ESR — may indicate inflammatory process. Clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "ESR within normal limits." },
    ],
  },

  "Coagulation Profile (PT/INR/APTT)": {
    id: "Coagulation Profile (PT/INR/APTT)",
    label: "Coagulation Profile",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Prothrombin Time (PT)", unit: "sec", referenceRange: "11-13.5", inputType: "decimal" },
      { test: "INR", unit: "", referenceRange: "0.8-1.2", inputType: "decimal" },
      { test: "APTT", unit: "sec", referenceRange: "25-35", inputType: "decimal" },
      { test: "Fibrinogen", unit: "mg/dL", referenceRange: "200-400", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Prolonged coagulation times detected — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Shortened coagulation times detected — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Coagulation parameters within normal limits." },
    ],
  },

  "CD4 Count": {
    id: "CD4 Count",
    label: "CD4 Count",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "CD4 Count", unit: "cells/µL", referenceRange: "500–1500", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_LOW", interpretation: "Low CD4 count detected — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "CD4 count within normal limits." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // URINALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  Urinalysis: {
    id: "Urinalysis",
    label: "Urinalysis — Dipstick & Microscopy",
    category: "URINALYSIS",
    specimenTypes: ["URINE"],
    sections: [
      {
        title: "Dipstick",
        description: "Chemical analysis of urine using reagent strip",
        fields: [
          { test: "Color", unit: "", referenceRange: "Yellow", inputType: "text" },
          { test: "Appearance", unit: "", referenceRange: "Clear", inputType: "text" },
          { test: "Specific Gravity", unit: "", referenceRange: "1.005-1.030", inputType: "text" },
          { test: "pH", unit: "", referenceRange: "4.5-8.0", inputType: "text" },
          { test: "Glucose", unit: "mg/dL", referenceRange: "Negative", inputType: "text" },
          { test: "Protein", unit: "mg/dL", referenceRange: "Negative", inputType: "text" },
          { test: "Blood", unit: "", referenceRange: "Negative", inputType: "text" },
          { test: "Ketones", unit: "mg/dL", referenceRange: "Negative", inputType: "text" },
          { test: "Bilirubin", unit: "", referenceRange: "Negative", inputType: "text" },
          { test: "Urobilinogen", unit: "mg/dL", referenceRange: "0.1-1.0", inputType: "text" },
          { test: "Nitrite", unit: "", referenceRange: "Negative", inputType: "text" },
          { test: "Leukocytes", unit: "", referenceRange: "Negative", inputType: "text" },
        ],
      },
      {
        title: "Microscopy",
        description: "Microscopic examination of urine sediment",
        fields: [
          { test: "Red Blood Cells", unit: "/HPF", referenceRange: "0-2", inputType: "text" },
          { test: "White Blood Cells", unit: "/HPF", referenceRange: "0-5", inputType: "text" },
          { test: "Epithelial Cells", unit: "/HPF", referenceRange: "Few", inputType: "text" },
          { test: "Casts", unit: "/LPF", referenceRange: "0-0", inputType: "text" },
          { test: "Crystals", unit: "", referenceRange: "None", inputType: "text" },
          { test: "Bacteria", unit: "", referenceRange: "None", inputType: "text" },
          { test: "Yeast Cells", unit: "", referenceRange: "None", inputType: "text" },
          { test: "Trichomonas", unit: "", referenceRange: "None", inputType: "text" },
        ],
      },
    ],
    // Flat fields list for backward compat — derived from sections at lookup time
    get fields() {
      return (this.sections ?? []).flatMap((s) => s.fields);
    },
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Abnormal findings on urinalysis — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Below-reference findings on urinalysis — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Urinalysis within normal limits." },
    ],
  },

  "Urine Microscopy": {
    id: "Urine Microscopy",
    label: "Urinalysis — Microscopy Only",
    category: "URINALYSIS",
    specimenTypes: ["URINE"],
    fields: [
      { test: "Red Blood Cells", unit: "/HPF", referenceRange: "0-2", inputType: "text" },
      { test: "White Blood Cells", unit: "/HPF", referenceRange: "0-5", inputType: "text" },
      { test: "Epithelial Cells", unit: "/HPF", referenceRange: "Few", inputType: "text" },
      { test: "Casts", unit: "/LPF", referenceRange: "0-0", inputType: "text" },
      { test: "Crystals", unit: "", referenceRange: "None", inputType: "text" },
      { test: "Bacteria", unit: "", referenceRange: "None", inputType: "text" },
      { test: "Yeast Cells", unit: "", referenceRange: "None", inputType: "text" },
      { test: "Trichomonas", unit: "", referenceRange: "None", inputType: "text" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Abnormal microscopy findings — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Microscopy findings within normal limits." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BIOCHEMISTRY
  // ═══════════════════════════════════════════════════════════════════════

  "Liver Function Test (LFT)": {
    id: "Liver Function Test (LFT)",
    label: "Liver Function Test (LFT)",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Total Protein", unit: "g/dL", referenceRange: "6.0-8.3", inputType: "decimal" },
      { test: "Albumin", unit: "g/dL", referenceRange: "3.5-5.0", inputType: "decimal" },
      { test: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.1-1.2", inputType: "decimal" },
      { test: "Direct Bilirubin", unit: "mg/dL", referenceRange: "0.0-0.3", inputType: "decimal" },
      { test: "Indirect Bilirubin", unit: "mg/dL", referenceRange: "0.1-0.9", inputType: "decimal" },
      { test: "ALT (SGPT)", unit: "U/L", referenceRange: "7-56", inputType: "number" },
      { test: "AST (SGOT)", unit: "U/L", referenceRange: "5-40", inputType: "number" },
      { test: "Alkaline Phosphatase (ALP)", unit: "U/L", referenceRange: "44-147", inputType: "number" },
      { test: "Gamma-GT (GGT)", unit: "U/L", referenceRange: "9-48", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated liver enzymes / bilirubin — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Below-reference liver function parameters — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Liver function parameters within normal limits." },
    ],
  },

  "Renal Function Test (RFT)": {
    id: "Renal Function Test (RFT)",
    label: "Renal Function Test (RFT)",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Creatinine", unit: "mg/dL", referenceRange: "0.6-1.2", inputType: "decimal" },
      { test: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", referenceRange: "7-20", inputType: "number" },
      { test: "Urea", unit: "mg/dL", referenceRange: "15-43", inputType: "number" },
      { test: "Sodium (Na)", unit: "mEq/L", referenceRange: "136-145", inputType: "number" },
      { test: "Potassium (K)", unit: "mEq/L", referenceRange: "3.5-5.1", inputType: "decimal" },
      { test: "Chloride (Cl)", unit: "mEq/L", referenceRange: "98-106", inputType: "number" },
      { test: "Bicarbonate (HCO3)", unit: "mEq/L", referenceRange: "22-29", inputType: "number" },
      { test: "Calcium (Ca)", unit: "mg/dL", referenceRange: "8.5-10.5", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated renal function parameters — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Below-reference renal function parameters — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Renal function parameters within normal limits." },
    ],
  },

  "Serum Electrolytes": {
    id: "Serum Electrolytes",
    label: "Electrolytes Panel",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Sodium (Na)", unit: "mEq/L", referenceRange: "136-145", inputType: "number" },
      { test: "Potassium (K)", unit: "mEq/L", referenceRange: "3.5-5.1", inputType: "decimal" },
      { test: "Chloride (Cl)", unit: "mEq/L", referenceRange: "98-106", inputType: "number" },
      { test: "Bicarbonate (HCO3)", unit: "mEq/L", referenceRange: "22-29", inputType: "number" },
      { test: "Anion Gap", unit: "mEq/L", referenceRange: "8-12", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Electrolyte imbalance detected (elevated) — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Electrolyte imbalance detected (low) — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Electrolyte levels within normal limits." },
    ],
  },

  "Lipid Profile": {
    id: "Lipid Profile",
    label: "Lipid Profile",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200", inputType: "number" },
      { test: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100", inputType: "number" },
      { test: "HDL Cholesterol", unit: "mg/dL", referenceRange: "40-60", inputType: "number" },
      { test: "Triglycerides", unit: "mg/dL", referenceRange: "<150", inputType: "number" },
      { test: "VLDL", unit: "mg/dL", referenceRange: "5-40", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated lipid levels detected — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Low HDL detected — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Lipid profile within desirable limits." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ENDOCRINOLOGY — Glucose tests
  // ═══════════════════════════════════════════════════════════════════════

  "Blood Glucose (Random RBS)": {
    id: "Blood Glucose (Random RBS)",
    label: "Blood Glucose (Random)",
    category: "ENDOCRINOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Glucose (Random)", unit: "mg/dL", referenceRange: "<140", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated random blood glucose — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Random blood glucose within normal limits." },
    ],
  },

  "Blood Glucose (Fasting FBS)": {
    id: "Blood Glucose (Fasting FBS)",
    label: "Blood Glucose (Fasting)",
    category: "ENDOCRINOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Glucose (Fasting)", unit: "mg/dL", referenceRange: "70-110", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated fasting blood glucose — clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Low fasting blood glucose (hypoglycemia) — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Fasting blood glucose within normal limits." },
    ],
  },

  "HbA1c": {
    id: "HbA1c",
    label: "HbA1c",
    category: "ENDOCRINOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "HbA1c", unit: "%", referenceRange: "4.0-5.6", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated HbA1c — may indicate impaired glucose control. Clinical correlation advised.", isCritical: true },
      { condition: "ANY_LOW", interpretation: "Low HbA1c — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "HbA1c within normal limits." },
    ],
  },

  "Post Blood Sugar (Post BS)": {
    id: "Post Blood Sugar (Post BS)",
    label: "Post Blood Sugar",
    category: "ENDOCRINOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Glucose (Postprandial)", unit: "mg/dL", referenceRange: "<140", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated postprandial blood glucose — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Postprandial blood glucose within normal limits." },
    ],
  },

  "PSA (Prostate Specific Antigen)": {
    id: "PSA (Prostate Specific Antigen)",
    label: "PSA (Prostate Specific Antigen)",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "PSA", unit: "ng/mL", referenceRange: "<4.0", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated PSA — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "PSA within normal limits." },
    ],
  },

  "Uric Acid": {
    id: "Uric Acid",
    label: "Uric Acid",
    category: "BIOCHEMISTRY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Uric Acid", unit: "mg/dL", referenceRange: "M: 3.4–7.0; F: 2.4–6.0", inputType: "decimal" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated uric acid (hyperuricemia) — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Uric acid within normal limits." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MICROBIOLOGY — Malaria
  // ═══════════════════════════════════════════════════════════════════════

  "Blood Smear for Malaria Parasites (MPS)": {
    id: "Blood Smear for Malaria Parasites (MPS)",
    label: "Malaria (Blood Smear)",
    category: "MICROBIOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Malaria RDT", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
      { test: "Plasmodium Species", unit: "", referenceRange: "None seen", inputType: "text" },
      { test: "Parasite Density", unit: "/µL", referenceRange: "Negative", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Malaria parasites detected — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "No malaria parasites detected." },
    ],
  },

  "Malaria RDT": {
    id: "Malaria RDT",
    label: "Malaria RDT",
    category: "MICROBIOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Malaria RDT", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
      { test: "Plasmodium Species", unit: "", referenceRange: "None seen", inputType: "text" },
      { test: "Parasite Density", unit: "/µL", referenceRange: "Negative", inputType: "number" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Malaria RDT positive — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Malaria RDT negative." },
    ],
  },

  // ── Sputum / TB ───────────────────────────────────────────────────────

  "Sputum AFB / GeneXpert TB": {
    id: "Sputum AFB / GeneXpert TB",
    label: "Sputum AFB / GeneXpert TB",
    category: "MICROBIOLOGY",
    specimenTypes: ["SPUTUM"],
    fields: [
      { test: "AFB Smear Microscopy", unit: "", referenceRange: "Not Detected", inputType: "detectedNotDetected" },
      { test: "AFB Grade", unit: "", referenceRange: "0 / 1+ / 2+ / 3+", inputType: "text" },
      { test: "GeneXpert MTB", unit: "", referenceRange: "Not Detected", inputType: "detectedNotDetected" },
      { test: "Rifampicin Resistance", unit: "", referenceRange: "Not Detected", inputType: "detectedNotDetected" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "TB detected — clinical correlation and treatment advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "No TB detected." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SEROLOGY — Positive / Negative
  // ═══════════════════════════════════════════════════════════════════════

  "Typhoid IgG": {
    id: "Typhoid IgG",
    label: "Typhoid IgG",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Typhoid IgG", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Typhoid IgG positive — may indicate past infection or vaccination.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Typhoid IgG negative." },
    ],
  },

  "Typhoid IgM Ab Test": {
    id: "Typhoid IgM Ab Test",
    label: "Typhoid IgM",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Typhoid IgM", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Typhoid IgM positive — suggests acute typhoid infection.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Typhoid IgM negative." },
    ],
  },

  "H. Pylori Stool Antigen": {
    id: "H. Pylori Stool Antigen",
    label: "H. Pylori Stool Antigen",
    category: "SEROLOGY",
    specimenTypes: ["STOOL"],
    fields: [
      { test: "H. Pylori Stool Antigen", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "H. Pylori antigen detected — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "H. Pylori antigen not detected." },
    ],
  },

  "H. Pylori Antibody Test": {
    id: "H. Pylori Antibody Test",
    label: "H. Pylori Antibody",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "H. Pylori Antibody", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "H. Pylori antibody positive — may indicate past or current infection.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "H. Pylori antibody negative." },
    ],
  },

  "Urine hCG (Pregnancy Test)": {
    id: "Urine hCG (Pregnancy Test)",
    label: "Urine hCG (Pregnancy Test)",
    category: "SEROLOGY",
    specimenTypes: ["URINE"],
    fields: [
      { test: "Urine hCG", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Urine hCG positive — pregnancy detected.", isCritical: false },
      { condition: "ALL_NORMAL", interpretation: "Urine hCG negative." },
    ],
  },

  // ── Serology — Reactive / Non-Reactive ──────────────────────────────

  "HIV Screen (1/2)": {
    id: "HIV Screen (1/2)",
    label: "HIV Screen",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "HIV 1/2 Screen", unit: "", referenceRange: "Non-Reactive", inputType: "reactiveNonReactive" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "HIV reactive — confirmatory testing advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "HIV non-reactive." },
    ],
  },

  "Hepatitis B Surface Antigen (HepBSAg)": {
    id: "Hepatitis B Surface Antigen (HepBSAg)",
    label: "Hepatitis B Surface Antigen (HepBSAg)",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "HepBSAg", unit: "", referenceRange: "Non-Reactive", inputType: "reactiveNonReactive" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Hepatitis B Surface Antigen reactive — active infection possible. Confirmatory testing advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Hepatitis B Surface Antigen non-reactive." },
    ],
  },

  "TPHA (Syphilis)": {
    id: "TPHA (Syphilis)",
    label: "TPHA (Syphilis)",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "TPHA", unit: "", referenceRange: "Non-Reactive", inputType: "reactiveNonReactive" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "TPHA reactive — syphilis serology positive. Clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "TPHA non-reactive." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SEROLOGY — Other
  // ═══════════════════════════════════════════════════════════════════════

  "Brucella Agglutination Test": {
    id: "Brucella Agglutination Test",
    label: "Brucella Agglutination Test",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "Brucella Agglutination", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Brucella agglutination positive — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Brucella agglutination negative." },
    ],
  },

  "Solubility Test for Sickle Cell": {
    id: "Solubility Test for Sickle Cell",
    label: "Solubility Test for Sickle Cell",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Solubility Test", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Sickle cell solubility test positive — confirmatory testing advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Sickle cell solubility test negative." },
    ],
  },

  "Sickling Test (Solubility)": {
    id: "Sickling Test (Solubility)",
    label: "Sickling Test (Solubility)",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Sickling Test", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Sickling test positive — clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Sickling test negative." },
    ],
  },

  "MHS Sickle Cell Confirmatory Test": {
    id: "MHS Sickle Cell Confirmatory Test",
    label: "MHS Sickle Cell Confirmatory Test",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Sickle Cell Confirmatory", unit: "", referenceRange: "Negative", inputType: "positiveNegative" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Sickle cell confirmatory test positive.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Sickle cell confirmatory test negative." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WIDAL — numeric titres
  // ═══════════════════════════════════════════════════════════════════════

  "Widal Test": {
    id: "Widal Test",
    label: "Widal Test (Titres)",
    category: "SEROLOGY",
    specimenTypes: ["BLOOD", "SERUM"],
    fields: [
      { test: "S. Typhi O", unit: "", referenceRange: "1:20 - 1:160", inputType: "text" },
      { test: "S. Typhi H", unit: "", referenceRange: "1:20 - 1:160", inputType: "text" },
      { test: "S. Paratyphi AH", unit: "", referenceRange: "1:20 - 1:80", inputType: "text" },
      { test: "S. Paratyphi BH", unit: "", referenceRange: "1:20 - 1:80", inputType: "text" },
    ],
    interpretationRules: [
      { condition: "ANY_HIGH", interpretation: "Elevated Widal titres — may suggest enteric fever. Clinical correlation advised.", isCritical: true },
      { condition: "ALL_NORMAL", interpretation: "Widal titres within normal limits." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOOD GROUP — two independent selectors
  // ═══════════════════════════════════════════════════════════════════════

  "Blood Group & Crossmatch": {
    id: "Blood Group & Crossmatch",
    label: "Blood Group & Crossmatch",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "ABO Group", unit: "", referenceRange: "A, B, AB, or O", inputType: "abo", options: ["A", "B", "AB", "O"] },
      { test: "Rh Factor", unit: "", referenceRange: "Positive or Negative", inputType: "rh", options: ["Positive", "Negative"] },
    ],
    interpretationRules: [
      { condition: "ALL_NORMAL", interpretation: "Blood group typing completed." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOOD PICTURE — file upload
  // ═══════════════════════════════════════════════════════════════════════

  "Blood Picture (BPS)": {
    id: "Blood Picture (BPS)",
    label: "Blood Picture / Peripheral Blood Smear",
    category: "HAEMATOLOGY",
    specimenTypes: ["BLOOD"],
    fields: [
      { test: "Blood Picture Report", unit: "", referenceRange: "Upload image or PDF scan", inputType: "file" },
    ],
    interpretationRules: [
      { condition: "ALL_NORMAL", interpretation: "Blood picture report attached." },
    ],
  },
};
