"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_ROUTES } from "@/app/lib/roleRoutes";
import {
  BROADCAST_KEY,
  SESSION_KEY,
  clearSession,
  readSession,
  redirectHome,
} from "@/app/lib/session";

// Public pages a signed-in user must never be able to reach (the browser
// back button lands on these after login). Anyone already logged in is
// bounced back to their role dashboard instead.
const PUBLIC_PATHS = ["/", "/login", "/get_started"];

// Every real page that sits behind a login. Derived from ROLE_ROUTES so a page
// added there is covered automatically rather than relying on whoever adds it
// to remember this file. Deliberately does NOT include /get_started, the
// /accounts stub, or unknown paths — a blanket "anything not public" rule would
// hijack 404s and placeholders and send logged-out visitors somewhere they did
// not ask for.
const PROTECTED_PATHS = Array.from(
  new Set([...Object.values(ROLE_ROUTES), "/StaffManagement"])
);

export default function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();

  // ── Global session lifecycle ────────────────────────────────────────────
  // Registered on EVERY route. These must not be gated behind a pathname check:
  // this component's other effects only run on the pages they care about, and
  // cross-tab logout plus back/forward recovery are exactly the things that
  // have to work on the pages holding patient data.
  useEffect(() => {
    // Returning via the browser's back/forward cache. React state is restored
    // as it was, so no guard re-runs and the previous user's data would still be
    // on screen. Re-check the session, and reload a protected page to be certain
    // nothing stale survives.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return; // only a bfcache restore
      const session = readSession();
      if (!session) {
        clearSession();
        redirectHome();
        return;
      }
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.reload();
      }
    };

    // Another tab on this device logged out. `storage` only fires in OTHER tabs,
    // so the tab that initiated the logout never sees this.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY && event.key !== BROADCAST_KEY) return;
      if (readSession()) return;
      // Do NOT re-broadcast — two tabs would bounce events off each other.
      clearSession({ broadcast: false });
      redirectHome();
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ── Bounce signed-in users off the public pages ─────────────────────────
  useEffect(() => {
    if (!PUBLIC_PATHS.includes(pathname)) return;

    const user = readSession();
    if (!user) return;

    // No dashboard route for this role (e.g. bare NURSE / MIDWIFE): leave the
    // page alone, mirroring the login page's `route || "/"` fallback.
    const route = ROLE_ROUTES[user.role];
    if (!route || route === pathname) return;

    router.replace(route);
  }, [pathname, router]);

  // ── Backstop ────────────────────────────────────────────────────────────
  // The per-page guard is the real gate; this catches any page that forgets it.
  useEffect(() => {
    if (!PROTECTED_PATHS.includes(pathname)) return;
    if (readSession()) return;
    redirectHome();
  }, [pathname]);

  return null;
}
