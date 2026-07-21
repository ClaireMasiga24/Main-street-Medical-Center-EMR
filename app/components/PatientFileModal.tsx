"use client";

import React, { useState, useEffect } from "react";
import {
  X, Loader2, FileText, Stethoscope, FlaskConical,
  RadioTower, Pill, HeartPulse, Clock, UserRound,
  Phone, MapPin, ShieldAlert, Activity,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  ageUnit: string;
  dob: string | null;
  gender: string;
  phone: string | null;
  address: string | null;
  chiefComplaint: string;
  isEmergency: boolean;
  status: string;
  createdAt: string;
}

interface PatientFileModalProps {
  patient: Patient;
  onClose: () => void;
  onRoutePatient: (patient: Patient) => void;
}

type SectionKey = "visits" | "labs" | "imaging" | "prescriptions" | "triage" | "timeline" | "billing" | "reviews" | "nurse_actions" | "procedures" | "anc" | "appointments";

interface HistoryData {
  triage: any | null;
  visits: any[];
  imaging: any[];
  labHistory: any[];
  prescriptions: any[];
  timeline: any[];
  billingRecords: any[];
  patientReviews: any[];
  nurseActions: any[];
  medicalProcedures: any[];
  ancAssessments: any[];
  appointments: any[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  REGISTERED:          { label: "Registered", color: "text-slate-700 bg-slate-100 border-slate-300" },
  AWAITING_TRIAGE:     { label: "Awaiting Triage",     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  AWAITING_DOCTOR:     { label: "Awaiting Doctor",      color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  AWAITING_DENTIST:    { label: "Awaiting Dentist",     color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  AWAITING_SONOGRAPHY: { label: "Awaiting Sonography",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  AWAITING_RADIOLOGY:  { label: "Awaiting Radiology",   color: "text-violet-700 bg-violet-50 border-violet-200" },
  AWAITING_LAB:        { label: "Awaiting Lab",         color: "text-amber-700 bg-amber-50 border-amber-200" },
  IN_CONSULTATION:     { label: "In Consultation",      color: "text-rose-700 bg-rose-50 border-rose-200" },
  AWAITING_PHARMACY:   { label: "Awaiting Pharmacy",    color: "text-teal-700 bg-teal-50 border-teal-200" },
  AWAITING_CASHIER:    { label: "Awaiting Cashier",     color: "text-orange-700 bg-orange-50 border-orange-200" },
  DISCHARGED:          { label: "Discharged",           color: "text-slate-500 bg-slate-50 border-slate-200" },
  LAB_REJECTED:        { label: "Rejected by Lab",      color: "text-red-700 bg-red-50 border-red-200" },
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const formatAge = (age: number, unit: string) =>
  `${age} ${unit === "months" ? "mo" : "yrs"}`;

const formatUGX = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-UG");

// ─── Sections ───────────────────────────────────────────────────────────────

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: "visits",        label: "Visits",        icon: <Stethoscope size={13} /> },
  { key: "labs",          label: "Lab Tests",     icon: <FlaskConical size={13} /> },
  { key: "imaging",       label: "Imaging",       icon: <RadioTower size={13} /> },
  { key: "prescriptions", label: "Prescriptions", icon: <Pill size={13} /> },
  { key: "triage",        label: "Triage/Vitals", icon: <HeartPulse size={13} /> },
  { key: "billing",       label: "Billing",       icon: <FileText size={13} /> },
  { key: "reviews",       label: "Reviews",       icon: <Stethoscope size={13} /> },
  { key: "nurse_actions", label: "Nursing",       icon: <Activity size={13} /> },
  { key: "procedures",    label: "Procedures",    icon: <Activity size={13} /> },
  { key: "anc",           label: "ANC",           icon: <HeartPulse size={13} /> },
  { key: "appointments",  label: "Appointments",  icon: <Clock size={13} /> },
  { key: "timeline",      label: "Timeline",      icon: <Clock size={13} /> },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? {
    label: status.replace(/_/g, " "),
    color: "text-slate-500 bg-slate-50 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${s.color}`}>
      {s.label}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PatientFileModal({ patient, onClose, onRoutePatient }: PatientFileModalProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("visits");
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/patient-history?patientId=${patient.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load patient history");
        return r.json();
      })
      .then((result) => {
        if (!cancelled) {
          setData(result.data || result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [patient.id]);

  const renderSection = () => {
    if (!data) return null;

    switch (activeSection) {
      // ── VISITS ────────────────────────────────────────────────────────
      case "visits": {
        const items = data.visits || [];
        if (items.length === 0) return <EmptySection icon={<Stethoscope size={24} />} text="No consultation records found" />;
        return (
          <div className="space-y-2">
            {items.map((v: any) => (
              <div key={v.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {v.doctorName ? `Dr. ${v.doctorName}` : "Doctor visit"}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(v.createdAt)}</span>
                </div>
                {v.symptoms && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Symptoms</span>
                    <p className="text-xs text-slate-600 mt-0.5">{v.symptoms}</p>
                  </div>
                )}
                {v.diagnosis && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Diagnosis</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{v.diagnosis}</p>
                  </div>
                )}
                {v.treatmentPlan && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Treatment Plan</span>
                    <p className="text-xs text-slate-600 mt-0.5">{v.treatmentPlan}</p>
                  </div>
                )}
                {v.assessment && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assessment</span>
                    <p className="text-xs text-slate-600 mt-0.5">{v.assessment}</p>
                  </div>
                )}
                {v.differentialDiagnosis && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Differential Diagnosis</span>
                    <p className="text-xs text-slate-600 mt-0.5">{v.differentialDiagnosis}</p>
                  </div>
                )}
                {v.Triage && (
                  <div className="flex gap-2 text-[10px] text-slate-500">
                    {v.Triage.chiefComplaint && <span>CC: {v.Triage.chiefComplaint}</span>}
                    {v.Triage.esiLevel && <span>ESI: Level {v.Triage.esiLevel}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      // ── LAB TESTS ─────────────────────────────────────────────────────
      case "labs": {
        const items = data.labHistory || [];
        if (items.length === 0) return <EmptySection icon={<FlaskConical size={24} />} text="No lab test records found" />;
        return (
          <div className="space-y-2">
            {items.map((l: any) => (
              <div key={l.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{l.testName}</span>
                    {l.isCritical && <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">CRITICAL</span>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    l.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                    l.status === "PROCESSING" ? "bg-blue-50 text-blue-700" :
                    l.status === "REJECTED" ? "bg-red-50 text-red-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>{l.status}</span>
                </div>
                {l.specimenType && <span className="text-[9px] text-slate-400">Specimen: {l.specimenType}</span>}
                {l.specimenId && <span className="text-[9px] text-slate-400 ml-2">ID: {l.specimenId}</span>}
                {l.results && (
                  <div className="rounded-lg bg-slate-50 p-2.5 mt-1">
                    <pre className="text-[10px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">{l.results}</pre>
                  </div>
                )}
                {l.enteredByName && <div className="text-[9px] text-slate-400">Entered by: {l.enteredByName} {l.resultEnteredAt ? `· ${formatDateTime(l.resultEnteredAt)}` : ""}</div>}
                {l.validatedByName && <div className="text-[9px] text-slate-400">Validated by: {l.validatedByName} {l.validatedAt ? `· ${formatDateTime(l.validatedAt)}` : ""}</div>}
                {l.criticalNote && <div className="text-[9px] text-red-600 bg-red-50 rounded-lg p-2">{l.criticalNote}</div>}
                {l.analyzerResults && <div className="text-[9px] text-slate-400">Analyzer: {l.analyzerType} ({l.analyzerModel})</div>}
              </div>
            ))}
          </div>
        );
      }

      // ── IMAGING ────────────────────────────────────────────────────────
      case "imaging": {
        const items = data.imaging || [];
        if (items.length === 0) return <EmptySection icon={<RadioTower size={24} />} text="No imaging records found" />;
        return (
          <div className="space-y-2">
            {items.map((img: any) => (
              <div key={img.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{img.studyType}</span>
                    {img.isCritical && <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">CRITICAL</span>}
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDateTime(img.createdAt)}</span>
                </div>
                {img.clinicalNotes && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Notes</span><p className="text-xs text-slate-600 mt-0.5">{img.clinicalNotes}</p></div>}
                {img.findings && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Findings</span><p className="text-xs text-slate-600 mt-0.5">{img.findings}</p></div>}
                {img.impression && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Impression</span><p className="text-xs font-semibold text-slate-700 mt-0.5">{img.impression}</p></div>}
                {img.conclusion && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Conclusion</span><p className="text-xs text-slate-600 mt-0.5">{img.conclusion}</p></div>}
                {img.Staff && <div className="text-[9px] text-slate-400">Reported by: {img.Staff.fullName} ({img.Staff.department}) {img.reportedAt ? `· ${formatDateTime(img.reportedAt)}` : ""}</div>}
              </div>
            ))}
          </div>
        );
      }

      // ── PRESCRIPTIONS ─────────────────────────────────────────────────
      case "prescriptions": {
        const items = data.prescriptions || [];
        if (items.length === 0) return <EmptySection icon={<Pill size={24} />} text="No prescription records found" />;
        return (
          <div className="space-y-2">
            {items.map((rx: any) => (
              <div key={rx.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{rx.medication}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      rx.status === "DISPENSED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>{rx.status}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <span className="font-semibold">Dosage:</span> {rx.dosage}
                  </div>
                  {rx.instructions && (
                    <div className="text-[10px] text-slate-500">
                      <span className="font-semibold">Instructions:</span> {rx.instructions}
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400">{formatDate(rx.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      // ── TRIAGE / VITALS ──────────────────────────────────────────────
      case "triage": {
        const t = data.triage;
        if (!t) return <EmptySection icon={<HeartPulse size={24} />} text="No triage/vitals records found" />;
        const vitals = [
          { label: "Temperature", value: t.temperature ? `${t.temperature} °C` : null },
          { label: "BP", value: t.bpSystolic && t.bpDiastolic ? `${t.bpSystolic}/${t.bpDiastolic} mmHg` : null },
          { label: "Heart Rate", value: t.heartRate ? `${t.heartRate} bpm` : null },
          { label: "Respiratory Rate", value: t.respiratoryRate ? `${t.respiratoryRate} /min` : null },
          { label: "SpO2", value: t.spo2 ? `${t.spo2} %` : null },
          { label: "Weight", value: t.weight ? `${t.weight} kg` : null },
          { label: "Height", value: t.height ? `${t.height} cm` : null },
          { label: "Pain Level", value: t.painLevel ? `${t.painLevel}/10` : null },
          { label: "Pain Location", value: t.painLocation || null },
          { label: "ESI Level", value: t.esiLevel ? `Level ${t.esiLevel}` : null },
        ];
        const recordedVitals = vitals.filter((v) => v.value !== null);
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recordedVitals.map((v) => (
                  <div key={v.label}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{v.label}</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{v.value}</p>
                  </div>
                ))}
                {recordedVitals.length === 0 && (
                  <p className="text-xs text-slate-400 col-span-full">No vitals recorded</p>
                )}
              </div>
              {t.createdAt && <div className="mt-3 text-[9px] text-slate-400 border-t border-slate-50 pt-2">Recorded: {formatDateTime(t.createdAt)}</div>}
            </div>
            {t.allergies && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Allergies</span>
                <p className="text-xs font-semibold text-amber-800 mt-0.5">{t.allergies}</p>
              </div>
            )}
            {t.chiefComplaint && (
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Chief Complaint</span>
                <p className="text-xs text-slate-600 mt-0.5">{t.chiefComplaint}</p>
              </div>
            )}
            {t.medicalHistory && (
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Medical History</span>
                <p className="text-xs text-slate-600 mt-0.5">{t.medicalHistory}</p>
              </div>
            )}
            {t.triageOutcome && (
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Triage Outcome</span>
                <p className="text-xs text-slate-600 mt-0.5">{t.triageOutcome}</p>
              </div>
            )}
          </div>
        );
      }

      // ── TIMELINE ─────────────────────────────────────────────────────────
      case "timeline": {
        const items = data.timeline || [];
        if (items.length === 0) return <EmptySection icon={<Clock size={24} />} text="No timeline entries found" />;
        return (
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-3">
              {items.map((entry: any) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-[22px] h-[22px] rounded-full bg-[#00703C]/10 border-2 border-[#00703C] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00703C]" />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00703C]">{entry.action}</span>
                      <span className="text-[9px] text-slate-400">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    {(entry.fromDepartment || entry.toDepartment) && (
                      <div className="text-[10px] text-slate-600 mt-1">
                        {entry.fromDepartment && <span className="font-semibold">{entry.fromDepartment}</span>}
                        {entry.fromDepartment && entry.toDepartment && <span className="mx-1 text-slate-300">→</span>}
                        {entry.toDepartment && <span className="font-semibold">{entry.toDepartment}</span>}
                      </div>
                    )}
                    {entry.description && <p className="text-[10px] text-slate-500 mt-1">{entry.description}</p>}
                    {entry.performedBy && <div className="text-[9px] text-slate-400 mt-1">By: {entry.performedBy}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── BILLING ─────────────────────────────────────────────────────────
      case "billing": {
        const items = data.billingRecords || [];
        if (items.length === 0) return <EmptySection icon={<FileText size={24} />} text="No billing records found" />;
        return (
          <div className="space-y-2">
            {items.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {b.invoiceNumber || `Bill #${b.id}`}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    b.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                    b.status === "PARTIAL" ? "bg-amber-50 text-amber-700" :
                    "bg-rose-50 text-rose-700"
                  }`}>{b.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div><span className="text-slate-400">Amount:</span> <span className="font-bold text-slate-700">{formatUGX(b.amount)}</span></div>
                  <div><span className="text-slate-400">Paid:</span> <span className="font-bold text-emerald-700">{formatUGX(b.amountPaid)}</span></div>
                  <div><span className="text-slate-400">Balance:</span> <span className="font-bold text-amber-700">{formatUGX(b.balanceDue)}</span></div>
                </div>
                {b.description && (() => {
                  try {
                    const desc = JSON.parse(b.description);
                    const payments = desc.payments || [];
                    return payments.length > 0 ? (
                      <div className="border-t border-slate-50 pt-1.5 mt-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payments</span>
                        {payments.map((p: any, i: number) => (
                          <div key={i} className="text-[9px] text-slate-500 mt-0.5">
                            {p.paymentMethod} · {formatUGX(p.amountPaid)} {p.reference ? `· Ref: ${p.reference}` : ""} · {formatDateTime(p.date)}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  } catch { return null; }
                })()}
                <div className="text-[9px] text-slate-400">{formatDateTime(b.createdAt)}</div>
              </div>
            ))}
          </div>
        );
      }

      // ── DOCTOR REVIEWS ──────────────────────────────────────────────────
      case "reviews": {
        const items = data.patientReviews || [];
        if (items.length === 0) return <EmptySection icon={<Stethoscope size={24} />} text="No doctor reviews found" />;
        return (
          <div className="space-y-2">
            {items.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Dr. {r.doctorName}</span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(r.createdAt)}</span>
                </div>
                {r.diagnosis && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis</span><p className="text-xs font-semibold text-slate-700 mt-0.5">{r.diagnosis}</p></div>}
                {r.examinationFindings && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Exam Findings</span><p className="text-xs text-slate-600 mt-0.5">{r.examinationFindings}</p></div>}
                {r.treatmentPlan && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Treatment Plan</span><p className="text-xs text-slate-600 mt-0.5">{r.treatmentPlan}</p></div>}
                {r.followUpNotes && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Follow-up Notes</span><p className="text-xs text-slate-600 mt-0.5">{r.followUpNotes}</p></div>}
                {r.historyOfPresentIllness && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">HPI</span><p className="text-xs text-slate-600 mt-0.5">{r.historyOfPresentIllness}</p></div>}
                {r.labOrders && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lab Orders</span><p className="text-xs text-slate-600 mt-0.5">{r.labOrders}</p></div>}
                {r.imagingOrders && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Imaging Orders</span><p className="text-xs text-slate-600 mt-0.5">{r.imagingOrders}</p></div>}
              </div>
            ))}
          </div>
        );
      }

      // ── NURSE ACTIONS (treatments administered) ─────────────────────────
      case "nurse_actions": {
        const items = data.nurseActions || [];
        if (items.length === 0) return <EmptySection icon={<Activity size={24} />} text="No nursing actions recorded" />;
        return (
          <div className="space-y-2">
            {items.map((n: any) => (
              <div key={n.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{n.medication || "Treatment"}</span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
                {n.dose && <div className="text-[10px] text-slate-600"><span className="font-semibold">Dose:</span> {n.dose}</div>}
                {n.route && <div className="text-[10px] text-slate-600"><span className="font-semibold">Route:</span> {n.route}</div>}
                {n.timeAdministered && <div className="text-[10px] text-slate-600"><span className="font-semibold">Given at:</span> {formatDateTime(n.timeAdministered)}</div>}
                {n.notes && <div className="text-[10px] text-slate-500 italic">{n.notes}</div>}
                {n.performedBy && <div className="text-[9px] text-slate-400">By: {n.performedBy}</div>}
              </div>
            ))}
          </div>
        );
      }

      // ── MEDICAL PROCEDURES ──────────────────────────────────────────────
      case "procedures": {
        const items = data.medicalProcedures || [];
        if (items.length === 0) return <EmptySection icon={<Activity size={24} />} text="No medical procedures recorded" />;
        return (
          <div className="space-y-2">
            {items.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{p.procedureName}</span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(p.createdAt)}</span>
                </div>
                {p.procedureNotes && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Notes</span><p className="text-xs text-slate-600 mt-0.5">{p.procedureNotes}</p></div>}
                {p.treatmentFollowUp && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Follow-up</span><p className="text-xs text-slate-600 mt-0.5">{p.treatmentFollowUp}</p></div>}
                {p.performedBy && <div className="text-[9px] text-slate-400">By: {p.performedBy}</div>}
              </div>
            ))}
          </div>
        );
      }

      // ── ANC ASSESSMENTS (Antenatal Care) ────────────────────────────────
      case "anc": {
        const items = data.ancAssessments || [];
        if (items.length === 0) return <EmptySection icon={<HeartPulse size={24} />} text="No ANC assessments recorded" />;
        return (
          <div className="space-y-2">
            {items.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    ANC Visit {a.gravida ? `(G${a.gravida}P${a.para})` : ""}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(a.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {a.gestationalAgeWeeks && <div><span className="text-slate-400">Gestation:</span> <span className="font-semibold">{a.gestationalAgeWeeks} wks</span></div>}
                  {a.fundalHeight && <div><span className="text-slate-400">Fundal Ht:</span> <span className="font-semibold">{a.fundalHeight} cm</span></div>}
                  {a.fetalHeartRate && <div><span className="text-slate-400">FHR:</span> <span className="font-semibold">{a.fetalHeartRate} bpm</span></div>}
                  {a.fetalPresentation && <div><span className="text-slate-400">Presentation:</span> <span className="font-semibold">{a.fetalPresentation}</span></div>}
                  {a.fetalMovement && <div><span className="text-slate-400">Movements:</span> <span className="font-semibold">{a.fetalMovement}</span></div>}
                  {a.bpSystolic && a.bpDiastolic && <div><span className="text-slate-400">BP:</span> <span className="font-semibold">{a.bpSystolic}/{a.bpDiastolic}</span></div>}
                  {a.maternalWeight && <div><span className="text-slate-400">Weight:</span> <span className="font-semibold">{a.maternalWeight} kg</span></div>}
                </div>
                {a.complaints && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complaints</span><p className="text-xs text-slate-600 mt-0.5">{a.complaints}</p></div>}
                {a.clinicalNotes && <div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clinical Notes</span><p className="text-xs text-slate-600 mt-0.5">{a.clinicalNotes}</p></div>}
                {a.nextAppointmentDate && <div className="text-[10px] text-blue-600 font-semibold">Next appt: {formatDate(a.nextAppointmentDate)}</div>}
                {(a.assessedBy || a.referredBy) && <div className="text-[9px] text-slate-400">{a.assessedBy ? `Assessed by: ${a.assessedBy}` : ""}{a.referredBy ? ` · Referred by: ${a.referredBy}` : ""}</div>}
              </div>
            ))}
          </div>
        );
      }

      // ── APPOINTMENTS ────────────────────────────────────────────────────
      case "appointments": {
        const items = data.appointments || [];
        if (items.length === 0) return <EmptySection icon={<Clock size={24} />} text="No appointment records found" />;
        return (
          <div className="space-y-2">
            {items.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{a.department || "Visit"}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      a.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                      a.status === "CONFIRMED" ? "bg-blue-50 text-blue-700" :
                      a.status === "CANCELLED" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>{a.status}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formatDateTime(a.appointmentDate)}
                  </div>
                  {a.reason && <div className="text-[10px] text-slate-600">{a.reason}</div>}
                  {a.notes && <div className="text-[9px] text-slate-400 italic">{a.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-slate-50 shadow-2xl overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bg-green-800 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-extrabold uppercase tracking-wider truncate">
                {patient.lastName}, {patient.firstName}
              </h2>
              <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                {patient.patientNumber}
              </span>
              <StatusBadge status={patient.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-emerald-100">
              <span>{formatAge(patient.age, patient.ageUnit)} · {patient.gender}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> Registered: {formatDate(patient.createdAt)}
              </span>
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={10} /> {patient.phone}
                </span>
              )}
              {patient.isEmergency && (
                <span className="flex items-center gap-1 text-rose-200 font-bold">
                  <ShieldAlert size={10} /> Emergency
                </span>
              )}
            </div>
            {patient.address && (
              <div className="flex items-center gap-1 mt-0.5 text-[9px] text-emerald-200">
                <MapPin size={9} /> {patient.address}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => onRoutePatient(patient)}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white transition-all"
            >
              <Activity size={12} />
              Select for Routing
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Section tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          {SECTIONS.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-full transition-colors flex-shrink-0 ${
                activeSection === sec.key
                  ? "bg-green-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {sec.icon} {sec.label}
            </button>
          ))}
        </div>

        {/* ── Content area ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-slate-300" />
              <p className="text-sm font-medium text-slate-400 mt-3">Loading patient history...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-700">Failed to load history</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
              <button onClick={onClose} className="mt-3 text-xs font-bold text-red-600 underline">Close</button>
            </div>
          ) : (
            renderSection()
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-[9px] text-slate-400">
            {patient.chiefComplaint && `CC: ${patient.chiefComplaint}`}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty Section Placeholder ──────────────────────────────────────────────

function EmptySection({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <div className="mb-3 opacity-50">{icon}</div>
      <p className="text-sm font-medium text-slate-400">{text}</p>
    </div>
  );
}
