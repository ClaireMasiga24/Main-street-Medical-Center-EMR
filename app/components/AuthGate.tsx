"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_ROUTES } from "@/app/lib/roleRoutes";

// Public pages a signed-in user must never be able to reach (the browser
// back button lands on these after login). Anyone already logged in is
// bounced back to their role dashboard instead.
const PUBLIC_PATHS = ["/", "/login", "/get_started"];

export default function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Role pages run their own session checks — only guard the public pages.
    if (!PUBLIC_PATHS.includes(pathname)) return;

    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);
      const route = ROLE_ROUTES[user.role];
      // No dashboard route for this role (e.g. bare NURSE / MIDWIFE): leave
      // the page alone, mirroring the login page's `route || "/"` fallback.
      if (!route || route === pathname) return;
      router.replace(route);
    } catch {
      // Corrupt session value — treat as logged out and leave the page alone.
    }
  }, [pathname, router]);

  return null;
}
