import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * A textarea that opens at two rows and grows as the clinician types, so a
 * long note never pushes the step footer out of reach. Capped at 60vh — past
 * that the field scrolls internally rather than swallowing the page.
 */
export default function AutoTextarea({
  value,
  className = "",
  maxHeightVh = 60,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  /** Cap on the grown height; past this the field scrolls internally. */
  maxHeightVh?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Re-measure whenever the value changes from outside this field (step
  // hydration, clinician switch, or a reset of the draft).
  useEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      rows={2}
      value={value}
      onChange={(e) => {
        // Grow immediately, then the effect corrects once the DOM has the
        // new value.
        e.currentTarget.style.height = "auto";
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        rest.onChange?.(e);
      }}
      style={{ maxHeight: `${maxHeightVh}vh`, overflowY: "auto" }}
      className={`w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-[#0a2e1a] focus:ring-2 focus:ring-[#0a2e1a]/20 ${className}`}
      {...rest}
    />
  );
}
