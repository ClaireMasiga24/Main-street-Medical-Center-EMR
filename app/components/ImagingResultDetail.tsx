import { Radio } from "lucide-react";

interface ImagingRequest {
  id: number | string;
  studyType?: string;
  findings?: string;
  impression?: string;
  conclusion?: string;
  reportedBy?: string;
  reportedAt?: string;
  createdAt?: string;
  status?: string;
  clinicalNotes?: string;
}

export default function ImagingResultDetail({ ir }: { ir: ImagingRequest }) {
  return (
    <div className="bg-white rounded-lg border border-teal-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio size={13} className="text-cyan-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate">
            {ir.studyType}
          </span>
        </div>
        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
          Reported
        </span>
      </div>

      <div className="px-3 py-2 space-y-2.5">
        {/* Findings */}
        {ir.findings && (
          <div className="bg-slate-50/50 rounded-lg border border-slate-100 px-3 py-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Findings
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
              {ir.findings}
            </p>
          </div>
        )}

        {/* Impression — clinically most important, visually prominent */}
        {ir.impression && (
          <div className="bg-amber-50/60 rounded-lg border border-amber-200/60 px-3 py-2">
            <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
              Impression
            </p>
            <p className="text-[12px] text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap">
              {ir.impression}
            </p>
          </div>
        )}

        {/* Conclusion */}
        {ir.conclusion && (
          <div className="bg-slate-50/50 rounded-lg border border-slate-100 px-3 py-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Conclusion
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
              {ir.conclusion}
            </p>
          </div>
        )}

        {/* Clinical notes */}
        {ir.clinicalNotes && (
          <div className="px-3 py-1.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Clinical Notes
            </p>
            <p className="text-[11px] text-slate-500 italic">{ir.clinicalNotes}</p>
          </div>
        )}
      </div>

      {/* Compact footer strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 border-t border-slate-100 bg-slate-50/30 text-[9px] text-slate-400 leading-tight">
        {ir.reportedBy && <span>Reported by: {ir.reportedBy}</span>}
        {ir.reportedAt && (
          <span>
            Reported:{" "}
            {new Date(ir.reportedAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        {ir.createdAt && (
          <span>
            Ordered:{" "}
            {new Date(ir.createdAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
