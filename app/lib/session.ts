"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers.
//
// The app has no server session. "Logged in" is a JSON blob under one key in
// web storage, and this module is the only place that knows how to read,
// write and destroy it. Before this existed every page hand-rolled
// `localStorage.getItem("user") || sessionStorage.getItem("user")`, and five
// pages forgot half of the pair — which is why logging out did nothing there.
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_KEY = "user";

// Written to localStorage and immediately removed purely to raise a `storage`
// event in a user's OTHER tabs. See clearSession.
export const BROADCAST_KEY = "msmc:session-broadcast";

export type SessionUser = {
  id: number;
  username: string;
  role: string;
  fullName?: string | null;
  email?: string | null;
  department?: string | null;
  phoneNumber?: string | null;
  specialization?: string | null;
  staffId?: number | null;
  // Not sent by /api/login today, but the doctor page's fallback chain reads
  // it, so it belongs in the type.
  staff?: { id?: number } | null;
};

/**
 * Guards a redirect so it happens exactly once per page load. Child effects run
 * before their parent's, so on a protected page with no session the page's own
 * guard and AuthGate's backstop can both fire in the same tick; the loser must
 * be a no-op rather than a second navigation.
 */
let redirecting = false;

/** Hard-navigate to the landing page. Full document load, so the App Router's
 *  client cache is dropped and Back cannot restore the page we just left. */
export function redirectHome(): void {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;
  window.location.replace("/");
}

/**
 * The stored session, or null. localStorage wins over sessionStorage, matching
 * the majority of the existing call sites and what login writes.
 *
 * Returns null for anything unusable — absent, unparseable, or shaped wrong —
 * so a corrupt value is treated as "logged out" rather than crashing a page.
 */
export function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.role) return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

/** Persist a session. Login always uses localStorage so the session survives a
 *  browser restart; sessionStorage is cleared so the two can never disagree. */
export function writeSession(user: SessionUser): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.localStorage.removeItem(BROADCAST_KEY);
  } catch {}
}

/**
 * Destroy the session. Removes the key from BOTH stores and nothing else —
 * MSMC_SERVICE_PRICES and MSMC_CUSTOM_CATALOG_ITEMS are shared device config,
 * not session state, so this must never become a blanket storage clear.
 *
 * `broadcast` raises a `storage` event in the user's other tabs so a logout on
 * a shared machine kills the sessions still open beside it. The write lands in
 * localStorage, never sessionStorage: sessionStorage is per-tab by definition
 * and `storage` events do not cross tabs for it, so a broadcast there would
 * reach nobody. Writing and then removing fires two events, both harmless and
 * both idempotent, which is what covers a session that only ever lived in
 * sessionStorage (removing that key fires no event at all).
 *
 * Callers handling an incoming logout pass `{ broadcast: false }`. Re-broadcasting
 * from the receiving side makes two tabs bounce events off each other forever.
 */
export function clearSession({ broadcast = true }: { broadcast?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    if (broadcast) {
      window.localStorage.setItem(BROADCAST_KEY, String(Date.now()));
      window.localStorage.removeItem(BROADCAST_KEY);
    }
  } catch {}
}

/**
 * Log out. Order matters at every step:
 *
 *  1. Read the user FIRST — after clearSession there is nothing left to put in
 *     the request body and the audit row is lost.
 *  2. Clear storage BEFORE the request. Every heartbeat interval re-reads
 *     storage on each tick, so clearing first turns those ticks into no-ops and
 *     stops an in-flight heartbeat from re-setting lastActiveAt after
 *     /api/logout nulled it — which would put a logged-out user back in the
 *     admin's online list.
 *  3. Do not await the request. A slow or hanging call must never trap someone
 *     mid-logout on a shared machine. `keepalive` carries it across the
 *     navigation so the audit row still lands.
 *  4. Hard-navigate. This is the actual logout as far as the user is concerned.
 */
export function endSession(): void {
  if (typeof window === "undefined") return;

  const user = readSession();
  clearSession();

  try {
    void fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, username: user?.username }),
      keepalive: true,
    }).catch(() => {});
  } catch {}

  redirectHome();
}

/**
 * Per-page session gate.
 *
 * Returns `ready: false` until the session has been confirmed, so a page can
 * render a placeholder instead of patient data. Call it at the top of a thin
 * wrapper component and render the real page only once `ready` — that way the
 * real component never mounts, so none of its effects run and no patient data
 * is ever fetched over the wire for an unauthenticated visitor.
 *
 * `ready` starts false so the server render and the first client render agree
 * (no hydration mismatch, and no `window` access during SSR). The check runs in
 * an effect, where storage is guaranteed to exist.
 *
 * Pass `allowedRoles` to also enforce the role; omit it to require only that
 * some valid session exists. A wrong or missing role clears the session and
 * sends the visitor to the landing page.
 */
export function useSessionGuard(allowedRoles?: string[]): {
  user: SessionUser | null;
  ready: boolean;
} {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Callers pass an inline array literal, which is a new reference every
  // render. Keying the effect on its sorted contents keeps it from re-running
  // on every parent render.
  const roleKey = allowedRoles ? [...allowedRoles].sort().join(",") : "";

  useEffect(() => {
    try {
      const session = readSession();
      const allowed = roleKey ? roleKey.split(",") : null;

      const permitted = allowed
        ? !!session && allowed.includes(session.role)
        : !!session;

      if (!permitted) {
        clearSession();
        redirectHome();
        return;
      }

      setUser(session);
      setReady(true);
    } catch {
      // Storage can throw outright (Safari private mode, some locked-down
      // enterprise configs). Treat that as "no session" rather than leaving the
      // caller stuck on a loading placeholder forever.
      clearSession();
      redirectHome();
    }
  }, [roleKey]);

  return { user, ready };
}
