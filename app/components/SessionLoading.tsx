"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Shown while a page's session is being confirmed.
 *
 * It exists so that an unauthenticated visitor sees no patient data — not even
 * a flash of it — and never an unstyled blank. Deliberately plain.
 *
 * The link is not decoration. If storage is unavailable and the guard cannot
 * resolve, the visitor needs a way out that does not depend on JavaScript
 * successfully redirecting them.
 */
export default function SessionLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#eaf5ee] to-white px-4">
      <div className="text-center">
        <Image
          src="/Images/LOGO.jpg"
          alt="Main Street Medical Center"
          width={72}
          height={72}
          className="rounded-full bg-white p-2 mx-auto shadow-md"
          priority
        />

        <div className="flex items-center justify-center gap-2 mt-6 text-green-800">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-semibold">Verifying session…</span>
        </div>

        <Link
          href="/login"
          className="inline-block mt-5 text-xs font-bold text-gray-500 hover:text-green-800 underline underline-offset-4"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
