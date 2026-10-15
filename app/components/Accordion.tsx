"use client";

import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string;
  /** Short right-hand hint, e.g. "recorded" — never the field value. */
  meta?: string;
  children: React.ReactNode;
}

/**
 * One section open at a time, so a page with many body systems reads as a list
 * you step through rather than a wall of fields. Exactly one is always open:
 * clicking the open row closes it and opens nothing, and the parent is expected
 * to fall back to the first item.
 */
export default function Accordion({
  items,
  openId,
  onToggle,
}: {
  items: AccordionItem[];
  openId: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {items.map((item, i) => {
        const open = item.id === openId;

        return (
          <div key={item.id} className={i > 0 ? "border-t border-slate-100" : ""}>
            <h3>
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-expanded={open}
                aria-controls={`panel-${item.id}`}
                className="flex w-full items-center gap-3 bg-slate-50/60 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a2e1a]/50"
              >
                <ChevronDown
                  size={15}
                  className={`flex-shrink-0 text-[#0a2e1a] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
                <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a2e1a]">
                  {item.title}
                </span>
                {item.meta ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.meta}
                  </span>
                ) : null}
              </button>
            </h3>

            {open ? (
              <div id={`panel-${item.id}`} className="px-4 py-3.5">
                {item.children}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
