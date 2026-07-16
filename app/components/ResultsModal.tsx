"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Loader2, Printer, FileText, CheckCircle2,
  FlaskConical, RadioTower, Stethoscope, HeartPulse,
  Pill, AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface VitalsData {
  temperature: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
  painLevel: number | null;
  painLocation: string | null;
  allergies: string | null;
  triageOutcome: string | null;
  createdAt: string | null;
}

interface LabTestResult {
  id: number;
  testName: string;
  testPanel: string | null;
  results: string | null;
  isCritical: boolean;
  criticalNote: string | null;
  enteredByName: string | null;
  resultEnteredAt: string | null;
  validatedByName: string | null;
  validatedAt: string | null;
  analyzerResults: string | null;
  analyzerType: string | null;
  analyzerModel: string | null;
  specimenType: string | null;
  specimenId: string | null;
  attachments: string | null;
  clinicalNotes: string | null;
  status: string;
  createdAt: string | null;
}

interface ImagingResult {
  id: number;
  studyType: string;
  findings: string | null;
  impression: string | null;
  conclusion: string | null;
  clinicalNotes: string | null;
  clinicalHistory: string | null;
  radiologistNotes: string | null;
  reportedAt: string | null;
  isCritical: boolean;
  criticalNote: string | null;
  createdAt: string | null;
}

interface DiagnosisData {
  id: number;
  symptoms: string | null;
  diagnosis: string | null;
  assessment: string | null;
  differentialDiagnosis: string | null;
  treatmentPlan: string | null;
  notes: string | null;
  doctorName: string | null;
  createdAt: string | null;
}

interface DoctorReviewData {
  id: number;
  diagnosis: string | null;
  treatmentPlan: string | null;
  examinationFindings: string | null;
  followUpNotes: string | null;
  doctorName: string | null;
  createdAt: string | null;
}

interface PrescriptionData {
  id: number;
  medication: string;
  dosage: string;
  instructions: string;
  status: string;
  createdAt: string | null;
}

interface PatientResults {
  vitals: VitalsData | null;
  labTests: LabTestResult[];
  imaging: ImagingResult[];
  diagnosis: DiagnosisData | null;
  doctorReview: DoctorReviewData | null;
  prescriptions: PrescriptionData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

const formatUGX = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-UG");

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-UG", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

// ─── Parse JSON results into HTML table rows ──────────────────────────────────────

function renderLabResultsTable(resultsJson: string | null): string {
  if (!resultsJson) return "<p style='font-size:10px;color:#475569'>No detailed findings</p>";
  try {
    const parsed = JSON.parse(resultsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cols = Object.keys(parsed[0]);
      const headerRow = cols.map((k) => `<th style="text-align:left;padding:3px 6px;font-size:9px;text-transform:uppercase;color:#334155;border-bottom:1px solid #cbd5e1">${k.replace(/_/g, " ")}</th>`).join("");
      const bodyRows = parsed.map((row: any) => {
        const vals = cols.map((k) => {
          const v = String(row[k] ?? "");
          const isFlag = k === "flag" && (v === "critical" || v === "high" || v === "low");
          const cls = isFlag ? `style="font-weight:700;${v === "critical" ? "color:#dc2626" : "color:#d97706"}"` : "";
          return `<td ${cls} style="padding:2px 6px;font-size:10px;border-bottom:1px dotted #cbd5e1">${v}</td>`;
        }).join("");
        const bg = row.flag === "critical" ? " style='background:#fef2f2'" : row.flag === "high" || row.flag === "low" ? " style='background:#fff7ed'" : "";
        return `<tr${bg}>${vals}</tr>`;
      }).join("");
      return `<table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace">${headerRow ? `<thead><tr>${headerRow}</tr></thead>` : ""}<tbody>${bodyRows}</tbody></table>`;
    }
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([k, v]) => `<tr><td style="padding:2px 6px;font-size:10px;font-weight:600;color:#334155;white-space:nowrap">${k.replace(/_/g, " ")}</td><td style="padding:2px 6px;font-size:10px">${String(v ?? "")}</td></tr>`)
        .join("");
    }
  } catch {}
  return `<p style="font-size:10px;color:#1e293b;white-space:pre-wrap">${resultsJson}</p>`;
}

// ─── Props ────────────────────────────────────────────────────────────────────────

interface ResultsModalProps {
  patientName: string;
  patientNumber: string;
  patientAge: number;
  patientAgeUnit: string;
  patientGender: string;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────────

export default function ResultsModal({
  patientName,
  patientNumber,
  patientAge,
  patientAgeUnit,
  patientGender,
  onClose,
}: ResultsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PatientResults | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Fetch results ──────────────────────────────────────────────────────
  const fetchResults = useCallback(async () => {
    // We need the patient ID — look it up by patientNumber
    setLoading(true);
    setError(null);
    try {
      // Fetch active patients and find by patientNumber
      const regRes = await fetch("/api/receptionist");
      if (!regRes.ok) throw new Error("Failed to look up patient");
      const patients = await regRes.json();
      const patient = patients.find(
        (p: any) => p.patientNumber === patientNumber
      );
      if (!patient) throw new Error("Patient not found in active registry");

      const res = await fetch(`/api/receptionist?action=patient_results&patientId=${patient.id}`);
      if (!res.ok) throw new Error("Failed to load results");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load results");
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [patientNumber]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // ── Build HTML for print/download ───────────────────────────────────────
  const buildResultsHtml = (forPrint: boolean) => {
    if (!results) return "";
    const { vitals, labTests, imaging, diagnosis, doctorReview, prescriptions } = results;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });

    const sections: string[] = [];

    // ── Vitals ──────────────────────────────────────────────────────────
    if (vitals) {
      const rows: string[] = [];
      if (vitals.temperature !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Temperature</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.temperature} °C</td></tr>`);
      if (vitals.bpSystolic !== null && vitals.bpDiastolic !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Blood Pressure</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg</td></tr>`);
      if (vitals.heartRate !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Heart Rate</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.heartRate} bpm</td></tr>`);
      if (vitals.respiratoryRate !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Respiratory Rate</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.respiratoryRate} /min</td></tr>`);
      if (vitals.spo2 !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">SpO2</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.spo2}%</td></tr>`);
      if (vitals.weight !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Weight</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.weight} kg</td></tr>`);
      if (vitals.height !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Height</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.height} cm</td></tr>`);
      if (vitals.painLevel !== null) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Pain Level</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.painLevel}/10${vitals.painLocation ? ` (${vitals.painLocation})` : ""}</td></tr>`);
      if (vitals.allergies) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155">Allergies</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${vitals.allergies}</td></tr>`);
      if (rows.length > 0) {
        sections.push(`
          <div style="margin-bottom:14px">
            <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Vital Signs</h3>
            <table style="width:100%;border-collapse:collapse">${rows.join("")}</table>
          </div>
        `);
      }
    }

    // ── Lab Tests ───────────────────────────────────────────────────────
    if (labTests.length > 0) {
      const labHtml = labTests.map((lab) => {
        const criticalTag = lab.isCritical
          ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:8px;font-weight:800;padding:1px 4px;border-radius:3px;margin-left:4px;text-transform:uppercase">Critical</span>`
          : "";
        return `
          <div style="margin-bottom:10px;background:#fafafa;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <strong style="font-size:11px">${lab.testName}${lab.testPanel ? ` — ${lab.testPanel}` : ""}</strong>
              ${criticalTag}
            </div>
            ${lab.specimenId ? `<p style="font-size:8px;color:#475569;margin:2px 0">Specimen: ${lab.specimenId}${lab.specimenType ? ` (${lab.specimenType})` : ""}</p>` : ""}
            <table style="width:100%;border-collapse:collapse">${renderLabResultsTable(lab.results)}</table>
            ${lab.analyzerResults && lab.analyzerResults !== lab.results ? `
              <p style="font-size:8px;color:#475569;margin:6px 0 2px 0">Analyzer: ${lab.analyzerType || "N/A"}${lab.analyzerModel ? ` (${lab.analyzerModel})` : ""}</p>
              <table style="width:100%;border-collapse:collapse">${renderLabResultsTable(lab.analyzerResults)}</table>
            ` : ""}
            ${lab.criticalNote ? `<p style="font-size:9px;color:#dc2626;margin:4px 0 0 0;font-style:italic">${lab.criticalNote}</p>` : ""}
            ${lab.clinicalNotes ? `<p style="font-size:9px;color:#334155;margin:4px 0 0 0">Notes: ${lab.clinicalNotes}</p>` : ""}
            <p style="font-size:8px;color:#475569;margin:4px 0 0 0">
              ${lab.enteredByName ? `Entered by ${lab.enteredByName}` : ""}${lab.resultEnteredAt ? ` on ${formatDateTime(lab.resultEnteredAt)}` : ""}
              ${lab.validatedByName ? ` · Validated by ${lab.validatedByName}${lab.validatedAt ? ` on ${formatDateTime(lab.validatedAt)}` : ""}` : ""}
            </p>
          </div>
        `;
      }).join("");

      sections.push(`
        <div style="margin-bottom:14px">
          <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Laboratory Results (${labTests.length})</h3>
          ${labHtml}
        </div>
      `);
    }

    // ── Imaging ─────────────────────────────────────────────────────────
    if (imaging.length > 0) {
      const imgHtml = imaging.map((img) => {
        const criticalTag = img.isCritical
          ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:8px;font-weight:800;padding:1px 4px;border-radius:3px;margin-left:4px;text-transform:uppercase">Critical</span>`
          : "";
        return `
          <div style="margin-bottom:10px;background:#fafafa;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <strong style="font-size:11px">${img.studyType}${img.impression ? ` — ${img.impression}` : ""}</strong>
              ${criticalTag}
            </div>
            ${img.findings ? `<p style="font-size:9px;margin:2px 0"><strong style="color:#334155">Findings:</strong> ${img.findings}</p>` : ""}
            ${img.conclusion ? `<p style="font-size:9px;margin:2px 0"><strong style="color:#334155">Conclusion:</strong> ${img.conclusion}</p>` : ""}
            ${img.radiologistNotes ? `<p style="font-size:9px;margin:2px 0;font-style:italic;color:#334155">${img.radiologistNotes}</p>` : ""}
            ${img.criticalNote ? `<p style="font-size:9px;color:#dc2626;margin:4px 0 0 0;font-style:italic">${img.criticalNote}</p>` : ""}
            <p style="font-size:8px;color:#475569;margin:4px 0 0 0">
              ${img.reportedAt ? `Reported: ${formatDateTime(img.reportedAt)}` : ""}
            </p>
          </div>
        `;
      }).join("");

      sections.push(`
        <div style="margin-bottom:14px">
          <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Radiology / Sonography Results (${imaging.length})</h3>
          ${imgHtml}
        </div>
      `);
    }

    // ── Diagnosis (from Visit) ──────────────────────────────────────────
    if (diagnosis) {
      const hasContent = diagnosis.symptoms || diagnosis.diagnosis || diagnosis.assessment ||
        diagnosis.differentialDiagnosis || diagnosis.treatmentPlan || diagnosis.notes;
      if (hasContent) {
        const rows: string[] = [];
        if (diagnosis.symptoms) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Symptoms</td><td style="padding:2px 6px;font-size:10px">${diagnosis.symptoms}</td></tr>`);
        if (diagnosis.diagnosis) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Diagnosis</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${diagnosis.diagnosis}</td></tr>`);
        if (diagnosis.assessment) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Assessment</td><td style="padding:2px 6px;font-size:10px">${diagnosis.assessment}</td></tr>`);
        if (diagnosis.differentialDiagnosis) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Differential</td><td style="padding:2px 6px;font-size:10px">${diagnosis.differentialDiagnosis}</td></tr>`);
        if (diagnosis.treatmentPlan) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Treatment Plan</td><td style="padding:2px 6px;font-size:10px">${diagnosis.treatmentPlan}</td></tr>`);
        if (diagnosis.notes) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Notes</td><td style="padding:2px 6px;font-size:10px;font-style:italic">${diagnosis.notes}</td></tr>`);
        rows.push(`<tr><td style="padding:2px 6px;font-size:9px;color:#475569">Doctor</td><td style="padding:2px 6px;font-size:9px;color:#475569">${diagnosis.doctorName || "N/A"} · ${formatDateTime(diagnosis.createdAt)}</td></tr>`);

        sections.push(`
          <div style="margin-bottom:14px">
            <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Doctor's Consultation</h3>
            <table style="width:100%;border-collapse:collapse">${rows.join("")}</table>
          </div>
        `);
      }
    }

    // ── Doctor Review ───────────────────────────────────────────────────
    if (doctorReview) {
      const hasContent = doctorReview.diagnosis || doctorReview.treatmentPlan ||
        doctorReview.examinationFindings || doctorReview.followUpNotes;
      if (hasContent) {
        const rows: string[] = [];
        if (doctorReview.diagnosis) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Diagnosis</td><td style="padding:2px 6px;font-size:10px;font-weight:600">${doctorReview.diagnosis}</td></tr>`);
        if (doctorReview.examinationFindings) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Exam Findings</td><td style="padding:2px 6px;font-size:10px">${doctorReview.examinationFindings}</td></tr>`);
        if (doctorReview.treatmentPlan) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Treatment Plan</td><td style="padding:2px 6px;font-size:10px">${doctorReview.treatmentPlan}</td></tr>`);
        if (doctorReview.followUpNotes) rows.push(`<tr><td style="padding:2px 6px;font-size:10px;color:#334155;vertical-align:top;white-space:nowrap">Follow-Up</td><td style="padding:2px 6px;font-size:10px">${doctorReview.followUpNotes}</td></tr>`);
        rows.push(`<tr><td style="padding:2px 6px;font-size:9px;color:#475569">Doctor</td><td style="padding:2px 6px;font-size:9px;color:#475569">${doctorReview.doctorName || "N/A"} · ${formatDateTime(doctorReview.createdAt)}</td></tr>`);

        sections.push(`
          <div style="margin-bottom:14px">
            <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Doctor's Review</h3>
            <table style="width:100%;border-collapse:collapse">${rows.join("")}</table>
          </div>
        `);
      }
    }

    // ── Prescriptions ───────────────────────────────────────────────────
    if (prescriptions.length > 0) {
      const rxRows = prescriptions.map((rx) => `
        <tr>
          <td style="padding:3px 6px;font-size:10px;font-weight:600;border-bottom:1px dotted #cbd5e1">${rx.medication}</td>
          <td style="padding:3px 6px;font-size:10px;border-bottom:1px dotted #cbd5e1">${rx.dosage}</td>
          <td style="padding:3px 6px;font-size:10px;border-bottom:1px dotted #cbd5e1">${rx.instructions}</td>
          <td style="padding:3px 6px;font-size:9px;border-bottom:1px dotted #cbd5e1;color:#334155">${rx.status === "DISPENSED" ? "Dispensed" : "Pending"}</td>
        </tr>
      `).join("");

      sections.push(`
        <div style="margin-bottom:14px">
          <h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#00703C;margin:0 0 6px 0;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Prescriptions (${prescriptions.length})</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:3px 6px;font-size:9px;text-transform:uppercase;color:#334155;border-bottom:1px solid #cbd5e1">Medication</th>
              <th style="text-align:left;padding:3px 6px;font-size:9px;text-transform:uppercase;color:#334155;border-bottom:1px solid #cbd5e1">Dosage</th>
              <th style="text-align:left;padding:3px 6px;font-size:9px;text-transform:uppercase;color:#334155;border-bottom:1px solid #cbd5e1">Instructions</th>
              <th style="text-align:left;padding:3px 6px;font-size:9px;text-transform:uppercase;color:#334155;border-bottom:1px solid #cbd5e1">Status</th>
            </tr></thead>
            <tbody>${rxRows}</tbody>
          </table>
        </div>
      `);
    }

    const allContent = sections.join("\n");
    const noResultsMsg = !allContent.trim()
      ? '<p style="text-align:center;font-size:11px;color:#475569;margin:40px 0">No clinical results recorded for this visit.</p>'
      : "";

    const autoPrintScript = forPrint
      ? '<script>window.onload=function(){window.setTimeout(function(){window.print();window.close()},400)};<\/script>'
      : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Clinical Results - ${patientNumber}</title>
	  <style>
	    @page { margin: 12mm; }
	    body { margin:0; padding:20px; font-family:'Courier New',monospace; color:#0f172a; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
	    .watermark { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:-1; opacity:0.1; }
	    .watermark img { width:50%; height:auto; max-width:400px; }
	    .header { text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px dashed #64748b; }
	    .header h1 { font-size:16px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1px; }
	    .header p { font-size:9px; color:#334155; margin:2px 0 0 0; }
	    .title { text-align:center; margin-bottom:12px; }
	    .title h2 { font-size:14px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1.5px; color:#00703C; }
	    .patient-info { margin-bottom:14px; }
	    .patient-info table { width:100%; font-size:10px; border-collapse:collapse; }
	    .patient-info td { padding:2px 6px; }
	    .patient-info td:first-child { color:#475569; white-space:nowrap; width:80px; }
	    .patient-info td:last-child { font-weight:700; }
	    .footer { border-top:2px dashed #64748b; margin-top:16px; padding-top:8px; text-align:center; font-size:8px; color:#475569; }
	    .footer p { margin:2px 0; }
	    @media print {
	      body { padding:0; }
	    }
  </style>
</head>
<body>
  <div class="watermark"><img src="/Images/LOGO.jpg" alt="" /></div>
  <div class="header">
    <h1>Main Street Medical Center</h1>
    <p>Commitment to Good Health</p>
    <p>P.O. Box — Kampala, Uganda</p>
  </div>
  <div class="title"><h2>Clinical Results Report</h2></div>
  <div class="patient-info">
    <table>
      <tr><td>Patient:</td><td>${patientName}</td></tr>
      <tr><td>ID:</td><td style="color:#00703C">${patientNumber}</td></tr>
      <tr><td>Age/Sex:</td><td>${patientAge} ${patientAgeUnit === "months" ? "mo" : "yrs"} · ${patientGender}</td></tr>
      <tr><td>Reported:</td><td>${dateStr} at ${timeStr}</td></tr>
    </table>
  </div>
  ${allContent}
  ${noResultsMsg}
  <div class="footer">
    <p>This is a computer-generated results report</p>
    <p>Main Street Medical Center — Commitment to Good Health</p>
  </div>
  ${autoPrintScript}
</body></html>`;
  };

  // ── Print ──────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const html = buildResultsHtml(false);
    if (!html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = html;
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow?.print(); } catch { alert("Print failed. Try using Download instead."); }
      }, 300);
    };
  };

  // ── Download ───────────────────────────────────────────────────────────
  const handleDownload = () => {
    const html = buildResultsHtml(false);
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Results-${patientNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const { vitals, labTests, imaging, diagnosis, doctorReview, prescriptions } = results || {};
  const hasVitals = vitals && (vitals.temperature !== null || vitals.bpSystolic !== null || vitals.heartRate !== null);
  const hasLab = labTests && labTests.length > 0;
  const hasImaging = imaging && imaging.length > 0;
  const hasDiagnosis = diagnosis && (diagnosis.diagnosis || diagnosis.symptoms || diagnosis.treatmentPlan);
  const hasReview = doctorReview && (doctorReview.diagnosis || doctorReview.examinationFindings);
  const hasRx = prescriptions && prescriptions.length > 0;

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-6 shadow-2xl flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#00703C]" />
            <span className="text-xs font-bold text-slate-600">Loading clinical results...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <AlertTriangle size={28} className="mx-auto mb-3 text-amber-500" />
            <p className="text-sm font-bold text-slate-800 mb-1">Failed to Load Results</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button onClick={onClose}
              className="rounded-xl bg-[#00703C] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {!loading && !error && results !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-[#00703C] px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-emerald-100" />
                  <h3 className="text-sm font-extrabold uppercase tracking-widest">Clinical Results</h3>
                </div>
                <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[10px] text-emerald-100">{patientName} — {patientNumber}</p>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ maxHeight: "calc(90vh - 160px)" }}>
              {/* Summary info */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 font-mono font-bold">{patientNumber}</span>
                <span className="text-slate-500 font-medium">{patientGender} · {patientAge} {patientAgeUnit === "months" ? "mo" : "yrs"}</span>
                <span className="text-slate-400">{dateLabel()}</span>
              </div>

              {/* Vitals */}
              {hasVitals && (
                <SectionCard icon={<HeartPulse size={13} />} title="Vital Signs" count="">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                    {vitals!.temperature !== null && <DataRow label="Temperature" value={`${vitals!.temperature} °C`} />}
                    {vitals!.bpSystolic !== null && <DataRow label="Blood Pressure" value={`${vitals!.bpSystolic}/${vitals!.bpDiastolic} mmHg`} />}
                    {vitals!.heartRate !== null && <DataRow label="Heart Rate" value={`${vitals!.heartRate} bpm`} />}
                    {vitals!.respiratoryRate !== null && <DataRow label="Resp. Rate" value={`${vitals!.respiratoryRate} /min`} />}
                    {vitals!.spo2 !== null && <DataRow label="SpO2" value={`${vitals!.spo2}%`} />}
                    {vitals!.weight !== null && <DataRow label="Weight" value={`${vitals!.weight} kg`} />}
                    {vitals!.height !== null && <DataRow label="Height" value={`${vitals!.height} cm`} />}
                    {vitals!.painLevel !== null && <DataRow label="Pain" value={`${vitals!.painLevel}/10${vitals!.painLocation ? ` (${vitals!.painLocation})` : ""}`} />}
                    {vitals!.allergies && <DataRow label="Allergies" value={vitals!.allergies} />}
                  </div>
                </SectionCard>
              )}

              {/* Lab Tests */}
              {hasLab && (
                <SectionCard icon={<FlaskConical size={13} />} title="Laboratory Results" count={`(${labTests!.length})`}>
                  <div className="space-y-3">
                    {labTests!.map((lab) => (
                      <div key={lab.id} className={`rounded-lg border p-3 ${lab.isCritical ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-slate-50/40"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-800">
                            {lab.testName}{lab.testPanel ? ` — ${lab.testPanel}` : ""}
                          </span>
                          {lab.isCritical && (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={9} /> Critical
                            </span>
                          )}
                        </div>
                        {lab.specimenId && <p className="text-[9px] text-slate-400 mb-1">Specimen: {lab.specimenId}{lab.specimenType ? ` (${lab.specimenType})` : ""}</p>}
                        <LabResultsView results={lab.results} />
                        {lab.criticalNote && <p className="text-[10px] text-red-600 mt-1 italic">{lab.criticalNote}</p>}
                        {lab.clinicalNotes && <p className="text-[9px] text-slate-500 mt-1">Notes: {lab.clinicalNotes}</p>}
                        <p className="text-[8px] text-slate-400 mt-1">
                          {lab.enteredByName && `Entered by ${lab.enteredByName}`}{lab.resultEnteredAt && ` on ${formatDateTime(lab.resultEnteredAt)}`}
                          {lab.validatedByName && ` · Validated by ${lab.validatedByName}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Imaging */}
              {hasImaging && (
                <SectionCard icon={<RadioTower size={13} />} title="Radiology / Sonography" count={`(${imaging!.length})`}>
                  <div className="space-y-3">
                    {imaging!.map((img) => (
                      <div key={img.id} className={`rounded-lg border p-3 ${img.isCritical ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-slate-50/40"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-800">{img.studyType}</span>
                          {img.isCritical && (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={9} /> Critical
                            </span>
                          )}
                        </div>
                        {img.impression && <p className="text-[10px] text-slate-500 mb-1 italic">{img.impression}</p>}
                        {img.findings && <p className="text-[10px] text-slate-700 mb-0.5"><strong>Findings:</strong> {img.findings}</p>}
                        {img.conclusion && <p className="text-[10px] text-slate-700 mb-0.5"><strong>Conclusion:</strong> {img.conclusion}</p>}
                        {img.radiologistNotes && <p className="text-[9px] text-slate-500 italic">{img.radiologistNotes}</p>}
                        {img.criticalNote && <p className="text-[10px] text-red-600 mt-1 italic">{img.criticalNote}</p>}
                        {img.reportedAt && <p className="text-[8px] text-slate-400 mt-1">Reported: {formatDateTime(img.reportedAt)}</p>}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Diagnosis */}
              {hasDiagnosis && (
                <SectionCard icon={<Stethoscope size={13} />} title="Doctor's Consultation" count="">
                  <div className="space-y-1.5 text-[11px]">
                    {diagnosis!.symptoms && <DetailRow label="Symptoms" value={diagnosis!.symptoms} />}
                    {diagnosis!.diagnosis && <DetailRow label="Diagnosis" value={diagnosis!.diagnosis} />}
                    {diagnosis!.assessment && <DetailRow label="Assessment" value={diagnosis!.assessment} />}
                    {diagnosis!.differentialDiagnosis && <DetailRow label="Differential" value={diagnosis!.differentialDiagnosis} />}
                    {diagnosis!.treatmentPlan && <DetailRow label="Treatment Plan" value={diagnosis!.treatmentPlan} />}
                    {diagnosis!.notes && <DetailRow label="Notes" value={diagnosis!.notes} />}
                    {diagnosis!.doctorName && (
                      <p className="text-[9px] text-slate-400 mt-2">Seen by {diagnosis!.doctorName} · {formatDateTime(diagnosis!.createdAt)}</p>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Doctor Review */}
              {hasReview && (
                <SectionCard icon={<Stethoscope size={13} />} title="Doctor's Review" count="">
                  <div className="space-y-1.5 text-[11px]">
                    {doctorReview!.examinationFindings && <DetailRow label="Exam Findings" value={doctorReview!.examinationFindings} />}
                    {doctorReview!.diagnosis && <DetailRow label="Diagnosis" value={doctorReview!.diagnosis} />}
                    {doctorReview!.treatmentPlan && <DetailRow label="Treatment Plan" value={doctorReview!.treatmentPlan} />}
                    {doctorReview!.followUpNotes && <DetailRow label="Follow-Up" value={doctorReview!.followUpNotes} />}
                    {doctorReview!.doctorName && (
                      <p className="text-[9px] text-slate-400 mt-2">Reviewed by {doctorReview!.doctorName} · {formatDateTime(doctorReview!.createdAt)}</p>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Prescriptions */}
              {hasRx && (
                <SectionCard icon={<Pill size={13} />} title="Prescriptions" count={`(${prescriptions!.length})`}>
                  <div className="space-y-2">
                    {prescriptions!.map((rx) => (
                      <div key={rx.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{rx.medication}</p>
                          <p className="text-[10px] text-slate-500">{rx.dosage} — {rx.instructions}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                          rx.status === "DISPENSED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {rx.status === "DISPENSED" ? "Dispensed" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Empty state if no results at all */}
              {!hasVitals && !hasLab && !hasImaging && !hasDiagnosis && !hasReview && !hasRx && (
                <div className="py-12 text-center">
                  <FileText size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No clinical results recorded</p>
                  <p className="text-xs text-slate-300 mt-1">Results from lab, radiology, and doctor consultations will appear here</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button onClick={handlePrint}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition">
                <Printer size={12} /> Print
              </button>
              <button onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#00703C] hover:bg-emerald-50 transition">
                <FileText size={12} /> Download
              </button>
              <button onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00703C] py-3 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-800 transition">
                <CheckCircle2 size={12} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for printing */}
      <iframe ref={iframeRef} style={{ position: "absolute", width: 0, height: 0, border: "none" }} title="results-print-frame" />
    </>
  );
}

// ─── Inline helpers ──────────────────────────────────────────────────────────────

function dateLabel() {
  return new Date().toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className="font-bold text-slate-700 truncate">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function SectionCard({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
        <span className="text-[#00703C]">{icon}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{title}</span>
        {count && <span className="text-[10px] font-bold text-slate-400">{count}</span>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LabResultsView({ results }: { results: string | null }) {
  if (!results) return <p className="text-[10px] text-slate-400">No detailed findings</p>;
  try {
    const parsed = JSON.parse(results);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cols = Object.keys(parsed[0]);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-slate-200">
                {cols.map((k) => (
                  <th key={k} className="text-left px-2 py-1 text-[9px] text-slate-500 font-semibold uppercase">{k.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.map((row: any, i: number) => {
                const isCritical = row.flag === "critical";
                const isAbnormal = row.flag === "high" || row.flag === "low";
                return (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${isCritical ? "bg-red-50/50" : isAbnormal ? "bg-orange-50/50" : ""}`}>
                    {cols.map((k) => {
                      const v = String(row[k] ?? "");
                      const highlight = k === "flag" && (v === "critical" || v === "high" || v === "low");
                      return (
                        <td key={k} className={`px-2 py-1 ${highlight ? (v === "critical" ? "text-red-600 font-bold" : "text-orange-600 font-bold") : "text-slate-700"}`}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    if (typeof parsed === "object" && parsed !== null) {
      return (
        <div className="space-y-0.5">
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-[10px]">
              <span className="font-semibold text-slate-500 min-w-[100px]">{k.replace(/_/g, " ")}</span>
              <span className="text-slate-700">{String(v ?? "")}</span>
            </div>
          ))}
        </div>
      );
    }
  } catch {}
  return <p className="text-[10px] text-slate-700 whitespace-pre-wrap">{results}</p>;
}
