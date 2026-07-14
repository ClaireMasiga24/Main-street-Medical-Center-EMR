import { Radio } from "lucide-react";

interface ImagingRequest {
  id: number | string;
  studyType?: string;
  findings?: string;
  impression?: string;
  conclusion?: string;
  reportedAt?: string;
  status?: string;
}

export default function ImagingResultDetail({ ir }: { ir: ImagingRequest }) {
  return (
    <div key={ir.id} className="bg-white rounded-lg border border-teal-100 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio size={13} className="text-cyan-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700">
            {ir.studyType}
          </span>
        </div>
        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
          Reported
        </span>
      </div>

      {ir.findings && (
        <div className="mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
            Findings:
          </span>
          <span className="text-[11px] text-slate-600">{ir.findings}</span>
        </div>
      )}

      {ir.impression && (
        <div className="mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
            Impression:
          </span>
          <span className="text-[11px] text-slate-700 font-medium">
            {ir.impression}
          </span>
        </div>
      )}

      {ir.conclusion && (
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
            Conclusion:
          </span>
          <span className="text-[11px] text-slate-600">{ir.conclusion}</span>
        </div>
      )}

      {ir.reportedAt && (
        <p className="text-[9px] text-slate-400 mt-1">
          Reported:{" "}
          {new Date(ir.reportedAt).toLocaleDateString("en-UG", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
