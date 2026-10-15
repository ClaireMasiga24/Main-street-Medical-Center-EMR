// ─── HTML escaping ────────────────────────────────────────────────────────
// Free-text values (technician remarks, notes) are interpolated into raw
// HTML string templates that get written into report windows, iframes and
// PDFs. A value like "Hb < 7 g/dL" would otherwise break the markup, so
// anything user-typed must pass through here before it reaches a template.
//
// Pure function with no imports so it is safe to pull into "use client"
// components as well as server code.
// ──────────────────────────────────────────────────────────────────────────

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}
