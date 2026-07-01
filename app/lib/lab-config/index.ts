// ─── Laboratory Configuration Module ────────────────────────────────────────
// Central registry for all laboratory test definitions.
// To add a new test, register its configuration in tests.ts — no other
// application code changes are needed.
// ──────────────────────────────────────────────────────────────────────────

export * from "./types";
export * from "./categories";
export * from "./registry";
export { TEST_DEFINITIONS } from "./tests";
