"use client";

import React from "react";
import {
  Microscope, CheckCircle, Save, AlertCircle,
  Upload, RefreshCw, FileText, Eye, Paperclip,
} from "lucide-react";
import type {
  TestDefinition,
  ResultEntry,
} from "../../lib/lab-config/types";
import { getFlagColor } from "../../lib/lab-config/registry";
import { LISFieldRenderer } from "./LISFieldRenderer";
import type { LabAttachment } from "./types";

// ─── Props ────────────────────────────────────────────────────────────────

export interface ResultEntryFormProps {
  /** The resolved test definition for the current request */
  def: TestDefinition;
  /** Current result entries */
  results: ResultEntry[];
  /** Whether the definition has tabbed sections */
  hasSections: boolean;
  /** Currently active section index */
  activeSection: number;
  /** Cumulative field bounds per section */
  sectionBounds: number[];
  /** Start index of visible fields in the flat results array */
  sectionStart: number;
  /** Subset of results visible in the current section */
  visibleResults: ResultEntry[];
  /** Whether results have been saved */
  resultsSaved: boolean;
  /** Attached files */
  attachments: LabAttachment[];
  /** Whether a file upload is in progress */
  isUploading: boolean;
  /** Ref to the hidden file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Called when a field's result value changes */
  onResultChange: (index: number, value: string) => void;
  /** Called when the active section tab changes */
  onSectionChange: (index: number) => void;
  /** Called when a file is selected for upload */
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called when the upload button is clicked */
  onFileUploadClick: () => void;
  /** Called to download/view an attachment */
  onDownloadAttachment: (att: LabAttachment) => void;
  /** Called to persist results */
  onSaveResults: () => void;
  /** Whether a save operation is in progress */
  savingResults: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function ResultEntryForm({
  def,
  results,
  hasSections,
  activeSection,
  sectionBounds,
  sectionStart,
  visibleResults,
  resultsSaved,
  attachments,
  isUploading,
  fileInputRef,
  onResultChange,
  onSectionChange,
  onFileSelect,
  onFileUploadClick,
  onDownloadAttachment,
  onSaveResults,
  savingResults,
}: ResultEntryFormProps) {
  const isFileTest = def.fields.every((f) => f.inputType === "file");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#e8f5e9" }}
        >
          <Microscope className="w-5 h-5" style={{ color: "#00703C" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Step 2: Enter Results</h2>
          <p className="text-xs text-gray-500">
            Test: {def.label}
          </p>
        </div>
        {resultsSaved && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Results Saved
          </span>
        )}
      </div>

      <div className="p-6">
        {/* File-based test (Blood Picture / BPS) */}
        {isFileTest ? (
          <div className="mb-6">
            <div className="p-6 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl text-center">
              <Upload className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-amber-800 mb-1">
                {def.label}
              </h3>
              <p className="text-sm text-amber-600 mb-4">
                Upload the scanned report image or PDF below.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelect}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.pdf"
              />
              <button
                onClick={onFileUploadClick}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#00703C" }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload Report
                  </>
                )}
              </button>
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-amber-200 bg-white"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {att.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onDownloadAttachment(att)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium flex-shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Standard test — render results table */
          <>
            {/* Section tabs */}
            {hasSections && (
              <div
                className="flex gap-1 mb-4 p-1 rounded-lg"
                style={{ backgroundColor: "#f0f0f0" }}
              >
                {(def.sections ?? []).map((section, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => onSectionChange(sIdx)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      activeSection === sIdx
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {section.title} ({section.fields.length})
                  </button>
                ))}
              </div>
            )}

            {/* Results table */}
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b-2"
                    style={{ borderColor: "#00703C" }}
                  >
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      #
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      Parameter
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      Result
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      Unit
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      Reference Range
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700 whitespace-nowrap">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((row, idx) => {
                    const actualIdx = sectionStart + idx;
                    const flagColor = getFlagColor(row.flag);
                    const fieldDef = def.fields[actualIdx];

                    return (
                      <tr
                        key={actualIdx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-2 text-gray-400 text-xs">
                          {actualIdx + 1}
                        </td>
                        <td className="py-2 px-2 font-medium text-gray-700">
                          {row.test}
                        </td>
                        <td className="py-2 px-2">
                          {fieldDef ? (
                            <LISFieldRenderer
                              field={fieldDef}
                              value={row.result}
                              onChange={(value) =>
                                onResultChange(actualIdx, value)
                              }
                              index={actualIdx}
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Unknown field
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-gray-500 text-xs">
                          {row.unit}
                        </td>
                        <td className="py-2 px-2 text-gray-500 text-xs font-mono">
                          {row.referenceRange}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {row.flag && (
                            <span
                              className={`inline-block text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${flagColor}`}
                            >
                              {row.flag}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Abnormal results banner */}
            {results.some(
              (r) => r.flag === "HIGH" || r.flag === "LOW"
            ) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Abnormal Results Detected
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {results
                        .filter(
                          (r) => r.flag === "HIGH" || r.flag === "LOW"
                        )
                        .map((r) => `${r.test} (${r.flag}`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Attachments summary (shown for non-file tests too) */}
        {!isFileTest && attachments.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              Attachments ({attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <button
                  key={idx}
                  onClick={() => onDownloadAttachment(att)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
                  title="Download"
                >
                  {att.type.startsWith("image/") ? (
                    <img
                      src={`data:${att.type};base64,${att.data}`}
                      alt={att.name}
                      className="w-5 h-5 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save Results button (only if results haven't been saved yet) */}
        {!resultsSaved && (
          <button
            onClick={onSaveResults}
            disabled={savingResults}
            className="mt-6 w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ backgroundColor: "#00703C" }}
          >
            {savingResults ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Results &amp; Continue
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
