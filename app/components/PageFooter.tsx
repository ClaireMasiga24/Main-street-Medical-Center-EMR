"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

/**
 * Bottom-of-sheet controls. Stays pinned so the turn is always one click away.
 * `nextDisabled` is separate from `busy` so a required field being empty reads
 * as "not yet" rather than "something is saving".
 *
 * There is deliberately no "Save draft" button: the draft autosaves 1.5s after
 * the last keystroke and every turn of the page saves before it advances, so a
 * manual save would only be a second way to do what already happens. The
 * SaveStatus chip in the encounter header is where a save is reported.
 * `savePending` still holds both controls while that write is in flight, so a
 * press can never race the save it is meant to happen after.
 */
export default function PageFooter({
  canGoBack,
  onPrevious,
  onNext,
  onNextBlocked,
  nextLabel,
  nextDisabled,
  hideNext,
  savePending,
  busy,
}: {
  canGoBack: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /**
   * Fired when Next is pressed while `nextDisabled`. The button stays clickable
   * so this can run — a truly `disabled` button swallows the click and the
   * doctor never learns why the page will not turn.
   */
  onNextBlocked?: () => void;
  nextLabel: string;
  nextDisabled: boolean;
  /** The Outcome page chooses its own action from cards, so it has no Next. */
  hideNext?: boolean;
  /** A draft write is in flight — hold both controls until it lands. */
  savePending: boolean;
  busy: boolean;
}) {
  const locked = busy || savePending;

  return (
    <div className="sticky bottom-0 z-20 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.18)] backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {canGoBack ? (
          <button
            type="button"
            onClick={onPrevious}
            disabled={busy}
            className="order-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2e1a]/50"
          >
            <ArrowLeft size={15} />
            Previous page
          </button>
        ) : null}

        <div className="order-2 hidden flex-1 sm:block" />

        <button
          type="button"
          // A blocked Next must not navigate, so the click is intercepted here
          // and only the "why" is reported. aria-disabled (not disabled) keeps
          // the control focusable and announced correctly by screen readers,
          // and looks identical to the old greyed-out button.
          onClick={() => {
            if (locked) return;
            if (nextDisabled) onNextBlocked?.();
            else onNext();
          }}
          aria-disabled={locked || nextDisabled}
          hidden={hideNext}
          title="Keyboard shortcut: Ctrl+Enter"
          className="order-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a2e1a] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d3d24] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2e1a] focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:bg-slate-300 aria-disabled:text-slate-500 aria-disabled:hover:bg-slate-300 sm:w-auto sm:flex-none"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          <span>{busy ? "Working…" : nextLabel}</span>
        </button>
      </div>
    </div>
  );
}
