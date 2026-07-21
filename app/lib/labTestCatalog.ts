// ─── Lab Test Catalog ─────────────────────────────────────────────────────────
// Single source of truth for all lab tests available at reception / cashier.
// Covers self-test / walk-in patients who come to reception asking for a
// specific test without seeing a doctor first.
//
// Fields:
//   code          — machine-readable catalog code (e.g. "LAB009")
//   name          — human-readable test name shown in the picker
//   specimenType  — "BLOOD" | "URINE" | "STOOL" | "SPUTUM" | "SWAB" | "SERUM"
//   section       — lab section grouping for the modal's accordion
//   template      — result-entry template the lab tech will use:
//                   "CBC" | "URINALYSIS" | "GENERAL"
//   defaultPrice  — default selling price (0 = needs manual pricing)
//   needsPricing  — true if defaultPrice is 0 and must be set before billing
// ──────────────────────────────────────────────────────────────────────────────

export interface LabTestCatalogItem {
  code: string;
  name: string;
  specimenType: string;
  section: string;
  template: "CBC" | "URINALYSIS" | "GENERAL";
  defaultPrice: number;
  needsPricing?: boolean;
}

// ─── Flat test name lists for doctor ordering (checkbox grids) ───────────────
// These match the old inline LAB_TESTS array in app/Doctors/page.tsx

export const DOCTOR_LAB_TESTS: string[] = [
  "Full Blood Count (FBC / CBC)",
  "Blood Smear for Malaria Parasites (MPS)",
  "Malaria RDT",
  "Urinalysis",
  "Urine Microscopy",
  "Blood Glucose (Random RBS)",
  "Blood Glucose (Fasting FBS)",
  "HbA1c",
  "HIV Screen (1/2)",
  "Hepatitis B Surface Antigen (HepBSAg)",
  "Typhoid IgG",
  "Typhoid IgM Ab Test",
  "Widal Test",
  "TPHA (Syphilis)",
  "H. Pylori Stool Antigen",
  "H. Pylori Antibody Test",
  "Liver Function Test (LFT)",
  "Renal Function Test (RFT)",
  "Serum Electrolytes",
  "Lipid Profile",
  "Thyroid Function Test (TSH/T3/T4)",
  "Coagulation Profile (PT/INR/APTT)",
  "ESR",
  "CD4 Count",
  "Blood Group & Crossmatch",
  "Brucella Agglutination Test",
  "Solubility Test for Sickle Cell",
  "MHS Sickle Cell Confirmatory Test",
  "Urine hCG (Pregnancy Test)",
  "Stool Analysis",
  "Blood Culture & Sensitivity",
  "Sputum AFB / GeneXpert TB",
  "PSA (Prostate Specific Antigen)",
  "Pap Smear",
  "Uric Acid",
  "Complete Blood Count with WBC Differential (3-part)",
  "MPV (Mean Platelet Volume)",
  "Post Blood Sugar (Post BS)",
  "Sickling Test (Solubility)",
];

export const DOCTOR_RADIOLOGY_TESTS: string[] = [
  "Chest X-ray",
  "Abdominal X-ray",
  "Pelvic X-ray",
  "Skull X-ray",
  "Spine X-ray (Cervical / Thoracic / Lumbar)",
  "Limb X-ray (Upper / Lower)",
  "CT Scan (Head / Chest / Abdomen / Pelvis)",
  "MRI (Brain / Spine / Joint)",
  "Mammography",
  "Fluoroscopy / Barium Studies",
  "IVP (Intravenous Pyelogram)",
];

export const DOCTOR_SONOGRAPHY_TESTS: string[] = [
  "Abdominal USS",
  "Pelvic USS",
  "Obstetric USS",
  "Musculoskeletal USS",
  "Fetal Doppler",
  "Small Parts USS",
];

// ─── Full structured catalog (for reception / cashier billing) ──────────────

export const LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  // ── HAEMATOLOGY ───────────────────────────────────────────────────────────
  { code: "LAB009", name: "Complete Blood Count / CBC",          specimenType: "BLOOD", section: "Haematology", template: "CBC",        defaultPrice: 20000 },
  { code: "T001",   name: "Full Haemogram / CBC",               specimenType: "BLOOD", section: "Haematology", template: "CBC",        defaultPrice: 15000 },
  { code: "LAB003", name: "Blood Group",                         specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 10000 },
  { code: "T002",   name: "ESR",                                 specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 15000 },
  { code: "LAB023", name: "Sickling Test MHS",                   specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 20000 },
  { code: "LAB032", name: "WBC Differential",                    specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 20000 },
  { code: "LAB042", name: "CD4 Count",                           specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 50000 },
  { code: "LAB046", name: "PT / INR",                            specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 80000 },
  { code: "LAB005", name: "Hb Electrophoresis",                  specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 70000 },
  { code: "LAB008", name: "Genotype",                            specimenType: "BLOOD", section: "Haematology", template: "GENERAL",    defaultPrice: 20000 },

  // ── MICROBIOLOGY ─────────────────────────────────────────────────────────
  { code: "T019",   name: "Malaria BS × MPS",                    specimenType: "BLOOD", section: "Microbiology", template: "GENERAL",   defaultPrice: 5000 },
  { code: "LAB001", name: "Malaria MRDT",                        specimenType: "BLOOD", section: "Microbiology", template: "GENERAL",   defaultPrice: 5000 },
  { code: "LAB002", name: "Typhoid",                             specimenType: "BLOOD", section: "Microbiology", template: "GENERAL",   defaultPrice: 5000 },
  { code: "LAB004", name: "Brucella Agglutination Test",         specimenType: "BLOOD", section: "Microbiology", template: "GENERAL",   defaultPrice: 15000 },
  { code: "LAB027", name: "Stool Analysis",                      specimenType: "STOOL", section: "Microbiology", template: "GENERAL",   defaultPrice: 10000 },
  { code: "LAB025", name: "Sputum GeneXpert",                    specimenType: "SPUTUM", section: "Microbiology", template: "GENERAL",  defaultPrice: 30000 },
  { code: "LAB026", name: "Sputum Gram Stain",                   specimenType: "SPUTUM", section: "Microbiology", template: "GENERAL",  defaultPrice: 20000 },
  { code: "LAB037", name: "Sputum ZN",                           specimenType: "SPUTUM", section: "Microbiology", template: "GENERAL",  defaultPrice: 20000 },
  { code: "LAB040", name: "Urine Culture & Sensitivity",         specimenType: "URINE", section: "Microbiology",  template: "GENERAL",  defaultPrice: 80000 },
  { code: "LAB034", name: "HVS for Culture & Sensitivity",      specimenType: "SWAB",  section: "Microbiology",  template: "GENERAL",  defaultPrice: 80000 },
  { code: "LAB014", name: "High Vaginal Swab (HVS)",            specimenType: "SWAB",  section: "Microbiology",  template: "GENERAL",  defaultPrice: 20000 },
  { code: "LAB041", name: "Gram Stain",                          specimenType: "SWAB",  section: "Microbiology",  template: "GENERAL",  defaultPrice: 0, needsPricing: true },
  { code: "LAB047", name: "Culture & Sensitivity",               specimenType: "SWAB",  section: "Microbiology",  template: "GENERAL",  defaultPrice: 120000 },
  { code: "LAB045", name: "CSF C/S",                             specimenType: "SWAB",  section: "Microbiology",  template: "GENERAL",  defaultPrice: 0, needsPricing: true },

  // ── SEROLOGY ──────────────────────────────────────────────────────────────
  { code: "LAB012", name: "Hepatitis B SAg",                     specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 15000 },
  { code: "LAB013", name: "Hepatitis C",                         specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 20000 },
  { code: "LAB007", name: "H. Pylori Antigen",                   specimenType: "STOOL", section: "Serology",    template: "GENERAL",    defaultPrice: 20000 },
  { code: "LAB006", name: "H. Pylori Antibody",                  specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 15000 },
  { code: "LAB031", name: "HIV 1/2",                             specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 5000 },
  { code: "LAB028", name: "Syphilis TPHA",                       specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 10000 },
  { code: "LAB020", name: "Rheumatoid Factor",                   specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 25000 },
  { code: "LAB044", name: "C-Reactive Protein (CRP)",            specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 60000 },
  { code: "LAB010", name: "Serum HCG (Pregnancy Test)",          specimenType: "BLOOD", section: "Serology",    template: "GENERAL",    defaultPrice: 25000 },

  // ── URINALYSIS ────────────────────────────────────────────────────────────
  { code: "LAB030", name: "Urinalysis",                          specimenType: "URINE", section: "Urinalysis",  template: "URINALYSIS", defaultPrice: 10000 },
  { code: "LAB011", name: "Pregnancy Urine Test",               specimenType: "URINE", section: "Urinalysis",  template: "GENERAL",    defaultPrice: 5000 },

  // ── BIOCHEMISTRY ──────────────────────────────────────────────────────────
  { code: "LAB050", name: "Fasting Blood Sugar / FBS",           specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 5000 },
  { code: "LAB051", name: "Random Blood Sugar / RBS",            specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 5000 },
  { code: "LAB035", name: "Post BS",                             specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 10000 },
  { code: "LAB016", name: "Liver Function Test (LFTs)",          specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 50000 },
  { code: "LAB017", name: "Renal Function Test (RFTs)",          specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 50000 },
  { code: "LAB015", name: "Lipid Profile",                       specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 60000 },
  { code: "T058",   name: "HbA1c",                               specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 100000 },
  { code: "LAB048", name: "Electrolytes",                        specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 40000 },
  { code: "LAB033", name: "Prostate Specific Antigen (PSA)",     specimenType: "BLOOD", section: "Biochemistry", template: "GENERAL",   defaultPrice: 50000 },
];
