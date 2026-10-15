"use client";

import React, { useState } from "react";
import {
  FileText, Stethoscope, Pill, Microscope, Radio, ClipboardList,
  ChevronDown, Syringe, Check, AlertTriangle, Info,
} from "lucide-react";
import TreatmentPlanReadOnly from "./TreatmentPlanReadOnly";

// Read-only patient record, in the same ChartSection format the doctor's
// admitted-patient file uses (page 3443 of app/Doctors/page.tsx).
//
// This is the shared renderer for any record a doctor may only look at. It has
// no write handlers, no forms, no order buttons and no save path — it cannot
// create a Visit or change anything, so opening a treated patient is inert.

export interface TreatedPrescription {
  id: number;
  medication: string;
  dosage: string;
  instructions: string;
  route: string | null;
  frequency: string | null;
  status?: string;
  createdAt?: string;
  /**
   * Set when the row has no visitId and was matched to this consultation by its
   * createdAt falling inside the consultation window. Shown as a small chip so
   * an inferred row is never mistaken for a confirmed one.
   */
  linkedByDate?: boolean;
}

export interface TreatedLabRequest {
  id: number;
  testName: string;
  status: string;
  results: string | null;
  createdAt: string;
  priority?: string;
  rejectionReason?: string | null;
  interpretation?: string | null;
  linkedByDate?: boolean;
}

export interface TreatedImagingRequest {
  id: number;
  studyType: string;
  status: string;
  findings: string | null;
  impression: string | null;
  conclusion: string | null;
  createdAt: string;
  linkedByDate?: boolean;
}

export interface TreatedProcedure {
  id: number;
  procedureName: string;
  procedureNotes: string;
  performedBy: string;
  createdAt: string;
}

export interface TreatedRecord {
  patientId: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  ageUnit: string;
  gender: string;
  phoneNumber: string | null;
  address: string | null;
  isEmergency: boolean;
  currentStatus: string;
  visitId: number;
  encounterId: number | null;
  seenAt: string;
  doctorName: string | null;
  chiefComplaint: string;
  symptoms: string;
  historyOfPresentIllness: string;
  reviewOfOtherSystems: string;
  pastMedicalHistory: string;
  physicalExamination: string;
  assessment: string;
  diagnosis: string;
  differentialDiagnosis: string;
  treatmentPlan: string;
  notes: string;
  doctorSignature: string;
  outcome?: string;
  // External facility the patient was referred out to, when the consultation
  // ended in a referral. Optional — most records never carry one.
  referredTo?: string | null;
  prescriptions: TreatedPrescription[];
  labRequests: TreatedLabRequest[];
  imagingRequests: TreatedImagingRequest[];
  procedures: TreatedProcedure[];
  dischargeSummaries: {
    id: number;
    dateOfDischarge: string;
    diagnosis: string | null;
    conditionAtDischarge: string | null;
    followUpPlan: string | null;
    doctorSignatureName: string | null;
    examFindingsAtDischarge?: string | null;
  }[];
  visitHistory: {
    id: number;
    createdAt: string;
    diagnosis: string | null;
    doctorName: string | null;
    isMine: boolean;
  }[];
}

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-UG", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const OUTCOME_STYLES: Record<string, string> = {
  "Sent to cashier": "bg-orange-100 text-orange-700",
  Discharged: "bg-slate-200 text-slate-700",
  Referred: "bg-violet-100 text-violet-700",
  "Referred out": "bg-indigo-100 text-indigo-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

function LabStatusPill({ status }: { status: string }) {
  const hasResults = status === "COMPLETED" || status === "REPORTED";
  const cls = hasResults
    ? "bg-emerald-100 text-emerald-700"
    : status === "PENDING" || status === "PROCESSING"
      ? "bg-amber-100 text-amber-700"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-500";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Marks a row that carries no visitId and was matched to this consultation by
 *  its date. Only ever rendered when the record was fetched with
 *  `scope=consultation`; absent on the normal, unscoped record. */
function LinkedByDateChip() {
  return (
    <span
      title="No visit link on this row — matched to this consultation by its date."
      className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500"
    >
      linked by date
    </span>
  );
}

/** Small labelled paragraph used throughout the chart sections. */
function Field({ label, value, empty = "Not recorded" }: { label: string; value: string | null | undefined; empty?: string }) {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm whitespace-pre-wrap text-slate-700">{value}</p>
    </div>
  );
}

interface PatientRecordViewProps {
  record: TreatedRecord;
  onBack?: () => void;
  /**
   * Renders the record as a panel inside another screen (the consultation's
   * "Previous visit" card) instead of a full page. Hides the back control and
   * the "ask reception to queue them" notice, which make no sense there, and
   * retitles the header. Adds no write handler and no save path.
   */
  embedded?: boolean;
  /**
   * Action rendered on the right of the header row. The caller owns it, so this
   * component stays a pure read-only renderer with no knowledge of follow-ups.
   */
  headerAction?: React.ReactNode;
}

export default function PatientRecordView({
  record,
  onBack,
  embedded = false,
  headerAction,
}: PatientRecordViewProps) {
  const p = record;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    complaintHistory: true,
    examFindings: true,
    investigations: true,
    treatmentPlan: true,
    diagnosisPlan: true,
    prescriptions: true,
    procedures: true,
    notes: true,
  });

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const ChartSection = ({
    title, icon, isExpanded, onToggle, children,
  }: {
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-slate-50/50 px-4 py-3 hover:bg-slate-100"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          {icon}{title}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );

  const activeLabs = p.labRequests.filter((l) => l.status !== "CANCELLED");
  const activeImaging = p.imagingRequests.filter((i) => i.status !== "CANCELLED");
  const latestDischarge = p.dischargeSummaries?.[0];

  return (
    <div>
      {/* ── Back + read-only notice ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {embedded ? (
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Previous visit · read-only
          </span>
        ) : (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
          >
            ← Back to Treated Patients
          </button>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Info size={11} /> Read-only record
        </span>
        {headerAction}
      </div>

      {/* ── Patient header ── */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-bold sm:h-14 sm:w-14 sm:text-xl ${
                p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"
              }`}
            >
              {p.firstName[0]}{p.lastName[0]}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-800 sm:text-xl">
                {p.lastName}, {p.firstName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 sm:text-sm">
                <span className="font-mono text-[11px] text-[#0a2e1a]/60">{p.patientNumber}</span>
                <span className="text-slate-300">|</span>
                <span>{p.gender === "MALE" ? "Male" : p.gender === "FEMALE" ? "Female" : "Other"}</span>
                <span className="text-slate-300">|</span>
                <span>{p.age} {p.ageUnit === "months" ? "months" : "years"}</span>
              </div>
              {p.phoneNumber ? (
                <p className="mt-0.5 text-[11px] text-slate-400">{p.phoneNumber}</p>
              ) : null}
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            {p.outcome ? (
              <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${OUTCOME_STYLES[p.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                {p.outcome}
              </div>
            ) : null}
            {p.referredTo ? (
              <div className="mt-1.5 max-w-[12rem] text-[9px] font-semibold leading-tight text-indigo-600 sm:text-[10px]">
                Referred to {p.referredTo}
              </div>
            ) : null}
            {p.doctorName ? (
              <div className="mt-1.5 text-[9px] text-slate-500 sm:text-[10px]">
                <span className="font-semibold">Dr.</span> {p.doctorName}
              </div>
            ) : null}
            <div className="mt-1 text-[9px] text-slate-400 sm:text-[10px]">{fmtDateTime(p.seenAt)}</div>
            <div className="mt-0.5 font-mono text-[9px] text-slate-400 sm:text-[10px]">
              Visit #{p.visitId}{p.encounterId ? ` · Enc #${p.encounterId}` : ""}
            </div>
          </div>
        </div>

        {/* The one action a reader might expect and cannot take. Suppressed when
            embedded: inside the consultation screen the reader is already looking
            at a new encounter, so "ask reception to queue them" is misleading. */}
        {!embedded ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              This consultation is closed and the record is read-only. To see this
              patient again, ask reception to queue them.
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Complaint & History ── */}
      <ChartSection title="Complaint & History" icon={<FileText size={12} />} isExpanded={expanded.complaintHistory} onToggle={() => toggle("complaintHistory")}>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Chief Complaint / Presenting Complaint</p>
            <p className="text-sm text-slate-700">{p.chiefComplaint || "Not recorded"}</p>
          </div>
          <Field label="History of Presenting Illness" value={p.historyOfPresentIllness} />
          {p.symptoms && p.symptoms !== p.chiefComplaint ? (
            <Field label="Doctor's Presenting Complaint" value={p.symptoms} />
          ) : null}
          <Field label="Assessment" value={p.assessment} />
        </div>

        {p.visitHistory.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Consultations</p>
            <div className="space-y-2">
              {p.visitHistory.map((v) => (
                <div key={v.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-500">
                      {fmtDateTime(v.createdAt)}{v.doctorName ? ` · Dr. ${v.doctorName}` : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {v.id === p.visitId ? (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-700">
                          Viewing this visit
                        </span>
                      ) : null}
                      {v.isMine && v.id !== p.visitId ? (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                          Yours
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {v.diagnosis ? <p className="mt-0.5 text-xs text-slate-700">{v.diagnosis}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </ChartSection>

      {/* ── Exam Findings ── */}
      <ChartSection title="Examination Findings" icon={<Stethoscope size={12} />} isExpanded={expanded.examFindings} onToggle={() => toggle("examFindings")}>
        <div className="space-y-4">
          {p.physicalExamination ? (
            <Field label="Physical Examination" value={p.physicalExamination} />
          ) : (
            <p className="text-sm text-slate-400">No examination findings recorded</p>
          )}
          <Field label="Review of Other Systems" value={p.reviewOfOtherSystems} />
          <Field label="Past Medical History" value={p.pastMedicalHistory} />
          {latestDischarge?.examFindingsAtDischarge ? (
            <Field label="Examination at Discharge" value={latestDischarge.examFindingsAtDischarge} />
          ) : null}
        </div>
      </ChartSection>

      {/* ── Prescriptions ── */}
      {p.prescriptions.length > 0 ? (
        <ChartSection title={`Prescriptions (${p.prescriptions.length})`} icon={<Pill size={12} />} isExpanded={expanded.prescriptions} onToggle={() => toggle("prescriptions")}>
          <div className="space-y-2">
            {p.prescriptions.map((rx) => (
              <div key={rx.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <Pill size={14} className="mt-1 flex-shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">{rx.medication}</p>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">Dosage:</span> {rx.dosage}
                  </p>
                  {rx.route ? (
                    <p className="text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">Route:</span> {rx.route}
                    </p>
                  ) : null}
                  {rx.frequency ? (
                    <p className="text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">Frequency:</span> {rx.frequency}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">Instructions:</span> {rx.instructions}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  {rx.linkedByDate ? <LinkedByDateChip /> : null}
                  {rx.status && rx.status !== "PENDING" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
                      {rx.status}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ChartSection>
      ) : null}

      {/* ── Investigations & Results ── */}
      <ChartSection
        title={`Investigations & Results${activeLabs.length + activeImaging.length > 0 ? ` (${activeLabs.length + activeImaging.length})` : ""}`}
        icon={<Microscope size={12} />}
        isExpanded={expanded.investigations}
        onToggle={() => toggle("investigations")}
      >
        <div className="space-y-4">
          {activeLabs.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                <Microscope size={11} /> Lab Tests ({activeLabs.length})
              </p>
              <div className="space-y-2">
                {activeLabs.map((lr) => (
                  <div key={`lab-${lr.id}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700">{lr.testName}</p>
                      <div className="flex items-center gap-1.5">
                      {lr.linkedByDate ? <LinkedByDateChip /> : null}
                      <LabStatusPill status={lr.status} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Ordered {new Date(lr.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {lr.results ? (
                      <p className="mt-1.5 rounded bg-white px-2 py-1.5 text-[11px] whitespace-pre-wrap text-slate-700">{lr.results}</p>
                    ) : lr.rejectionReason ? (
                      <p className="mt-1.5 text-[11px] text-red-600">Rejected: {lr.rejectionReason}</p>
                    ) : null}
                    {lr.interpretation && (
                      <p className="mt-1.5 rounded bg-emerald-50 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-slate-700">
                        <span className="font-bold text-emerald-700">Remarks / Interpretation: </span>
                        {lr.interpretation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeImaging.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-600">
                <Radio size={11} /> Imaging ({activeImaging.length})
              </p>
              <div className="space-y-2">
                {activeImaging.map((ir) => (
                  <div key={`img-${ir.id}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700">
                        {ir.studyType.replace(/_/g, " ")}
                      </p>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {ir.linkedByDate ? <LinkedByDateChip /> : null}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                        ir.status === "REPORTED"
                          ? "bg-emerald-100 text-emerald-700"
                          : ir.status === "ORDERED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                      }`}>
                        {ir.status}
                      </span>
                    </div>
                    </div>
                    {ir.findings || ir.impression || ir.conclusion ? (
                      <div className="mt-1.5 space-y-1">
                        <Field label="Findings" value={ir.findings} />
                        <Field label="Impression" value={ir.impression} />
                        <Field label="Conclusion" value={ir.conclusion} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeLabs.length === 0 && activeImaging.length === 0 ? (
            <p className="text-sm text-slate-400">No investigations were ordered for this patient.</p>
          ) : null}
        </div>
      </ChartSection>

      {/* ── Treatment Plan ── */}
      <ChartSection title="Treatment Plan" icon={<ClipboardList size={12} />} isExpanded={expanded.treatmentPlan} onToggle={() => toggle("treatmentPlan")}>
        <TreatmentPlanReadOnly
          text={p.treatmentPlan}
          emptyText="No treatment plan recorded for this consultation."
        />
      </ChartSection>

      {/* ── Diagnosis & sign-off ── */}
      <ChartSection title="Diagnosis & Sign-off" icon={<Check size={12} />} isExpanded={expanded.diagnosisPlan} onToggle={() => toggle("diagnosisPlan")}>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {latestDischarge ? "Final Diagnosis" : "Provisional Diagnosis"}
            </p>
            <p className="text-sm text-slate-700">
              {latestDischarge?.diagnosis || p.diagnosis || "Not recorded"}
            </p>
            {!latestDischarge && p.diagnosis ? (
              <p className="mt-1 text-xs text-slate-400">
                Recorded at consultation. No discharge summary was filed, so this
                remains the provisional diagnosis.
              </p>
            ) : null}
          </div>
          <Field label="Differential Diagnosis" value={p.differentialDiagnosis} />
          {latestDischarge ? (
            <>
              <Field label="Condition at Discharge" value={latestDischarge.conditionAtDischarge} />
              <Field label="Follow-up Plan" value={latestDischarge.followUpPlan} />
            </>
          ) : null}
          {p.doctorSignature ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor's Signature</p>
              <p
                className="text-sm italic text-slate-700"
                style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}
              >
                {p.doctorSignature}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">Signed {fmtDateTime(p.seenAt)}</p>
            </div>
          ) : null}
        </div>
      </ChartSection>

      {/* ── Procedures ── */}
      {p.procedures.length > 0 ? (
        <ChartSection title={`Procedures (${p.procedures.length})`} icon={<Syringe size={12} />} isExpanded={expanded.procedures} onToggle={() => toggle("procedures")}>
          <div className="space-y-2">
            {p.procedures.map((proc) => (
              <div key={proc.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">{proc.procedureName}</p>
                  <span className="shrink-0 text-[9px] text-slate-400">{proc.performedBy}</span>
                </div>
                {proc.procedureNotes ? (
                  <p className="mt-0.5 text-[11px] whitespace-pre-wrap text-slate-600">{proc.procedureNotes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </ChartSection>
      ) : null}

      {/* ── Notes ── */}
      {p.notes ? (
        <ChartSection title="Clinical Notes" icon={<FileText size={12} />} isExpanded={expanded.notes} onToggle={() => toggle("notes")}>
          <p className="text-sm whitespace-pre-wrap text-slate-700">{p.notes}</p>
        </ChartSection>
      ) : null}
    </div>
  );
}
