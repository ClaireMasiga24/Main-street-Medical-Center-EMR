export default function SectionCard({
  title,
  hint,
  icon: Icon,
  className = "",
  bodyClassName = "",
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ElementType;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a2e1a]">
          {Icon ? <Icon size={13} className="flex-shrink-0" /> : null}
          {title}
        </h3>
        {hint ? (
          <span className="text-[11px] text-slate-400">{hint}</span>
        ) : null}
      </header>

      <div className={`px-4 py-3.5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
