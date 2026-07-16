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

function FlagBadge({ flag }: { flag?: string }) {
  if (flag === "HIGH") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 leading-none">
        HIGH
      </span>
    );
  }
  if (flag === "LOW") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 leading-none">
        LOW
      </span>
    );
  }
  return <span className="text-[9px] text-emerald-600 font-medium">Normal</span>;
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

  // Group results by test/parameter name within this lab request
  const grouped: { panel?: string; results: LabResult[] }[] = [];
  const hasTestPanels = parsedResults.some((r) => r.test && r.test !== r.parameter);
  if (hasTestPanels) {
    // Each unique test name becomes a group
    const testNames = [...new Set(parsedResults.map((r) => r.test || r.parameter || ""))];
    for (const name of testNames) {
      const groupResults = parsedResults.filter((r) => (r.test || r.parameter) === name);
      grouped.push({ panel: name, results: groupResults });
    }
  } else {
    grouped.push({ results: parsedResults });
  }

  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden ${
        isCritical ? "border-red-300 ring-1 ring-red-200" : "border-teal-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-700 truncate">
            {lr.testName}
          </span>
          {lr.testPanel && (
            <span className="text-[9px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full">
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
        <div className="mx-3 mt-2 mb-1 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-red-700 font-medium">{lr.criticalNote}</p>
        </div>
      )}

      {/* Results table — always render, show fallback when no results available */}
      <div className="px-0">
        {grouped.length > 1 ? (
          // Grouped by test name
          grouped.map((g, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="border-t border-slate-100" />}
              {g.panel && (
                <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {g.panel}
                  </span>
                </div>
              )}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0a2e1a] text-white">
                    <th className="px-3 py-1.5 text-[10px] font-bold text-left tracking-wider w-[30%]">
                      Parameter
                    </th>
                    <th className="px-2 py-1.5 text-[10px] font-bold text-right tracking-wider w-[18%]">
                      Result
                    </th>
                    <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[15%]">
                      Unit
                    </th>
                    <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[22%]">
                      Ref. Range
                    </th>
                    <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[15%]">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-[10px] text-slate-400 italic">
                        No detailed results available
                      </td>
                    </tr>
                  ) : (
                    g.results.map((r, ri) => (
                      <tr
                        key={ri}
                        className={`${
                          r.flag === "HIGH"
                            ? "bg-red-50/70"
                            : r.flag === "LOW"
                            ? "bg-amber-50/70"
                            : ri % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/50"
                        }`}
                      >
                        <td className="px-3 py-1 border-b border-slate-100 text-slate-700 font-medium truncate max-w-[200px]" title={r.test || r.parameter || ""}>
                          {r.test || r.parameter || ""}
                        </td>
                        <td className={`px-2 py-1 border-b border-slate-100 text-right font-bold ${
                          r.flag === "HIGH"
                            ? "text-red-700"
                            : r.flag === "LOW"
                            ? "text-amber-700"
                            : "text-slate-800"
                        }`}>
                          {r.result || "-"}
                        </td>
                        <td className="px-2 py-1 border-b border-slate-100 text-center text-slate-500">
                          {r.unit || "-"}
                        </td>
                        <td className="px-2 py-1 border-b border-slate-100 text-center text-slate-500">
                          {r.referenceRange || "-"}
                        </td>
                        <td className="px-2 py-1 border-b border-slate-100 text-center">
                          <FlagBadge flag={r.flag} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          // Single group — no panel subheader
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0a2e1a] text-white">
                  <th className="px-3 py-1.5 text-[10px] font-bold text-left tracking-wider w-[30%]">
                    Parameter
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-bold text-right tracking-wider w-[18%]">
                    Result
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[15%]">
                    Unit
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[22%]">
                    Ref. Range
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-bold text-center tracking-wider w-[15%]">
                    Flag
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-[10px] text-slate-400 italic">
                      No detailed results available
                    </td>
                  </tr>
                ) : (
                  parsedResults.map((r, ri) => (
                    <tr
                      key={ri}
                      className={`${
                        r.flag === "HIGH"
                          ? "bg-red-50/70"
                          : r.flag === "LOW"
                          ? "bg-amber-50/70"
                          : ri % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-3 py-1 border-b border-slate-100 text-slate-700 font-medium truncate max-w-[200px]" title={r.test || r.parameter || ""}>
                        {r.test || r.parameter || ""}
                      </td>
                      <td className={`px-2 py-1 border-b border-slate-100 text-right font-bold ${
                        r.flag === "HIGH"
                          ? "text-red-700"
                          : r.flag === "LOW"
                          ? "text-amber-700"
                          : "text-slate-800"
                      }`}>
                        {r.result || "-"}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-100 text-center text-slate-500">
                        {r.unit || "-"}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-100 text-center text-slate-500">
                        {r.referenceRange || "-"}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-100 text-center">
                        <FlagBadge flag={r.flag} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mx-3 mb-1 mt-2 bg-slate-50 rounded-lg p-2">
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

      {/* Compact footer strip for audit metadata */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 border-t border-slate-100 bg-slate-50/30 text-[9px] text-slate-400 leading-tight">
        {/* Specimen info inline */}
        {lr.specimenType && <span>Spec: {lr.specimenType}{lr.specimenId ? ` (ID: ${lr.specimenId})` : ""}</span>}
        {lr.collectedByName && <span>Collected by: {lr.collectedByName}</span>}
        {lr.specimenCollectedAt && (
          <span>
            Collected:{" "}
            {new Date(lr.specimenCollectedAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        {lr.enteredByName && <span>Entered by: {lr.enteredByName}</span>}
        {lr.validatedByName && <span>Validated by: {lr.validatedByName}</span>}
        {lr.validatedAt && (
          <span>
            Validated:{" "}
            {new Date(lr.validatedAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        {lr.resultEnteredAt && (
          <span>
            Result entered:{" "}
            {new Date(lr.resultEnteredAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
        {lr.priority && lr.priority !== "ROUTINE" && (
          <span className="text-amber-600 font-medium">Priority: {lr.priority}</span>
        )}
        {lr.analyzerModel && <span>Analyzer: {lr.analyzerModel}</span>}
        {lr.analyzerType && <span>Type: {lr.analyzerType}</span>}
        {lr.analyzerImportStatus && <span>Status: {lr.analyzerImportStatus}</span>}
      </div>
    </div>
  );
}
