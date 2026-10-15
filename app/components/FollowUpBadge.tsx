"use client";

import React from "react";
import { Repeat } from "lucide-react";

// Read-only badge for the cashier's queue row: tells them this patient is
// currently in a doctor-started follow-up, and which visit it follows from.
//
// It informs a human decision. It is NOT a charge, a discount, a waiver or a
// price — whether a follow-up is chargeable is the cashier's call, exactly as
// it is today. Nothing here touches billing.
//
// A non-interactive <span>, so it nests safely inside the queue row's existing
// <button> without restructuring it, and renders nothing when the patient is
// not in a follow-up.

export interface FollowUpFlag {
  previousVisitId: number;
  type: string;
}

const SHORT_TYPE: Record<string, string> = {
  "Follow-up review": "Follow-up review",
  "Results review": "Results review",
  Follow_up: "Follow-up",
};

export default function FollowUpBadge({
  flag,
  className = "",
}: {
  flag?: FollowUpFlag | null;
  className?: string;
}) {
  if (!flag) return null;

  return (
    <span
      title={`This consultation is a follow-up of Visit #${flag.previousVisitId}. Whether it is chargeable is your decision.`}
      className={`inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700 ${className}`}
    >
      <Repeat size={9} />
      Follow-up of Visit #{flag.previousVisitId}
      {flag.type ? ` · ${SHORT_TYPE[flag.type] ?? flag.type}` : ""}
    </span>
  );
}
