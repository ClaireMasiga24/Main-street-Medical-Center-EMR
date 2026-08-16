// validate-lab-flags.js
//
// Manual validation harness for computeFlag (patient-safety check).
// Compiles the REAL lab-config source (registry.ts, referenceRanges.ts, etc.)
// with the project's local TypeScript into a temp dir, loads the compiled
// functions, runs the required high/low/normal matrix across age bands plus
// the parse-failure regression, prints the table, and cleans up after itself.
//
// Run from anywhere:   node scripts/validate-lab-flags.js
// Exit code 0 = all assertions passed, 1 = at least one failure.
//
// Why this exists: computeFlag must NEVER return "NORMAL" for a value/range
// it could not parse (false "normal" is worse than no flag). If you touch
// reference ranges in tests.ts / referenceRanges.ts, re-run this script.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const LAB_CONFIG_SOURCES = [
  "app/lib/lab-config/registry.ts",
  "app/lib/lab-config/tests.ts",
  "app/lib/lab-config/types.ts",
  "app/lib/lab-config/referenceRanges.ts",
];

function compileModules(outDir) {
  // Run the project's own TypeScript binary directly with the current node
  // executable — avoids npx/.cmd spawning, which fails with EINVAL on Windows.
  execFileSync(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--ignoreConfig", // TS 6: files on CLI + tsconfig present requires this
    "--ignoreDeprecations", "6.0", // moduleResolution node is deprecated in TS 7
    ...LAB_CONFIG_SOURCES,
    "--outDir", outDir,
    "--module", "commonjs",
    "--target", "es2020",
    "--esModuleInterop",
    "--skipLibCheck",
    "--moduleResolution", "node",
    "--noEmit", "false",
  ], { cwd: ROOT, stdio: "inherit" });
}

function runChecks(outDir) {
  // Load the REAL compiled functions — no reimplementation.
  const { computeFlag } = require(path.join(outDir, "registry.js"));
  const { getReferenceRangeForPatient } = require(path.join(outDir, "referenceRanges.js"));

  // Display names as stored in the CBC test definition (tests.ts)
  const FIELDS = {
    HB: "Hemoglobin (HGB)",
    WBC: "White Blood Cell count (WBC)",
    PLT: "Platelet count",
  };

  // Age bands: newborn (1 month) and adult (35 years). Platelets are flat.
  const CASES = [
    // field, label, age, unit, gender, [low, normal, high]
    ["HB", "HB newborn (1mo, M)", 1, "months", "MALE", [10, 18, 24]],
    ["HB", "HB adult (35y, M)", 35, "years", "MALE", [11, 15, 19]],
    ["WBC", "WBC newborn (1mo, M)", 1, "months", "MALE", [5, 20, 35]],
    ["WBC", "WBC adult (35y, M)", 35, "years", "MALE", [2, 7, 14]],
    ["PLT", "PLT newborn (1mo, M)", 1, "months", "MALE", [100, 300, 500]],
    ["PLT", "PLT adult (35y, M)", 35, "years", "MALE", [100, 300, 500]],
  ];

  let failures = 0;
  console.log("=== Required test: 3 fields x 2 age bands x (high/low/normal) ===");
  console.log("");
  for (const [code, label, age, unit, gender, vals] of CASES) {
    const range = getReferenceRangeForPatient(FIELDS[code], age, unit, gender);
    const out = vals.map((v) => `${v} -> ${computeFlag(String(v), range)}`);
    console.log(`${label}  range="${range}"`);
    console.log(`    LOW ${out[0]}   |   NORMAL ${out[1]}   |   HIGH ${out[2]}`);
    if (!out[0].endsWith("-> LOW")) { console.log("    *** FAIL: low value should be LOW"); failures++; }
    if (!out[1].endsWith("-> NORMAL")) { console.log("    *** FAIL: normal value should be NORMAL"); failures++; }
    if (!out[2].endsWith("-> HIGH")) { console.log("    *** FAIL: high value should be HIGH"); failures++; }
  }
  console.log("");

  console.log("=== Regression: parse-failure paths must NEVER return NORMAL ===");
  const regress = [
    ["10", "M: 13.5–17.5; F: 12.0–15.5", "sex-split static range (unparseable)"],
    ["15", "", "empty range"],
    ["abc", "4.0-11.0", "non-numeric value"],
    ["8", "  ", "whitespace-only range"],
    ["5", "garbage", "garbage range"],
    ["Positive", "Negative", "text mismatch (value Positive vs range Negative)"],
    ["Negative", "Negative", "text match"],
    ["Clear", "Clear", "exact-match text (urine colour)"],
    ["300", "150" + String.fromCharCode(45) + "450", "hyphen-minus U+002D range parses"],
    ["300", "150–450", "en-dash U+2013 range parses"],
    ["300", "150 - 450", "space-padded hyphen range parses"],
  ];
  for (const [value, range, note] of regress) {
    const flag = computeFlag(value, range);
    console.log(`computeFlag(${JSON.stringify(value)}, ${JSON.stringify(range)}) -> ${flag}  [${note}]`);
    // Parse failures and text mismatches must never come back NORMAL
    if (["M: 13.5–17.5; F: 12.0–15.5", "", "  ", "garbage"].includes(range) && flag === "NORMAL") { console.log("    *** FAIL: parse failure returned NORMAL"); failures++; }
    if (value === "abc" && flag === "NORMAL") { console.log("    *** FAIL: non-numeric value returned NORMAL"); failures++; }
    if (value === "Positive" && range === "Negative" && flag === "NORMAL") { console.log("    *** FAIL: positive vs negative range returned NORMAL"); failures++; }
  }
  console.log("");

  console.log(failures === 0 ? "ALL ASSERTIONS PASSED" : `${failures} ASSERTION(S) FAILED`);
  return failures === 0 ? 0 : 1;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "labflag-"));
try {
  compileModules(tmp);
  process.exitCode = runChecks(tmp);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
