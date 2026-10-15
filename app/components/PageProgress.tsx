"use client";

/**
 * The quiet page marker above the sheet: "Page 2 of 6" and an unlabelled bar.
 * Deliberately not interactive — in a paper file you cannot jump ahead, so this
 * reports position only. It is not a progress *control*.
 */
export default function PageProgress({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Page ${current} of ${total}`}
      className="flex items-center gap-3"
    >
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Page {current} of {total}
      </span>

      <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full bg-[#0a2e1a] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
