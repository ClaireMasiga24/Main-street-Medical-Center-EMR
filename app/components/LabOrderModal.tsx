"use client";

import React, { useState, useMemo } from "react";
import { LAB_TEST_CATALOG, type LabTestCatalogItem } from "../lib/labTestCatalog";
import { Search, X, FlaskConical, Loader2, CheckCircle2 } from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────────────

interface LabOrderModalProps {
  patientName: string;
  onClose: () => void;
  onConfirm: (selectedTests: LabTestCatalogItem[]) => Promise<void>;
}

// ─── Helper: group by section ───────────────────────────────────────────────

function groupBySection(tests: LabTestCatalogItem[]): Record<string, LabTestCatalogItem[]> {
  const map: Record<string, LabTestCatalogItem[]> = {};
  for (const t of tests) {
    if (!map[t.section]) map[t.section] = [];
    map[t.section].push(t);
  }
  return map;
}

const SECTION_ORDER = [
  "Haematology",
  "Biochemistry",
  "Microbiology",
  "Serology",
  "Urinalysis",
];

// ─── Component ──────────────────────────────────────────────────────────────

export function LabOrderModal({ patientName, onClose, onConfirm }: LabOrderModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTION_ORDER)
  );

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return LAB_TEST_CATALOG;
    const q = search.toLowerCase().trim();
    return LAB_TEST_CATALOG.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Group filtered results
  const grouped = useMemo(() => groupBySection(filtered), [filtered]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleTest = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectedTests = useMemo(
    () => LAB_TEST_CATALOG.filter((t) => selected.has(t.code)),
    [selected]
  );

  const handleConfirm = async () => {
    if (selectedTests.length === 0 || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(selectedTests);
    } finally {
      setConfirming(false);
    }
  };

  const totalCount = LAB_TEST_CATALOG.length;
  const visibleCount = filtered.length;
  const selectedCount = selected.size;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
        onClick={!confirming ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(560px,calc(100vw-32px))] max-h-[85vh] bg-white rounded-2xl
                      shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FlaskConical size={15} className="text-green-700" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 leading-tight">
                Order Lab Tests
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                {patientName}
              </p>
            </div>
          </div>
          <button
            onClick={!confirming ? onClose : undefined}
            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 transition flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-1.5 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name or code…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-[12px] font-semibold outline-none transition focus:border-green-500 focus:bg-white"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Test list ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
          {visibleCount === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Search size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-medium">No tests match your search</p>
              <p className="text-[10px] text-slate-300 mt-1">Try a different term</p>
            </div>
          ) : (
            Object.entries(grouped).map(([section, tests]) => {
              const isExpanded = expandedSections.has(section);
              const selectedInSection = tests.filter((t) => selected.has(t.code)).length;
              return (
                <div key={section} className="rounded-xl border border-slate-100 overflow-hidden mb-2">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section)}
                    className="flex w-full items-center justify-between gap-2 bg-slate-50/80 px-3.5 py-2.5 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        {section}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full">
                        {tests.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedInSection > 0 && (
                        <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                          {selectedInSection} selected
                        </span>
                      )}
                      <svg
                        className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Test rows */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-50">
                      {tests.map((test) => {
                        const isSelected = selected.has(test.code);
                        return (
                          <label
                            key={test.code}
                            className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-green-50/70 hover:bg-green-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTest(test.code)}
                              className="w-4 h-4 rounded border-slate-300 text-green-700 focus:ring-green-400 accent-green-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-700 truncate">
                                  {test.name}
                                </span>
                                {test.needsPricing && (
                                  <span className="flex-shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wider text-green-700">
                                    Needs Pricing
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono text-green-700 font-semibold">
                                  {test.code}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {test.specimenType}
                                </span>

                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-700">{selectedCount}</span> of{" "}
            <span className="font-bold">{totalCount}</span> tests selected
            {search && visibleCount !== totalCount && (
              <span className="text-slate-400"> &middot; {visibleCount} shown</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={confirming}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || confirming}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Ordering…
                </>
              ) : (
                <>
                  <FlaskConical size={12} />
                  Order {selectedCount > 0 ? `(${selectedCount})` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
