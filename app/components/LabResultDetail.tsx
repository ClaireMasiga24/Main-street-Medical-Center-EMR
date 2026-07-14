import { AlertTriangle, Paperclip } from "lucide-react";

interface LabResult {
  test?: string;
  parameter?: string;
  result?: string | number;
  referenceRange?: string;
  unit?: string;
  flag?: string;
}

interface Attachment {
  name?: string;
  size?: number;
  type?: string;
  data?: string;
}

interface LabRequest {
  id: number | string;
  testName?: string;
  testPanel?: string;
  isCritical?: boolean;
  criticalNote?: string;
  results?: string | LabResult[];
  attachments?: string | Attachment[];
  specimenType?: string;
  specimenId?: string;
  collectedByName?: string;
  specimenCollectedAt?: string;
  enteredByName?: string;
  validatedByName?: string;
  validatedAt?: string;
  resultEnteredAt?: string;
  priority?: string;
  analyzerResults?: string;
  analyzerModel?: string;
  analyzerType?: string;
  analyzerImportStatus?: string;
}

export default function LabResultDetail({ lr }: { lr: LabRequest }) {
  let parsedResults: LabResult[] = [];
  if (lr.results) {
    try {
      const p = typeof lr.results === "string" ? JSON.parse(lr.results) : lr.results;
      if (Array.isArray(p)) parsedResults = p;
    } catch {
      // silently ignore parse errors
    }
  }

  const isCritical =
    lr.isCritical || parsedResults.some((r) => r.flag === "HIGH" || r.flag === "LOW");

  let attachments: Attachment[] = [];
  if (lr.attachments) {
    try {
      const a =
        typeof lr.attachments === "string"
          ? JSON.parse(lr.attachments)
          : lr.attachments;
      if (Array.isArray(a)) attachments = a;
    } catch {
      // silently ignore parse errors
    }
  }

  return (
    <div
      key={lr.id}
      className={`bg-white rounded-lg border p-3 ${
        isCritical ? "border-red-300 ring-1 ring-red-200" : "border-teal-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-700 truncate">
            {lr.testName}
          </span>
          {lr.testPanel && (
            <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {lr.testPanel}
            </span>
          )}
        </div>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
            isCritical
              ? "bg-red-100 text-red-700"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {isCritical ? "Critical" : "Completed"}
        </span>
      </div>

      {/* Critical note banner */}
      {lr.criticalNote && (
        <div className="mb-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-red-700 font-medium">{lr.criticalNote}</p>
        </div>
      )}

      {/* Result rows with reference ranges */}
      {parsedResults.length > 0 && (
        <div className="mb-2">
          <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
            <div className="col-span-4">Test</div>
            <div className="col-span-2">Result</div>
            <div className="col-span-2">Ref. Range</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2">Flag</div>
          </div>
          <div className="space-y-0.5">
            {parsedResults.map((r, ri) => (
              <div
                key={ri}
                className={`grid grid-cols-12 gap-1 text-[11px] items-center px-1 py-0.5 rounded ${
                  r.flag === "HIGH" || r.flag === "LOW"
                    ? "bg-red-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <span
                  className="col-span-4 font-medium text-slate-700 truncate"
                  title={r.test || r.parameter || ""}
                >
                  {r.test || r.parameter || ""}
                </span>
                <span
                  className={`col-span-2 font-bold ${
                    r.flag === "HIGH" || r.flag === "LOW"
                      ? "text-red-700"
                      : "text-slate-800"
                  }`}
                >
                  {r.result || "-"}
                </span>
                <span className="col-span-2 text-slate-400">
                  {r.referenceRange || "-"}
                </span>
                <span className="col-span-2 text-slate-400">
                  {r.unit || "-"}
                </span>
                <span className="col-span-2">
                  {r.flag === "HIGH" && (
                    <span className="text-[9px] text-red-600 font-bold bg-red-100 px-1 py-0.5 rounded">
                      HIGH
                    </span>
                  )}
                  {r.flag === "LOW" && (
                    <span className="text-[9px] text-amber-600 font-bold bg-amber-100 px-1 py-0.5 rounded">
                      LOW
                    </span>
                  )}
                  {(!r.flag || (r.flag !== "HIGH" && r.flag !== "LOW")) && (
                      <span className="text-[9px] text-emerald-600">Normal</span>
                    )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-2 bg-slate-50 rounded-lg p-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Attachments ({attachments.length})
          </p>
          <div className="space-y-1">
            {attachments.map((att, ai) => (
              <div key={ai} className="flex items-center gap-2 text-[10px]">
                <Paperclip size={10} className="text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 truncate flex-1">
                  {att.name || `File ${ai + 1}`}
                </span>
                {att.size && (
                  <span className="text-slate-400 flex-shrink-0">
                    {Math.round(att.size / 1024)} KB
                  </span>
                )}
                {att.data && (
                  <button
                    onClick={() => {
                      const dataUrl = `data:${att.type || "application/octet-stream"};base64,${att.data}`;
                      const a = document.createElement("a");
                      a.href = dataUrl;
                      a.download = att.name || `attachment-${ai}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="text-[10px] text-teal-600 hover:text-teal-800 font-medium flex-shrink-0"
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specimen info */}
      {(lr.specimenType ||
        lr.specimenId ||
        lr.collectedByName ||
        lr.specimenCollectedAt) && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
          {lr.specimenType && (
            <span>
              <span className="font-medium text-slate-400">Specimen:</span>{" "}
              {lr.specimenType}
            </span>
          )}
          {lr.specimenId && (
            <span>
              <span className="font-medium text-slate-400">Specimen ID:</span>{" "}
              {lr.specimenId}
            </span>
          )}
          {lr.collectedByName && (
            <span>
              <span className="font-medium text-slate-400">Collected by:</span>{" "}
              {lr.collectedByName}
            </span>
          )}
          {lr.specimenCollectedAt && (
            <span>
              <span className="font-medium text-slate-400">Collected:</span>{" "}
              {new Date(lr.specimenCollectedAt).toLocaleDateString("en-UG", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* Personnel / Audit info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400 border-t border-slate-100 pt-2 mt-1">
        {lr.enteredByName && <span>Entered by: {lr.enteredByName}</span>}
        {lr.validatedByName && <span>Validated by: {lr.validatedByName}</span>}
        {lr.validatedAt && (
          <span>
            Validated:{" "}
            {new Date(lr.validatedAt).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {lr.resultEnteredAt && (
          <span>
            Result entered:{" "}
            {new Date(lr.resultEnteredAt).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {lr.priority && lr.priority !== "ROUTINE" && (
          <span className="text-amber-600 font-medium">
            Priority: {lr.priority}
          </span>
        )}
      </div>

      {/* Analyzer info */}
      {(lr.analyzerResults || lr.analyzerModel) && (
        <div className="mt-1.5 text-[9px] text-slate-400 bg-slate-50 rounded px-2 py-1">
          {lr.analyzerModel && (
            <span className="mr-3">Analyzer: {lr.analyzerModel}</span>
          )}
          {lr.analyzerType && (
            <span className="mr-3">Type: {lr.analyzerType}</span>
          )}
          {lr.analyzerImportStatus && (
            <span>Status: {lr.analyzerImportStatus}</span>
          )}
        </div>
      )}
    </div>
  );
}
