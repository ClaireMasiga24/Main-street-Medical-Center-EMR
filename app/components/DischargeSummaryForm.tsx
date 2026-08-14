"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Loader2,
  FileText,
  Activity,
  Microscope,
  ClipboardList,
  Pill,
  Calendar,
  User,
  Stethoscope,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Radio,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdmittedPatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  phoneNumber: string | null;
  address: string | null;
  isEmergency: boolean;
  currentStatus: string;
  inTreatmentRoom?: boolean;
  admittedAt: string;
  lengthOfStay: string;
  diagnosis: string;
  historyOfPresentIllness: string;
  assessment: string;
  treatmentPlan: string;
  physicalExamination: string;
  notes: string;
  pastMedicalHistory: string;
  reviewOfOtherSystems: string;
  differentialDiagnosis: string;
  doctorSignature: string;
  symptoms: string;
  chiefComplaint: string;
  admittingDoctor: string;
  prescriptions: {
    id: number;
    medication: string;
    dosage: string;
    instructions: string;
    route: string | null;
    frequency: string | null;
  }[];
}

interface DischargeFormData {
  dateOfDischarge: string;
  reasonForAdmission: string;
  clinicalSummary: string;
  examFindingsAtAdmission: string;
  examFindingsAtDischarge: string;
  diagnosis: string;
  treatmentGiven: string;
  conditionAtDischarge: string;
  conditionOtherDetail: string;
  dischargeMedication: string;
  followUpPlan: string;
  nextOfKinName: string;
  nextOfKinSignature: string;
  nextOfKinDate: string;
  doctorSignatureName: string;
  doctorSignedAt: string;
}

interface Props {
  patient: AdmittedPatient;
  labRequests: any[];
  imagingRequests: any[];
  staffId: number;
  staffName: string;
  onClose: () => void;
  onDischarged: (patientName: string, summaryId: number) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CONDITIONS = ["Stable", "Improved", "Referred/Transferred", "Other"];

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

// ─── PDF Builder ────────────────────────────────────────────────────────────

function buildDischargePdfHtml(
  p: AdmittedPatient,
  fd: DischargeFormData,
  staffName: string,
  labRequests: any[],
  imagingRequests: any[]
): string {
  const gender = p.gender === "MALE" ? "Male" : p.gender === "FEMALE" ? "Female" : p.gender;
  const admitDate = formatDate(p.admittedAt);
  const dischargeDate = fd.dateOfDischarge
    ? formatDate(fd.dateOfDischarge)
    : formatDate(new Date().toISOString());
  const conditionDisplay =
    fd.conditionAtDischarge === "Other"
      ? `Other — ${fd.conditionOtherDetail || ""}`
      : fd.conditionAtDischarge || "N/A";

  // Build investigations list
  let investigationsHtml = "";
  if (labRequests.length > 0) {
    investigationsHtml += labRequests
      .map(
        (lr: any) =>
          `<tr><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${lr.testName || "N/A"}</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">Lab</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${lr.status || "PENDING"}</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${lr.results || "—"}</td></tr>`
      )
      .join("");
  }
  if (imagingRequests.length > 0) {
    investigationsHtml += imagingRequests
      .map(
        (ir: any) =>
          `<tr><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${ir.studyType || "N/A"}</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">Imaging</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${ir.status || "ORDERED"}</td><td style="padding:3px 6px;border:1px solid #ccc;font-size:10px">${ir.findings || ir.impression || "—"}</td></tr>`
      )
      .join("");
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Discharge Summary</title><style>
    @page{size:A4;margin:15mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;position:relative;line-height:1.4}
    body::before{content:'';position:fixed;inset:0;background-image:url('/Images/LOGO.jpg');background-repeat:no-repeat;background-position:center;background-size:60%;opacity:0.07;pointer-events:none;z-index:-1;print-color-adjust:exact}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    td{padding:3px 6px;border:1px solid #ccc;font-size:10px}
    th{padding:4px 8px;background:#0a2e1a;color:#fff;font-size:10px;text-align:left}
    .title{text-align:center;font-size:15px;font-weight:bold;color:#0a2e1a;margin:8px 0 12px}
    .title-sub{text-align:center;font-size:10px;color:#555;margin-bottom:12px}
    .section-hdr{font-size:10px;font-weight:bold;color:#0a2e1a;margin:10px 0 3px;text-transform:uppercase;letter-spacing:0.5px}
    .section-hdr::after{content:'';display:block;border-bottom:1px solid #0a2e1a;margin-top:2px;opacity:0.3}
    .content-block{margin:2px 0 8px 0;padding:0 2px;font-size:10px;color:#333;white-space:pre-wrap}
    .sig-line{border-bottom:1px solid #000;display:inline-block;min-width:180px;padding:2px 6px;font-size:16px;font-family:'Brush Script MT','Segoe Script',cursive}
    .signoff-row{display:flex;justify-content:space-between;margin-top:28px;border-top:1px solid #ccc;padding-top:14px;flex-wrap:wrap;gap:16px}
    .signoff-block{flex:1;min-width:180px}
    .signoff-block p.label{font-size:9px;font-weight:bold;color:#0a2e1a;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px}
    .signoff-block p.name{font-size:10px;color:#555;margin-top:2px}
    .signoff-block p.date{font-size:9px;color:#888;margin-top:1px}
    .footer{text-align:center;font-size:8px;color:#999;margin-top:16px;border-top:1px solid #eee;padding-top:8px}
  </style></head><body>
    <div class="title">MAIN STREET MEDICAL CENTER</div>
    <div class="title-sub">DISCHARGE SUMMARY</div>

    <table><tr><th colspan="4">PATIENT INFORMATION</th></tr>
    <tr><td><b>Name:</b></td><td>${p.lastName}, ${p.firstName}</td><td><b>Patient ID:</b></td><td>${p.patientNumber}</td></tr>
    <tr><td><b>Age/Sex:</b></td><td>${p.age} / ${gender}</td><td><b>Contact:</b></td><td>${p.phoneNumber || "N/A"}</td></tr>
    <tr><td><b>Address:</b></td><td>${p.address || "N/A"}</td><td><b>Admitted:</b></td><td>${admitDate}</td></tr>
    <tr><td><b>Discharged:</b></td><td colspan="3">${dischargeDate}</td></tr></table>

    <div class="section-hdr">Reason for Admission / Chief Complaint</div>
    <div class="content-block">${fd.reasonForAdmission || p.chiefComplaint || "N/A"}</div>

    ${fd.clinicalSummary ? `<div class="section-hdr">Clinical Summary</div><div class="content-block">${fd.clinicalSummary}</div>` : ""}

    <div class="section-hdr">Examination Findings</div>
    <div class="content-block"><b>At Admission:</b> ${fd.examFindingsAtAdmission || p.physicalExamination || "Not recorded"}</div>
    <div class="content-block"><b>At Discharge:</b> ${fd.examFindingsAtDischarge || "Not recorded"}</div>

    ${
      investigationsHtml
        ? `<div class="section-hdr">Investigations Done</div>
           <table><tr><th>Test / Study</th><th>Type</th><th>Status</th><th>Results</th></tr>${investigationsHtml}</table>`
        : ""
    }

    <div class="section-hdr">Diagnosis</div>
    <div class="content-block">${fd.diagnosis || p.diagnosis || "N/A"}</div>

    <div class="section-hdr">Summary of Treatment Given</div>
    <div class="content-block">${fd.treatmentGiven || p.treatmentPlan || "N/A"}</div>

    <div class="section-hdr">Condition at Discharge</div>
    <div class="content-block">${conditionDisplay}</div>

    <div class="section-hdr">Discharge Medication and Instructions</div>
    <div class="content-block">${fd.dischargeMedication || "None prescribed"}</div>

    ${fd.followUpPlan ? `<div class="section-hdr">Follow-Up and Review Plan</div><div class="content-block">${fd.followUpPlan}</div>` : ""}

    <div class="signoff-row">
      <div class="signoff-block">
        <p class="label">Next of Kin</p>
        <div class="sig-line">${fd.nextOfKinSignature || "_______________"}</div>
        <p class="name">${fd.nextOfKinName || "Name: _______________"}</p>
        <p class="date">Date: ${fd.nextOfKinDate ? formatDate(fd.nextOfKinDate) : "_______________"}</p>
      </div>
      <div class="signoff-block">
        <p class="label">Attending Doctor</p>
        <div class="sig-line">${fd.doctorSignatureName || staffName}</div>
        <p class="name">Dr. ${staffName}</p>
        <p class="date">Date: ${fd.doctorSignedAt ? formatDate(fd.doctorSignedAt) : dischargeDate}</p>
      </div>
    </div>

    <div class="footer">Main Street Medical Center EMR — Discharge Summary</div>
  </body></html>`;
}

// ─── Section Wrapper ────────────────────────────────────────────────────────

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-3">
      <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-50/50 border-b border-slate-100">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function DischargeSummaryForm({
  patient,
  labRequests,
  imagingRequests,
  staffId,
  staffName,
  onClose,
  onDischarged,
}: Props) {
  const pdfRenderRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from patient data
  const [formData, setFormData] = useState<DischargeFormData>({
    dateOfDischarge: today(),
    reasonForAdmission: patient.chiefComplaint || "",
    clinicalSummary: "",
    examFindingsAtAdmission: patient.physicalExamination || "",
    examFindingsAtDischarge: "",
    diagnosis: patient.diagnosis || "",
    treatmentGiven: patient.treatmentPlan || "",
    conditionAtDischarge: "",
    conditionOtherDetail: "",
    dischargeMedication: "",
    followUpPlan: "",
    nextOfKinName: "",
    nextOfKinSignature: "",
    nextOfKinDate: today(),
    doctorSignatureName: staffName,
    doctorSignedAt: today(),
  });

  const updateField = useCallback(
    (field: keyof DischargeFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ── PDF Generation ──
  const generatePdf = useCallback(
    async (summaryId: number) => {
      try {
        const html = buildDischargePdfHtml(
          patient,
          formData,
          staffName,
          labRequests,
          imagingRequests
        );

        // Write HTML to hidden div and generate PDF
        if (!pdfRenderRef.current) {
          // Hidden div not mounted, fallback to print dialog
          throw new Error("PDF render target not available");
        }

        pdfRenderRef.current.innerHTML = html;

        // Dynamically import html2pdf (SSR-safe)
        const html2pdf = (await import("html2pdf.js")).default;

        const opt = {
          margin: [10, 10, 10, 10] as [number, number, number, number],
          filename: `Discharge_Summary_${patient.patientNumber}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait" as const,
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        await html2pdf().set(opt as any).from(pdfRenderRef.current).save();
      } catch (err) {
        console.error("[DischargeSummaryForm] PDF generation error:", err);
        // Fallback: open print dialog
        const html = buildDischargePdfHtml(
          patient,
          formData,
          staffName,
          labRequests,
          imagingRequests
        );
        const pw = window.open("", "_blank", "width=800,height=600");
        if (pw) {
          pw.document.write(html);
          pw.document.close();
        }
      }
    },
    [patient, formData, staffName, labRequests, imagingRequests]
  );

  // ── Submit ──
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.conditionAtDischarge) {
      setError("Please select a condition at discharge.");
      return;
    }
    if (!formData.doctorSignatureName?.trim()) {
      setError("Doctor's signature is required.");
      return;
    }
    if (!formData.dischargeMedication?.trim()) {
      setError("Please enter discharge medication and instructions.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const investigationsPayload = {
        labRequests: labRequests.map((lr: any) => ({
          id: lr.id,
          testName: lr.testName,
          status: lr.status,
          results: lr.results,
          createdAt: lr.createdAt,
        })),
        imagingRequests: imagingRequests.map((ir: any) => ({
          id: ir.id,
          studyType: ir.studyType,
          status: ir.status,
          findings: ir.findings,
          impression: ir.impression,
          createdAt: ir.createdAt,
        })),
      };

      const res = await fetch("/api/doctor/discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          staffId,
          staffName,
          ...formData,
          investigationsSummary: investigationsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discharge failed");

      // Generate PDF
      await generatePdf(data.dischargeSummary?.id || 0);

      // Notify parent
      onDischarged(`${patient.lastName}, ${patient.firstName}`, data.dischargeSummary?.id || 0);
    } catch (err: any) {
      console.error("[DischargeSummaryForm] submit error:", err);
      setError(err.message || "Failed to discharge patient. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center pt-4 sm:pt-8 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
      >
        {/* Card */}
        <div className="bg-[#eaf5ee] rounded-2xl shadow-2xl w-full max-w-3xl mx-3 my-4 overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0a2e1a]/10 flex items-center justify-center">
                <LogOut size={14} className="text-[#0a2e1a]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Discharge Summary</h2>
                <p className="text-[10px] text-slate-400">
                  {patient.lastName}, {patient.firstName} — {patient.patientNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Section 1 — Patient Information */}
            <FormSection title="Patient Information" icon={<User size={12} className="text-[#0a2e1a]" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Full Name
                  </label>
                  <p className="text-sm font-semibold text-slate-800">
                    {patient.lastName}, {patient.firstName}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Patient ID
                  </label>
                  <p className="text-sm font-mono text-slate-700">{patient.patientNumber}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Age / Sex
                  </label>
                  <p className="text-sm text-slate-700">
                    {patient.age} yrs /{" "}
                    {patient.gender === "MALE" ? "Male" : patient.gender === "FEMALE" ? "Female" : patient.gender}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Contact
                  </label>
                  <p className="text-sm text-slate-700">{patient.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Address
                  </label>
                  <p className="text-sm text-slate-700">{patient.address || "N/A"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Date of Admission
                  </label>
                  <p className="text-sm text-slate-700">{formatDate(patient.admittedAt)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Length of Stay
                  </label>
                  <p className="text-sm text-slate-700">{patient.lengthOfStay}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Admitting Doctor
                  </label>
                  <p className="text-sm text-slate-700">{patient.admittingDoctor || "N/A"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Date of Discharge
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20"
                    value={formData.dateOfDischarge}
                    onChange={(e) => updateField("dateOfDischarge", e.target.value)}
                  />
                </div>
              </div>
            </FormSection>

            {/* Section 2 — Admission Details */}
            <FormSection
              title="Admission Details"
              icon={<FileText size={12} className="text-[#0a2e1a]" />}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Reason for Admission / Chief Complaint
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 bg-slate-50 text-slate-600 min-h-[50px] resize-none"
                    value={formData.reasonForAdmission}
                    readOnly
                    rows={2}
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Auto-filled from triage records</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Clinical Summary
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]"
                    placeholder="Brief clinical summary of the admission course..."
                    value={formData.clinicalSummary}
                    onChange={(e) => updateField("clinicalSummary", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </FormSection>

            {/* Section 3 — Examination Findings */}
            <FormSection
              title="Examination Findings"
              icon={<Activity size={12} className="text-[#0a2e1a]" />}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    At Admission
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 bg-slate-50 text-slate-600 min-h-[60px] resize-none"
                    value={formData.examFindingsAtAdmission}
                    readOnly
                    rows={3}
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Auto-filled from initial examination
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    At Discharge (Clinical Findings / Vitals)
                  </label>
                  <textarea
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]"
                    placeholder="Record current clinical findings and vitals at discharge..."
                    value={formData.examFindingsAtDischarge}
                    onChange={(e) => updateField("examFindingsAtDischarge", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </FormSection>

            {/* Section 4 — Investigations Done */}
            <FormSection
              title="Investigations Done"
              icon={<Microscope size={12} className="text-[#0a2e1a]" />}
            >
              {labRequests.length === 0 && imagingRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No investigations ordered during admission.</p>
              ) : (
                <div className="space-y-3">
                  {labRequests.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Microscope size={11} /> Lab Tests ({labRequests.length})
                      </p>
                      <div className="space-y-1.5">
                        {labRequests.map((lr: any) => (
                          <div
                            key={`lab-${lr.id}`}
                            className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            <Microscope size={12} className="text-purple-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700">{lr.testName}</p>
                              {lr.results && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-medium">Result:</span> {lr.results}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                                lr.status === "COMPLETED" || lr.status === "REPORTED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : lr.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {lr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {imagingRequests.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Radio size={11} /> Imaging ({imagingRequests.length})
                      </p>
                      <div className="space-y-1.5">
                        {imagingRequests.map((ir: any) => (
                          <div
                            key={`img-${ir.id}`}
                            className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            <Radio size={12} className="text-cyan-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700">
                                {ir.studyType}
                              </p>
                              {ir.findings && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-medium">Findings:</span> {ir.findings}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                                ir.status === "REPORTED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : ir.status === "ORDERED"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {ir.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormSection>

            {/* Section 5 — Diagnosis */}
            <FormSection
              title="Diagnosis"
              icon={<ClipboardList size={12} className="text-[#0a2e1a]" />}
            >
              <textarea
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[50px]"
                value={formData.diagnosis}
                onChange={(e) => updateField("diagnosis", e.target.value)}
                rows={2}
              />
              <p className="text-[9px] text-slate-400 mt-0.5">
                Pre-filled from chart. Edit if final diagnosis differs.
              </p>
            </FormSection>

            {/* Section 6 — Treatment Given */}
            <FormSection
              title="Summary of Treatment Given"
              icon={<Stethoscope size={12} className="text-[#0a2e1a]" />}
            >
              <textarea
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]"
                placeholder="Summarize the treatment provided during admission..."
                value={formData.treatmentGiven}
                onChange={(e) => updateField("treatmentGiven", e.target.value)}
                rows={3}
              />
            </FormSection>

            {/* Section 7 — Condition at Discharge */}
            <FormSection
              title="Condition at Discharge"
              icon={<Activity size={12} className="text-[#0a2e1a]" />}
            >
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                      formData.conditionAtDischarge === c
                        ? c === "Stable"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : c === "Improved"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : c === "Referred/Transferred"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-slate-400 bg-slate-50 text-slate-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="conditionAtDischarge"
                      className="sr-only"
                      checked={formData.conditionAtDischarge === c}
                      onChange={() => updateField("conditionAtDischarge", c)}
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        formData.conditionAtDischarge === c
                          ? "border-current"
                          : "border-slate-300"
                      }`}
                    >
                      {formData.conditionAtDischarge === c && (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    {c}
                  </label>
                ))}
              </div>
              {formData.conditionAtDischarge === "Other" && (
                <input
                  type="text"
                  className="mt-3 w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                  placeholder="Specify condition..."
                  value={formData.conditionOtherDetail}
                  onChange={(e) => updateField("conditionOtherDetail", e.target.value)}
                />
              )}
            </FormSection>

            {/* Section 8 — Discharge Medication */}
            <FormSection
              title="Discharge Medication and Instructions"
              icon={<Pill size={12} className="text-[#0a2e1a]" />}
            >
              <textarea
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[120px]"
                placeholder={`List discharge medications with dosage, frequency, and administration instructions.\n\nExample:\n- Amoxicillin 500mg PO TID x 7 days\n- Paracetamol 1g PO PRN for pain\n- Omeprazole 20mg PO OD`}
                value={formData.dischargeMedication}
                onChange={(e) => updateField("dischargeMedication", e.target.value)}
                rows={6}
              />
            </FormSection>

            {/* Section 9 — Follow-up */}
            <FormSection
              title="Follow-Up and Review Plan"
              icon={<Calendar size={12} className="text-[#0a2e1a]" />}
            >
              <textarea
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]"
                placeholder="Specify follow-up appointment date, clinic, and any referral instructions..."
                value={formData.followUpPlan}
                onChange={(e) => updateField("followUpPlan", e.target.value)}
                rows={3}
              />
            </FormSection>

            {/* Section 10 — Sign-off */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-3">
              <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-50/50 border-b border-slate-100">
                <ClipboardList size={12} className="text-[#0a2e1a]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Sign-Off
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Next of Kin */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Next of Kin
                    </p>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                        placeholder="Next of kin name"
                        value={formData.nextOfKinName}
                        onChange={(e) => updateField("nextOfKinName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Signature (typed name)
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                        placeholder="Digital signature"
                        value={formData.nextOfKinSignature}
                        onChange={(e) => updateField("nextOfKinSignature", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                        value={formData.nextOfKinDate}
                        onChange={(e) => updateField("nextOfKinDate", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Doctor */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Attending Doctor
                    </p>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                        value={staffName}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Signature (typed name)
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                        placeholder="Type your name to sign"
                        value={formData.doctorSignatureName}
                        onChange={(e) => updateField("doctorSignatureName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">
                        Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                        value={formData.doctorSignedAt}
                        onChange={(e) => updateField("doctorSignedAt", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-10 bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0a2e1a] hover:bg-[#0d3d24] active:bg-[#0f4f2d] transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Save &amp; Discharge
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden PDF render target */}
      <div
        ref={pdfRenderRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
          zIndex: -1,
        }}
      />
    </>
  );
}
