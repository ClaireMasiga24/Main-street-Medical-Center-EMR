"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical, Search, RefreshCw, LogOut, User, Phone,
  ArrowRight, CheckCircle, XCircle, Save, FileText,
  Microscope, TestTube, Droplets, Syringe, Beaker,
  Activity, AlertCircle, Plus, Minus, Trash2,
  Calendar, ClipboardList, Heart, Send,
  Stethoscope, Building2, Timer, Users,
  Bone, ExternalLink, ChevronLeft, ChevronRight,
  FlaskRound, BadgeCheck, Sigma, Menu, X, Home,
  Archive, Ban, MessageSquareText, Eye, Filter,
  Share2, Printer,
} from "lucide-react";
import StaffMessaging from "../components/StaffMessaging";

// ─── Colors ──────────────────────────────────────────────────────────────
const BRAND = "#00703C";
const BRAND_LIGHT = "#e8f5e9";
const BRAND_DARK = "#004d2b";

// ─── Test Panels ─────────────────────────────────────────────────────────
interface PanelRow { test: string; unit: string; range: string; }

const PANELS: Record<string, { label: string; rows: PanelRow[] }> = {
  CBC: {
    label: "Complete Blood Count (CBC)",
    rows: [
      { test: "White Blood Cell (WBC)", unit: "x10³/µL", range: "4.0-11.0" },
      { test: "Red Blood Cell (RBC)", unit: "x10⁶/µL", range: "4.5-5.5" },
      { test: "Hemoglobin (HGB)", unit: "g/dL", range: "12.0-16.0" },
      { test: "Hematocrit (HCT)", unit: "%", range: "36-46" },
      { test: "Mean Corpuscular Volume (MCV)", unit: "fL", range: "80-100" },
      { test: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", range: "27-32" },
      { test: "Mean Corpuscular HGB Conc. (MCHC)", unit: "g/dL", range: "32-36" },
      { test: "Red Cell Distribution Width (RDW)", unit: "%", range: "11.5-14.5" },
      { test: "Platelet Count (PLT)", unit: "x10³/µL", range: "150-450" },
      { test: "Neutrophils", unit: "%", range: "40-60" },
      { test: "Lymphocytes", unit: "%", range: "20-40" },
      { test: "Monocytes", unit: "%", range: "2-8" },
      { test: "Eosinophils", unit: "%", range: "1-4" },
      { test: "Basophils", unit: "%", range: "0-1" },
    ],
  },
  URINALYSIS: {
    label: "Urinalysis",
    rows: [
      { test: "Color", unit: "", range: "Yellow" },
      { test: "Appearance", unit: "", range: "Clear" },
      { test: "Specific Gravity", unit: "", range: "1.005-1.030" },
      { test: "pH", unit: "", range: "4.5-8.0" },
      { test: "Glucose", unit: "mg/dL", range: "Negative" },
      { test: "Protein", unit: "mg/dL", range: "Negative" },
      { test: "Blood", unit: "", range: "Negative" },
      { test: "Ketones", unit: "mg/dL", range: "Negative" },
      { test: "Bilirubin", unit: "", range: "Negative" },
      { test: "Urobilinogen", unit: "mg/dL", range: "0.1-1.0" },
      { test: "Nitrite", unit: "", range: "Negative" },
      { test: "Leukocytes", unit: "", range: "Negative" },
    ],
  },
  URINALYSIS_MICROSCOPY: {
    label: "Urinalysis - Microscopy",
    rows: [
      { test: "Red Blood Cells", unit: "/HPF", range: "0-2" },
      { test: "White Blood Cells", unit: "/HPF", range: "0-5" },
      { test: "Epithelial Cells", unit: "/HPF", range: "Few" },
      { test: "Casts", unit: "/LPF", range: "0-0" },
      { test: "Crystals", unit: "", range: "None" },
      { test: "Bacteria", unit: "", range: "None" },
      { test: "Yeast Cells", unit: "", range: "None" },
      { test: "Trichomonas", unit: "", range: "None" },
    ],
  },
  LFT: {
    label: "Liver Function Test (LFT)",
    rows: [
      { test: "Total Protein", unit: "g/dL", range: "6.0-8.3" },
      { test: "Albumin", unit: "g/dL", range: "3.5-5.0" },
      { test: "Total Bilirubin", unit: "mg/dL", range: "0.1-1.2" },
      { test: "Direct Bilirubin", unit: "mg/dL", range: "0.0-0.3" },
      { test: "Indirect Bilirubin", unit: "mg/dL", range: "0.1-0.9" },
      { test: "ALT (SGPT)", unit: "U/L", range: "7-56" },
      { test: "AST (SGOT)", unit: "U/L", range: "5-40" },
      { test: "Alkaline Phosphatase (ALP)", unit: "U/L", range: "44-147" },
      { test: "Gamma-GT (GGT)", unit: "U/L", range: "9-48" },
    ],
  },
  RFT: {
    label: "Renal Function Test (RFT)",
    rows: [
      { test: "Creatinine", unit: "mg/dL", range: "0.6-1.2" },
      { test: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", range: "7-20" },
      { test: "Urea", unit: "mg/dL", range: "15-43" },
      { test: "Sodium (Na)", unit: "mEq/L", range: "136-145" },
      { test: "Potassium (K)", unit: "mEq/L", range: "3.5-5.1" },
      { test: "Chloride (Cl)", unit: "mEq/L", range: "98-106" },
      { test: "Bicarbonate (HCO3)", unit: "mEq/L", range: "22-29" },
      { test: "Calcium (Ca)", unit: "mg/dL", range: "8.5-10.5" },
    ],
  },
  LIPID: {
    label: "Lipid Profile",
    rows: [
      { test: "Total Cholesterol", unit: "mg/dL", range: "<200" },
      { test: "LDL Cholesterol", unit: "mg/dL", range: "<100" },
      { test: "HDL Cholesterol", unit: "mg/dL", range: "40-60" },
      { test: "Triglycerides", unit: "mg/dL", range: "<150" },
      { test: "VLDL", unit: "mg/dL", range: "5-40" },
    ],
  },
  GLUCOSE: {
    label: "Blood Glucose",
    rows: [
      { test: "Glucose (Fasting)", unit: "mg/dL", range: "70-110" },
      { test: "Glucose (Random)", unit: "mg/dL", range: "<140" },
      { test: "HbA1c", unit: "%", range: "4.0-5.6" },
    ],
  },
  COAGULATION: {
    label: "Coagulation Profile",
    rows: [
      { test: "Prothrombin Time (PT)", unit: "sec", range: "11-13.5" },
      { test: "INR", unit: "", range: "0.8-1.2" },
      { test: "APTT", unit: "sec", range: "25-35" },
      { test: "Fibrinogen", unit: "mg/dL", range: "200-400" },
    ],
  },
  ELECTROLYTES: {
    label: "Electrolytes Panel",
    rows: [
      { test: "Sodium (Na)", unit: "mEq/L", range: "136-145" },
      { test: "Potassium (K)", unit: "mEq/L", range: "3.5-5.1" },
      { test: "Chloride (Cl)", unit: "mEq/L", range: "98-106" },
      { test: "Bicarbonate (HCO3)", unit: "mEq/L", range: "22-29" },
      { test: "Anion Gap", unit: "mEq/L", range: "8-12" },
    ],
  },
  MALARIA: {
    label: "Malaria",
    rows: [
      { test: "Malaria RDT", unit: "", range: "Negative" },
      { test: "Plasmodium Species", unit: "", range: "None seen" },
      { test: "Parasite Density", unit: "/µL", range: "Negative" },
    ],
  },
};

const SPECIMEN_TYPES = ["BLOOD", "URINE", "STOOL", "CSF", "SWAB", "SPUTUM", "TISSUE", "SERUM", "PLASMA", "OTHER"];
const NOTIFICATION_METHODS = ["Phone", "In Person", "Email"];
const PRIORITY_ORDER: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };

// ─── Role → Department mapping for SHARE_RESULT ──────────────────────────
// These targetDept strings match what the dashboards listen for
const SHARE_TARGETS = [
  { role: "DOCTOR", dept: "Doctor", label: "Doctor", icon: Stethoscope, desc: "Send results to Doctor's inbox" },
  { role: "NURSE_MIDWIFE", dept: "Nurse/Midwife", label: "Nurse / Midwife", icon: Heart, desc: "Send results to Nursing dashboard" },
  { role: "RECEPTIONIST", dept: "Reception", label: "Receptionist", icon: Users, desc: "Send results to Reception" },
  { role: "RADIOLOGIST_SONOGRAPHER", dept: "Radiology", label: "Radiologist / Sonographer", icon: Bone, desc: "Send results to Radiology" },
] as const;

function detectPanel(testName: string): string {
  const n = testName.toLowerCase();
  if (n.includes("cbc") || n.includes("complete blood")) return "CBC";
  if (n.includes("urinalysis") || n.includes("urine") || n.includes("ua")) return "URINALYSIS";
  if (n.includes("liver") || n.includes("lft")) return "LFT";
  if (n.includes("renal") || n.includes("rft") || n.includes("kidney")) return "RFT";
  if (n.includes("lipid") || n.includes("cholesterol")) return "LIPID";
  if (n.includes("glucose") || n.includes("hba1c") || n.includes("sugar")) return "GLUCOSE";
  if (n.includes("coagulation") || n.includes("inr") || n.includes("pt/")) return "COAGULATION";
  if (n.includes("electrolyte") || n.includes("lytes")) return "ELECTROLYTES";
  if (n.includes("malaria") || n.includes("rdt") || n.includes("blood film")) return "MALARIA";
  return "CBC";
}

function computeFlag(value: string, range: string): "" | "HIGH" | "LOW" | "NORMAL" {
  if (!value || !value.trim()) return "";
  const v = parseFloat(value);
  if (isNaN(v)) return "NORMAL";
  const ltMatch = range.match(/^<(\d+\.?\d*)$/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (v > max) return "HIGH";
    return "NORMAL";
  }
  const gtMatch = range.match(/^>(\d+\.?\d*)$/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (v < min) return "LOW";
    return "NORMAL";
  }
  const rangeMatch = range.match(/^(\d+\.?\d*)\s*[–-]\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (v < low) return "LOW";
    if (v > high) return "HIGH";
    return "NORMAL";
  }
  const lowValues = ["negative", "none", "nil", "absent", "few"];
  const entered = value.trim().toLowerCase();
  if (lowValues.includes(entered) || lowValues.includes(range.toLowerCase())) {
    return !lowValues.includes(entered) ? "HIGH" : "NORMAL";
  }
  return "NORMAL";
}

function getFlagColor(flag: string): string {
  switch (flag) {
    case "HIGH": return "text-red-600 bg-red-50 border-red-200";
    case "LOW": return "text-amber-600 bg-amber-50 border-amber-200";
    case "NORMAL": return "text-green-700 bg-green-50 border-green-200";
    default: return "text-gray-400";
  }
}

const formatDate = (iso: string) => {
  if (!iso) return "\u2014";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

const formatShortDate = (iso: string) => {
  if (!iso) return "\u2014";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const timeElapsed = (iso: string) => {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return formatShortDate(iso);
  } catch { return ""; }
};

// ─── Print Report HTML Generator ───────────────────────────────────────
function generateLabReportHTML(
  patientName: string,
  patientNumber: string,
  gender: string,
  age: number,
  testName: string,
  specimenType: string | null,
  specimenId: string | null,
  specimenCollectedAt: string | null,
  requestedBy: string,
  results: ResultEntry[],
  enteredByName: string | null,
  validatedByName: string | null,
) {
  const now = new Date().toLocaleString("en-UG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const cols = specimenCollectedAt ? new Date(specimenCollectedAt).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
  const colTime = specimenCollectedAt ? new Date(specimenCollectedAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" }) : "\u2014";

  const rowsHtml = results.map((r, i) => {
    let flagColor = "";
    let flagBg = "";
    if (r.flag === "HIGH") { flagColor = "color:#dc2626;font-weight:700;"; flagBg = "background:#fef2f2;"; }
    else if (r.flag === "LOW") { flagColor = "color:#d97706;font-weight:700;"; flagBg = "background:#fffbeb;"; }
    else if (r.flag === "NORMAL") { flagColor = "color:#16a34a;"; }
    const flagDisplay = r.result.trim() ? r.flag : "";
    return `<tr style="${flagBg}border-bottom:1px solid #e5e7eb;">
      <td style="padding:6px 8px;font-size:11px;color:#374151;">${i + 1}</td>
      <td style="padding:6px 8px;font-size:11px;color:#111827;font-weight:500;">${r.test}</td>
      <td style="padding:6px 8px;font-size:11px;color:#111827;font-weight:600;text-align:center;">${r.result || "\u2014"}</td>
      <td style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:center;">${r.unit}</td>
      <td style="padding:6px 8px;font-size:10px;color:#6b7280;font-family:monospace;text-align:center;">${r.referenceRange}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;${flagColor}">${flagDisplay}</td>
    </tr>`;
  }).join("");

  // Find flagged rows for interpretation
  const flagged = results.filter(r => r.flag === "HIGH" || r.flag === "LOW");
  const interpretationHtml = flagged.length > 0
    ? `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;color:#111827;margin:0 0 4px 0;">Remarks / Interpretation:</p>
        <p style="font-size:11px;color:#374151;margin:0;line-height:1.5;">
          Abnormal results detected: ${flagged.map(r => `${r.test} (${r.result}, ${r.flag})`).join("; ")}.
          Clinical correlation advised.
        </p>
       </div>`
    : `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;color:#111827;margin:0 0 4px 0;">Remarks / Interpretation:</p>
        <p style="font-size:11px;color:#6b7280;margin:0;font-style:italic;">No remarks.</p>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report - ${patientName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: url('/Images/LOGO.jpg') center / 50% no-repeat;
    opacity: 0.07;
    pointer-events: none;
    z-index: -1;
  }
  .watermark-fixed {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 60%;
    opacity: 0.07;
    z-index: -1;
    pointer-events: none;
  }
  @page { size: A4; margin: 15mm; }
  @media print {
    body { margin:0; padding:0; }
    .screen-only { display:none !important; }
    .report-content { display:block !important; }
  }
  @media screen {
    .report-content { display:none; }
  }
</style>
</head>
<body>
  <img src="/Images/LOGO.jpg" alt="" class="watermark-fixed" />
  <div class="screen-only" style="text-align:center;padding:40px 20px;">
    <button onclick="window.print()" style="background:#00703C;color:#fff;border:none;padding:12px 32px;font-size:16px;font-weight:600;border-radius:8px;cursor:pointer;">Click here to print</button>
    <p style="margin-top:12px;font-size:13px;color:#6b7280;">If the print dialog does not open automatically, click the button above.</p>
  </div>
  <div class="report-content">
    <!-- Facility header -->
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:20px;font-weight:800;color:#00703C;letter-spacing:1px;margin:0;">MAIN STREET MEDICAL CENTER</h1>
      <p style="font-size:11px;color:#4b5563;margin:2px 0 0 0;">P.O BOX 154293, Seeta, Uganda</p>
      <p style="font-size:10px;color:#9ca3af;margin:2px 0 0 0;">Laboratory Report</p>
    </div>
    <hr style="border:none;border-top:2px solid #00703C;margin-bottom:16px;" />
    <!-- Patient details -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="width:50%;padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Patient Name:</span><br/>
          <span style="color:#111827;font-weight:500;">${patientName}</span>
        </td>
        <td style="width:50%;padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Lab ID:</span><br/>
          <span style="color:#111827;font-weight:500;">${specimenId || "\u2014"}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Gender / Age:</span><br/>
          <span style="color:#111827;font-weight:500;">${gender} / ${age} years</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Specimen Type:</span><br/>
          <span style="color:#111827;font-weight:500;">${specimenType || "\u2014"}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Date of Collection:</span><br/>
          <span style="color:#111827;font-weight:500;">${cols}</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Time:</span><br/>
          <span style="color:#111827;font-weight:500;">${colTime}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Requested By:</span><br/>
          <span style="color:#111827;font-weight:500;">${requestedBy}</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Test:</span><br/>
          <span style="color:#111827;font-weight:500;">${testName}</span>
        </td>
      </tr>
    </table>
    <!-- Results table -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;">
      <thead>
        <tr style="background:#00703C;color:#fff;">
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px;">#</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px;">Parameter</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Result</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Units</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Reference Range</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Flag</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    ${interpretationHtml}
    <hr style="border:none;border-top:1px solid #d1d5db;margin:24px 0 16px 0;" />
    <!-- Signature lines -->
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding:4px 8px;vertical-align:top;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;margin:0 0 2px 0;">Lab Technician</p>
          <p style="font-size:11px;color:#111827;font-weight:500;margin:0;border-bottom:1px solid #374151;display:inline-block;min-width:180px;padding-bottom:4px;">${enteredByName || "\u2014"}</p>
          <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">Signature</p>
        </td>
        <td style="width:50%;padding:4px 8px;vertical-align:top;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;margin:0 0 2px 0;">Authorized By</p>
          <p style="font-size:11px;color:#111827;font-weight:500;margin:0;border-bottom:1px solid #374151;display:inline-block;min-width:180px;padding-bottom:4px;">${validatedByName || "\u2014"}</p>
          <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">Signature</p>
        </td>
      </tr>
    </table>
    <p style="font-size:8px;color:#9ca3af;text-align:center;margin-top:16px;">Printed: ${now} &bull; Main Street Medical Center Laboratory</p>
  </div>
  <script>
    (function(){ try { setTimeout(function(){ window.print(); }, 500); } catch(e) {} })();
  </script>
</body>
</html>`;
}

// ─── Types ───────────────────────────────────────────────────────────────
interface LabRequestItem {
  id: number; patientId: number; patientNumber: string; firstName: string; lastName: string;
  age: number; gender: string; isEmergency: boolean;
  testName: string; testPanel: string | null;
  priority: string; referralSource: string | null;
  referralNotes: string | null; clinicalNotes: string | null;
  requestedBy: string; requestedDepartment: string;
  specimenType: string | null; specimenId: string | null;
  specimenCollectedAt: string | null; collectedByName: string | null;
  specimenRejected: boolean; rejectionReason: string | null;
  rejectionCategory: string | null; rejectedAt: string | null; rejectedBy: string | null;
  processingStartedAt: string | null; processingStartedBy: string | null;
  results: string | null; resultEnteredAt: string | null;
  enteredByName: string | null; validatedByName: string | null;
  validatedAt: string | null; isCritical: boolean; criticalNote: string | null;
  analyzerType: string | null; analyzerModel: string | null;
  analyzerImportStatus: string | null;
  chainOfCustody: string | null; attachments: string | null;
  status: string; createdAt: string; updatedAt: string;
}

interface ResultEntry { test: string; unit: string; referenceRange: string; result: string; flag: string; }

// ─── Main Component ──────────────────────────────────────────────────────
export default function LaboratoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [allRequests, setAllRequests] = useState<LabRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar + Navigation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<"queue" | "records" | "completed" | "rejected" | "messages">("queue");

  // Queue view
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<"ALL" | "PENDING" | "URGENT">("PENDING");

  // Lab Records view
  const [recordsFilter, setRecordsFilter] = useState("ALL");
  const [recordsSearch, setRecordsSearch] = useState("");

  // Workflow state
  const [selectedRequest, setSelectedRequest] = useState<LabRequestItem | null>(null);
  const [workflowStep, setWorkflowStep] = useState(0);

  // Step 1: Sample collection
  const [specimenType, setSpecimenType] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [savingSpecimen, setSavingSpecimen] = useState(false);

  // Step 2: Results
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [urinalysisTab, setUrinalysisTab] = useState<"dipstick" | "microscopy">("dipstick");
  const [savingResults, setSavingResults] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);

  // Step 3: Share results — multi-select roles
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [sendingResults, setSendingResults] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Critical notification
  const [critNotifiedPerson, setCritNotifiedPerson] = useState("");
  const [critNotificationMethod, setCritNotificationMethod] = useState("");
  const [savingCritical, setSavingCritical] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }
    const parsed = JSON.parse(storedUser);
    if (!["LAB_TECHNICIAN", "ADMINISTRATOR"].includes(parsed.role)) { router.push("/"); return; }
    setUser(parsed);
    setIsAuthed(true);
  }, [router]);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/laboratory");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.success) setAllRequests(data.requests);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    fetchRequests();
    const interval = setInterval(fetchRequests, 60_000);
    return () => clearInterval(interval);
  }, [fetchRequests, isAuthed]);

  // ── API helper ────────────────────────────────────────────────────────
  const callLabApi = async (action: string, payload: any) => {
    const res = await fetch("/api/laboratory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
    return res.json();
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user?.id, username: user?.username }) }); } catch {}
    localStorage.removeItem("user"); sessionStorage.removeItem("user"); router.push("/");
  };

  // ── Derived data ──────────────────────────────────────────────────────
  const completedRequests = useMemo(() =>
    allRequests.filter(r => r.status === "COMPLETED" && !r.specimenRejected),
  [allRequests]);

  const pendingRequests = useMemo(() =>
    allRequests.filter(r =>
      (r.status === "PENDING" || r.status === "SPECIMEN_COLLECTED" || r.status === "PROCESSING" || r.status === "AWAITING_VALIDATION") &&
      !r.specimenRejected
    ),
  [allRequests]);

  const rejectedRequests = useMemo(() =>
    allRequests.filter(r => r.specimenRejected),
  [allRequests]);

  // ── Queue ─────────────────────────────────────────────────────────────
  const queueItems = useMemo(() => {
    // Main queue: lab tech's active work — pending, collected, processing, awaiting validation
    let items = [...pendingRequests];
    if (viewFilter === "ALL") items = [...pendingRequests, ...completedRequests];
    if (viewFilter === "URGENT") items = items.filter(r => r.priority === "URGENT" || r.priority === "STAT");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.patientNumber?.toLowerCase().includes(q) ||
        r.testName?.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return items;
  }, [completedRequests, pendingRequests, viewFilter, searchQuery]);

  // ── Lab Records ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let items = [...allRequests];
    if (recordsFilter === "COMPLETED") items = items.filter(r => r.status === "COMPLETED");
    else if (recordsFilter === "PENDING") items = items.filter(r => r.status === "PENDING" || r.status === "SPECIMEN_COLLECTED" || r.status === "PROCESSING" || r.status === "AWAITING_VALIDATION");
    else if (recordsFilter === "REJECTED") items = items.filter(r => r.specimenRejected);
    else if (recordsFilter === "CRITICAL") items = items.filter(r => r.isCritical);
    if (recordsSearch) {
      const q = recordsSearch.toLowerCase();
      items = items.filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.patientNumber?.toLowerCase().includes(q) ||
        r.testName?.toLowerCase().includes(q) ||
        r.specimenId?.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [allRequests, recordsFilter, recordsSearch]);

  // ── Open patient workflow ─────────────────────────────────────────────
  const openWorkflow = (req: LabRequestItem) => {
    setSelectedRequest(req);
    setWorkflowStep(1);
    setSpecimenType(req.specimenType || "");
    setCollectorName(req.collectedByName || user?.fullName || "");
    setResultsSaved(false);
    setSentSuccess(false);
    setSelectedDepts([]);
    setCritNotifiedPerson("");
    setCritNotificationMethod("");

    if (req.results) {
      try {
        const parsed = JSON.parse(req.results);
        if (Array.isArray(parsed)) {
          setResults(parsed);
          setResultsSaved(true);
          if (req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED") {
            setWorkflowStep(3);
            return;
          }
          setWorkflowStep(2);
          return;
        }
      } catch {}
    }
    setResults(getDefaultResults(req));
  };

  const closeWorkflow = () => {
    setSelectedRequest(null);
    setWorkflowStep(0);
    setResults([]);
    setResultsSaved(false);
    setSentSuccess(false);
    setSpecimenType("");
    setCollectorName("");
    setSelectedDepts([]);
    setCritNotifiedPerson("");
    setCritNotificationMethod("");
  };

  // ── Default Results ───────────────────────────────────────────────────
  const getDefaultResults = (req: LabRequestItem): ResultEntry[] => {
    const panelKey = detectPanel(req.testName);
    const panel = PANELS[panelKey];
    if (!panel) return [];
    const rows: ResultEntry[] = panel.rows.map(r => ({
      test: r.test, unit: r.unit, referenceRange: r.range, result: "", flag: "",
    }));
    if (panelKey === "URINALYSIS") {
      const micro = PANELS["URINALYSIS_MICROSCOPY"];
      if (micro) {
        micro.rows.forEach(r => {
          rows.push({ test: r.test, unit: r.unit, referenceRange: r.range, result: "", flag: "" });
        });
      }
    }
    return rows;
  };

  // ── Step 1: Save Specimen ─────────────────────────────────────────────
  const handleSaveSpecimen = async () => {
    if (!selectedRequest || !specimenType) return;
    setSavingSpecimen(true);
    try {
      await callLabApi("RECORD_SPECIMEN", {
        id: selectedRequest.id,
        specimenType,
        collectedByName: collectorName || user?.fullName || "Lab Technician",
      });
      await fetchRequests();
      setWorkflowStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSpecimen(false);
    }
  };

  // ── Step 2: Handle result change ──────────────────────────────────────
  const handleResultChange = (index: number, value: string) => {
    setResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], result: value, flag: computeFlag(value, next[index].referenceRange) };
      return next;
    });
  };

  const handleSaveResults = async () => {
    if (!selectedRequest) return;
    setSavingResults(true);
    try {
      const hasAnyResult = results.some(r => r.result.trim() !== "");
      if (!hasAnyResult) { alert("Enter at least one result value."); setSavingResults(false); return; }

      const criticalFlags = results.filter(r => r.flag === "HIGH" || r.flag === "LOW");
      const isCrit = criticalFlags.length > 0;

      await callLabApi("ENTER_RESULTS", {
        id: selectedRequest.id,
        results,
        enteredByName: user?.fullName || "Lab Technician",
        isCritical: isCrit,
        criticalNote: isCrit ? `Abnormal results: ${criticalFlags.map(r => r.test).join(", ")}` : null,
      });
      await fetchRequests();
      setResultsSaved(true);
      setWorkflowStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingResults(false);
    }
  };

  // ── Step 3: Share Results ─────────────────────────────────────────────
  const toggleDept = (dept: string) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleSendResults = async () => {
    if (!selectedRequest || selectedDepts.length === 0) { alert("Select at least one recipient."); return; }
    setSendingResults(true);
    try {
      const alreadyCompleted = selectedRequest.status === "COMPLETED";
      if (!alreadyCompleted) {
        await callLabApi("VALIDATE_RESULTS", {
          id: selectedRequest.id,
          validatedByName: user?.fullName || "Lab Technician",
        });
      }

      // Share to each selected department
      for (const dept of selectedDepts) {
        await callLabApi("SHARE_RESULT", {
          labRequestId: selectedRequest.id,
          patientId: selectedRequest.patientId,
          sharedById: user?.id || 1,
          sharedByName: user?.fullName || "Lab Technician",
          targetDept: dept,
          includeReport: true,
          note: `Lab results shared from Laboratory to ${dept}`,
        });
      }

      await fetchRequests();
      setSentSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingResults(false);
    }
  };

  // ── Critical Notification ─────────────────────────────────────────────
  const handleSaveCriticalNotification = async () => {
    if (!selectedRequest || !critNotifiedPerson || !critNotificationMethod) {
      alert("Enter who was notified and the notification method.");
      return;
    }
    setSavingCritical(true);
    try {
      await callLabApi("RECORD_CRITICAL_NOTIFICATION", {
        labRequestId: selectedRequest.id,
        patientId: selectedRequest.patientId,
        notifiedPerson: critNotifiedPerson,
        notifiedDept: selectedDepts.length > 0 ? selectedDepts.join(",") : "GENERAL",
        notificationMethod: critNotificationMethod,
      });
      await fetchRequests();
      alert("Critical notification recorded.");
      setCritNotifiedPerson("");
      setCritNotificationMethod("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingCritical(false);
    }
  };

  const specimenAlreadyCollected = selectedRequest?.specimenType && selectedRequest?.specimenCollectedAt;

  // ── Print Report ────────────────────────────────────────────────────
  const openPrintWindow = (req: LabRequestItem) => {
    let parsedResults: ResultEntry[] = [];
    if (req.results) {
      try {
        const p = JSON.parse(req.results);
        if (Array.isArray(p)) parsedResults = p;
      } catch {}
    }
    if (parsedResults.length === 0) {
      parsedResults = getDefaultResults(req);
    }
    const html = generateLabReportHTML(
      `${req.lastName}, ${req.firstName}`,
      req.patientNumber,
      req.gender,
      req.age,
      req.testName,
      req.specimenType,
      req.specimenId,
      req.specimenCollectedAt,
      req.requestedBy,
      parsedResults,
      req.enteredByName,
      req.validatedByName,
    );
    const w = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      alert("Popup blocked. Please allow popups for this site to print reports.");
    }
  };

  if (!isAuthed) return null;

  // ── Sidebar navigation items ──────────────────────────────────────────
  const NavItem = ({ id, label, icon: Icon, count }: { id: typeof activeView; label: string; icon: any; count?: number }) => (
    <button
      onClick={() => { setActiveView(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeView === id
          ? "text-white shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
      style={activeView === id ? { backgroundColor: "rgba(255,255,255,0.2)" } : {}}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
          activeView === id ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  // ── Render: Loading state ─────────────────────────────────────────────
  if (!isAuthed) return null;

  // ── Render: Workflow view ─────────────────────────────────────────────
  if (selectedRequest && workflowStep > 0) {
    const panelKey = detectPanel(selectedRequest.testName);
    const panel = PANELS[panelKey];
    const isUrinalysis = panelKey === "URINALYSIS";
    const dipstickResults = isUrinalysis ? results.slice(0, 12) : [];
    const microscopyResults = isUrinalysis ? results.slice(12) : [];

    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa" }}>
        {/* Workflow Header */}
        <header className="border-b" style={{ backgroundColor: BRAND, borderColor: BRAND_DARK }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={closeWorkflow}
              className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Queue</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold text-sm">
                  {selectedRequest.lastName}, {selectedRequest.firstName}
                </p>
                <p className="text-white/70 text-xs">
                  {selectedRequest.patientNumber} | {selectedRequest.gender} / {selectedRequest.age}y | {selectedRequest.testName}
                </p>
              </div>
              {(selectedRequest.priority === "URGENT" || selectedRequest.priority === "STAT") && (
                <span className="bg-white text-red-700 text-xs font-bold px-2.5 py-1 rounded">
                  {selectedRequest.priority}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center gap-0">
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      workflowStep >= step ? "text-white shadow-md" : "bg-gray-200 text-gray-400"
                    }`}
                    style={workflowStep >= step ? { backgroundColor: BRAND } : {}}
                  >
                    {workflowStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  <span className={`text-xs font-medium ${workflowStep >= step ? "text-gray-800" : "text-gray-400"}`}>
                    {step === 1 ? "Sample Collected" : step === 2 ? "Enter Results" : "Share Results"}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${workflowStep > step ? "" : "bg-gray-200"}`}
                    style={workflowStep > step ? { backgroundColor: BRAND } : {}}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Workflow Content */}
        <div className="max-w-4xl mx-auto px-4 pb-8">
          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {workflowStep === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                  <Droplets className="w-5 h-5" style={{ color: BRAND }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Step 1: Sample Collection</h2>
                  <p className="text-xs text-gray-500">Record the specimen details for this request</p>
                </div>
              </div>
              {specimenAlreadyCollected ? (
                <div className="p-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Sample already collected</p>
                      <p className="text-sm text-green-600">
                        Type: <strong>{selectedRequest.specimenType}</strong>
                        {selectedRequest.specimenId && <> | ID: <strong>{selectedRequest.specimenId}</strong></>}
                        {selectedRequest.collectedByName && <> | By: <strong>{selectedRequest.collectedByName}</strong></>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWorkflowStep(2)}
                    className="mt-4 w-full py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: BRAND }}
                  >
                    Continue to Step 2
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Specimen Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={specimenType}
                      onChange={e => setSpecimenType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      style={{ borderColor: specimenType ? BRAND : "#d1d5db" }}
                    >
                      <option value="">Select specimen type...</option>
                      {SPECIMEN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Collected By</label>
                    <input
                      type="text"
                      value={collectorName}
                      onChange={e => setCollectorName(e.target.value)}
                      placeholder="Technician name"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveSpecimen}
                    disabled={savingSpecimen || !specimenType}
                    className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: BRAND }}
                  >
                    {savingSpecimen ? "Saving..." : <><Save className="w-4 h-4" /> Record Specimen & Continue</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {workflowStep === 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                  <Microscope className="w-5 h-5" style={{ color: BRAND }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Step 2: Enter Results</h2>
                  <p className="text-xs text-gray-500">Test: {selectedRequest.testName} | {panel?.label}</p>
                </div>
                {resultsSaved && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Results Saved
                  </span>
                )}
              </div>
              <div className="p-6">
                {isUrinalysis && (
                  <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: "#f0f0f0" }}>
                    <button
                      onClick={() => setUrinalysisTab("dipstick")}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        urinalysisTab === "dipstick" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Dipstick ({dipstickResults.length})
                    </button>
                    <button
                      onClick={() => setUrinalysisTab("microscopy")}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        urinalysisTab === "microscopy" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Microscopy ({microscopyResults.length})
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2" style={{ borderColor: BRAND }}>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">#</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Parameter</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Result</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Unit</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Reference Range</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isUrinalysis && urinalysisTab === "dipstick" ? dipstickResults :
                        isUrinalysis && urinalysisTab === "microscopy" ? microscopyResults : results
                      ).map((row, idx) => {
                        const actualIdx = isUrinalysis && urinalysisTab === "microscopy" ? idx + 12 : idx;
                        const flagColor = getFlagColor(row.flag);
                        return (
                          <tr key={actualIdx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-2 text-gray-400 text-xs">{actualIdx + 1}</td>
                            <td className="py-2 px-2 font-medium text-gray-700">{row.test}</td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.result}
                                onChange={e => handleResultChange(actualIdx, e.target.value)}
                                placeholder="Enter value..."
                                className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:ring-2 focus:outline-none ${
                                  row.flag === "HIGH" || row.flag === "LOW"
                                    ? "border-red-300 bg-red-50 focus:ring-red-200"
                                    : row.flag === "NORMAL"
                                    ? "border-green-300 bg-green-50 focus:ring-green-200"
                                    : "border-gray-200 focus:ring-blue-200"
                                }`}
                              />
                            </td>
                            <td className="py-2 px-2 text-gray-500 text-xs">{row.unit}</td>
                            <td className="py-2 px-2 text-gray-500 text-xs font-mono">{row.referenceRange}</td>
                            <td className="py-2 px-2 text-center">
                              {row.flag && (
                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${flagColor}`}>
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
                {results.some(r => r.flag === "HIGH" || r.flag === "LOW") && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Abnormal Results Detected</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          {results.filter(r => r.flag === "HIGH" || r.flag === "LOW").map(r => `${r.test} (${r.flag})`).join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSaveResults}
                  disabled={savingResults}
                  className="w-full mt-6 py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  style={{ backgroundColor: BRAND }}
                >
                  {savingResults ? "Saving Results..." : <><Save className="w-4 h-4" /> Save Results & Continue</>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────── */}
          {workflowStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                    <Share2 className="w-5 h-5" style={{ color: BRAND }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Step 3: Share Results</h2>
                    <p className="text-xs text-gray-500">Send results to one or more recipient roles</p>
                  </div>
                  {sentSuccess && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent
                    </span>
                  )}
                </div>
                <div className="p-6">
                  {/* Results summary */}
                  {selectedRequest.results && (() => {
                    try {
                      const res = JSON.parse(selectedRequest.results);
                      if (!Array.isArray(res)) return null;
                      const flagged = res.filter((r: any) => r.flag === "HIGH" || r.flag === "LOW");
                      const normal = res.filter((r: any) => r.flag === "NORMAL");
                      return (
                        <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">Results Summary</p>
                          <div className="flex flex-wrap gap-2">
                            {flagged.map((r: any, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                                {r.test}: {r.result} ({r.flag})
                              </span>
                            ))}
                            {normal.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                                {normal.length} normal parameters
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Role-based recipient grid — 2x2 large tappable cards */}
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Recipients <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {SHARE_TARGETS.map(({ role, dept, label, icon: Icon, desc }) => {
                      const isSelected = selectedDepts.includes(dept);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleDept(dept)}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                            isSelected
                              ? "border-green-600 bg-green-50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          style={{ minHeight: "72px" }}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            isSelected ? "bg-green-100" : "bg-gray-100"
                          }`}>
                            <Icon className={`w-7 h-7 ${isSelected ? "text-green-700" : "text-gray-400"}`} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold ${isSelected ? "text-green-800" : "text-gray-700"}`}>
                              {label}
                            </span>
                            {isSelected && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {sentSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Results shared successfully</p>
                        <p className="text-sm text-green-600">
                          Sent to: {selectedDepts.join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => selectedRequest && openPrintWindow(selectedRequest)}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90 flex items-center gap-1.5"
                        style={{ backgroundColor: BRAND }}
                        title="Print Report"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button
                        onClick={closeWorkflow}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90"
                        style={{ backgroundColor: BRAND_DARK }}
                      >
                        Back to Queue
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendResults}
                      disabled={sendingResults || selectedDepts.length === 0}
                      className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base"
                      style={{ backgroundColor: BRAND }}
                    >
                      {sendingResults ? (
                        "Sending..."
                      ) : (
                        <><Share2 className="w-5 h-5" /> Share Results {selectedDepts.length > 0 ? `(${selectedDepts.length} recipient${selectedDepts.length > 1 ? "s" : ""})` : ""}</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Critical Notification Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Record Critical Notification</h3>
                    <p className="text-xs text-gray-500">Only if critical/abnormal results were reported</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Who Was Notified <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={critNotifiedPerson}
                        onChange={e => setCritNotifiedPerson(e.target.value)}
                        placeholder="e.g. Dr. Okello, Nurse Sarah"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Notification Method <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        {NOTIFICATION_METHODS.map(method => (
                          <button
                            key={method}
                            onClick={() => setCritNotificationMethod(method)}
                            className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                              critNotificationMethod === method
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {method === "Phone" && <Phone className="w-4 h-4 inline mr-1" />}
                            {method === "In Person" && <User className="w-4 h-4 inline mr-1" />}
                            {method === "Email" && <MailIcon className="w-4 h-4 inline mr-1" />}
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCriticalNotification}
                    disabled={savingCritical || !critNotifiedPerson || !critNotificationMethod}
                    className="mt-4 px-5 py-2.5 text-sm font-medium rounded-lg border-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                    style={{ borderColor: "#dc2626", color: "#dc2626" }}
                  >
                    {savingCritical ? "Saving..." : "Save Critical Notification"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Main layout with sidebar ──────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f5f7fa" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
        style={{ backgroundColor: BRAND }}
      >
        {/* Sidebar header with circular logo */}
        <div className="p-5 flex flex-col items-center border-b border-white/10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 mb-2 flex items-center justify-center bg-white/10">
            <img
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-white text-2xl font-bold">MS</div>';
              }}
            />
          </div>
          <h1 className="text-white font-bold text-sm text-center">Laboratory</h1>
          <p className="text-white/50 text-[10px] text-center">Main Street Medical Center</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 mb-2 mt-2">Navigation</p>
          <NavItem id="queue" label="Active Queue" icon={Home} count={pendingRequests.length} />
          <NavItem id="records" label="All Records" icon={FileText} count={allRequests.length} />
          <NavItem id="completed" label="Completed" icon={CheckCircle} count={completedRequests.length} />
          <NavItem id="rejected" label="Rejected" icon={Ban} count={rejectedRequests.length} />

          <div className="my-3 border-t border-white/10" />

          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 mb-2">Communications</p>
          <NavItem id="messages" label="Messages" icon={MessageSquareText} />
        </nav>

        {/* Logout at bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <FlaskConical className="w-4 h-4" style={{ color: BRAND }} />
                <span className="font-medium text-gray-700">
                  {activeView === "queue" ? "Patient Queue" :
                   activeView === "records" ? "Lab Records" :
                   activeView === "completed" ? "Completed Results" :
                   activeView === "rejected" ? "Rejected Specimens" : "Messages"}
                </span>
              </div>
            </div>

            {/* Welcome message in header */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.fullName || "Technician"}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">LAB TECHNICIAN</span>
                  <span className="text-[10px] text-gray-400">· Laboratory</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                {(user?.fullName || "T").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Sub-nav tabs for active view */}
          {activeView === "queue" && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "PENDING" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "PENDING" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  Pending ({pendingRequests.length})
                </button>
                <button
                  onClick={() => setViewFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "ALL" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "ALL" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  All ({pendingRequests.length + completedRequests.length})
                </button>
                <button
                  onClick={() => setViewFilter("URGENT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "URGENT" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "URGENT" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  Urgent ({[...pendingRequests, ...completedRequests].filter(r => r.priority === "URGENT" || r.priority === "STAT").length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient name, ID, or test..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#00703C] focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    {queueItems.length} result{queueItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 px-4 py-5 overflow-y-auto">

          {/* ── QUEUE VIEW ─────────────────────────────────────────────── */}
          {activeView === "queue" && (
            <>
              {/* Welcome banner */}
              <div className="rounded-xl px-5 py-4 mb-4" style={{ backgroundColor: BRAND }}>
                <p className="text-white text-sm font-medium">
                  Welcome to Main Street Medical Center Laboratory Dashboard, {user?.fullName || "Technician"}
                </p>
              </div>

            {isLoading && allRequests.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: BRAND, borderTopColor: "transparent" }} />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-red-700 font-medium">Failed to load requests</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
                <button onClick={() => { setIsLoading(true); fetchRequests(); }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                  Retry
                </button>
              </div>
            ) : queueItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12" style={{ color: BRAND }} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-1">All caught up!</h3>
                <p className="text-sm text-gray-400">No pending requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {queueItems.map(req => {
                  const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                  const isRoutine = req.priority === "ROUTINE";
                  const isCompleted = req.status === "COMPLETED";
                  const hasAbnormal = req.isCritical;

                  // Determine top strip color
                  let stripColor = BRAND;
                  if (isUrgent) stripColor = "#dc2626";
                  else if (hasAbnormal) stripColor = "#f59e0b";

                  // Priority pill
                  const PriorityPill = () => {
                    if (isUrgent && req.priority === "STAT") {
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                          STAT
                        </span>
                      );
                    }
                    if (isUrgent) {
                      return (
                        <span className="text-[10px] font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full">
                          URGENT
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-medium text-gray-500 border border-gray-300 px-2.5 py-0.5 rounded-full">
                        ROUTINE
                      </span>
                    );
                  };

                  // Status progress
                  const statusSteps = [
                    { key: "sample", label: "S", done: req.specimenCollectedAt !== null || req.status !== "PENDING", title: "Sample" },
                    { key: "processing", label: "P", done: req.processingStartedAt !== null || req.status === "PROCESSING" || req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED", title: "Processing" },
                    { key: "results", label: "R", done: req.results !== null || req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED", title: "Results" },
                    { key: "sent", label: "S", done: req.status === "COMPLETED", title: "Sent" },
                  ];

                  const currentStepIndex = statusSteps.findIndex(s => !s.done);
                  const activeStepIndex = currentStepIndex === -1 ? 3 : Math.max(0, currentStepIndex - 1);

                  return (
                    <div
                      key={req.id}
                      onClick={() => openWorkflow(req)}
                      className="relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ease group flex flex-col"
                      style={{
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        border: "0.5px solid #e5e7eb",
                        maxHeight: "160px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,112,60,0.12)";
                        e.currentTarget.style.borderColor = "#00703C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                    >
                      {/* Top priority strip */}
                      <div
                        className="w-full flex-shrink-0"
                        style={{ height: "4px", backgroundColor: stripColor }}
                      />

                      {/* Card content */}
                      <div className="flex flex-col flex-1 p-3.5 gap-2">
                        {/* Top row: Name + Priority pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">
                              {req.lastName}, {req.firstName}
                            </h3>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">
                              {timeElapsed(req.createdAt)}
                            </span>
                          </div>
                          <div className="flex-shrink-0 mt-0.5">
                            <PriorityPill />
                          </div>
                        </div>

                        {/* Middle section: details stacked */}
                        <div className="space-y-[3px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-medium" style={{ color: BRAND }}>
                              {req.patientNumber}
                            </span>
                            <span className="text-[11px] text-gray-400">|</span>
                            <span className="text-[11px] text-gray-500">
                              {req.gender} / {req.age}y
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FlaskConical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-[12px] font-semibold text-gray-700 truncate">
                              {req.testName}
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: progress strip + Open button */}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            {statusSteps.map((step, idx) => {
                              const isActive = idx === activeStepIndex;
                              const isDone = step.done;
                              const isLast = idx === statusSteps.length - 1;
                              return (
                                <React.Fragment key={step.key}>
                                  <div
                                    className={`w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold transition-all duration-300 ${
                                      isDone
                                        ? "bg-green-500 text-white"
                                        : isActive
                                        ? "bg-[#00703C] text-white animate-pulse"
                                        : "bg-gray-200 text-gray-400"
                                    }`}
                                    title={step.title}
                                  >
                                    {step.label}
                                  </div>
                                  {!isLast && (
                                    <div className={`w-[10px] h-[1.5px] ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            {isCompleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openPrintWindow(req); }}
                                className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#00703C] transition-colors"
                                title="Print Report"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            )}
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-white px-2 py-1 rounded-md transition-all duration-200"
                              style={{ backgroundColor: BRAND }}
                            >
                              Open
                              <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}

          {/* ── LAB RECORDS VIEW ────────────────────────────────────────── */}
          {activeView === "records" && (
            <div>
              {/* Records filter bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  {(["ALL", "COMPLETED", "PENDING", "REJECTED", "CRITICAL"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRecordsFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        recordsFilter === f ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                      }`}
                      style={recordsFilter === f ? { backgroundColor: BRAND, color: "white" } : {}}
                    >
                      {f === "ALL" ? "All Records" :
                       f === "COMPLETED" ? "Completed" :
                       f === "PENDING" ? "In Progress" :
                       f === "REJECTED" ? "Rejected" : "Critical"}
                    </button>
                  ))}
                </div>
                <div className="relative sm:ml-auto w-full sm:w-auto">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={recordsSearch}
                    onChange={e => setRecordsSearch(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00703C]"
                  />
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Archive className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Records Found</h3>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Table header - hidden on mobile, visible on sm+ */}
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Test</div>
                    <div className="col-span-2">Specimen</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1 text-right">Priority</div>
                  </div>
                  {filteredRecords.map(req => {
                    const isRejected = req.specimenRejected;
                    const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                    const isCrit = req.isCritical;
                    return (
                      <button
                        key={req.id}
                        onClick={() => openWorkflow(req)}
                        className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Mobile view */}
                        <div className="sm:hidden flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{req.lastName}, {req.firstName}</span>
                            {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URGENT</span>}
                            {isCrit && <AlertCircle className="w-3 h-3 text-red-500" />}
                          </div>
                          <span className={`text-[10px] font-medium ${
                            isRejected ? "text-red-600" : req.status === "COMPLETED" ? "text-green-600" : "text-gray-500"
                          }`}>
                            {isRejected ? "REJECTED" : req.status}
                          </span>
                        </div>
                        <div className="sm:hidden flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{req.testName}</span>
                          <span>|</span>
                          <span>{req.patientNumber}</span>
                          <span>|</span>
                          <span>{formatShortDate(req.createdAt)}</span>
                        </div>

                        {/* Desktop grid */}
                        <div className="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{req.lastName}, {req.firstName}</span>
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-sm text-gray-600 truncate">
                          <FlaskConical className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                          {req.testName}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {req.specimenId ? (
                            <><span className="font-mono">{req.specimenId}</span> {req.specimenType && <span className="ml-1 text-gray-400">({req.specimenType})</span>}</>
                          ) : <span className="italic text-gray-300">Not collected</span>}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center">
                          {isRejected ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">REJECTED</span>
                          ) : (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              req.status === "COMPLETED" ? "text-green-700 bg-green-50 border border-green-200" :
                              req.status === "AWAITING_VALIDATION" ? "text-amber-700 bg-amber-50 border border-amber-200" :
                              req.status === "REJECTED" ? "text-red-700 bg-red-50 border border-red-200" :
                              "text-gray-500 bg-gray-50 border border-gray-200"
                            }`}>
                              {req.status === "COMPLETED" ? "Completed" :
                               req.status === "AWAITING_VALIDATION" ? "Awaiting Validation" :
                               req.status === "SPECIMEN_COLLECTED" ? "Collected" :
                               req.status === "PROCESSING" ? "Processing" :
                               req.status === "REJECTED" ? "Rejected" : "Pending"}
                            </span>
                          )}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {formatShortDate(req.createdAt)}
                        </div>
                        <div className="hidden sm:flex col-span-1 items-center justify-end gap-1">
                          {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URG</span>}
                          {isCrit && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                          {req.priority === "ROUTINE" && !isCrit && (
                            <span className="text-[9px] text-gray-400">R</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REJECTED VIEW ──────────────────────────────────────────── */}
          {activeView === "rejected" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Ban className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-bold text-gray-700">Rejected Specimens</h2>
                <span className="text-xs text-gray-400">({rejectedRequests.length} total)</span>
              </div>
              {rejectedRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Rejected Specimens</h3>
                  <p className="text-sm text-gray-400 mt-1">All specimens have been accepted.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rejectedRequests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => openWorkflow(req)}
                      className="w-full bg-white rounded-xl border border-red-200 px-5 py-4 text-left hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{req.lastName}, {req.firstName}</span>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">REJECTED</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="font-mono">{req.patientNumber}</span>
                            <span>{req.testName}</span>
                            {req.rejectionReason && <span className="text-red-500">Reason: {req.rejectionReason}</span>}
                            {req.rejectedAt && <span>{formatDate(req.rejectedAt)}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED VIEW ────────────────────────────────────────── */}
          {activeView === "completed" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-bold text-gray-700">Completed Lab Results</h2>
                <span className="text-xs text-gray-400">({completedRequests.length} total)</span>
              </div>
              {completedRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Completed Results</h3>
                  <p className="text-sm text-gray-400 mt-1">Completed lab results will appear here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Test</div>
                    <div className="col-span-2">Specimen</div>
                    <div className="col-span-2">Results</div>
                    <div className="col-span-2">Completed</div>
                    <div className="col-span-1 text-right">Priority</div>
                  </div>
                  {completedRequests.map(req => {
                    const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                    const isCrit = req.isCritical;
                    let resultCount = 0;
                    try { const r = JSON.parse(req.results || "[]"); if (Array.isArray(r)) resultCount = r.length; } catch {}
                    return (
                      <button
                        key={req.id}
                        onClick={() => openWorkflow(req)}
                        className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Mobile */}
                        <div className="sm:hidden flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{req.lastName}, {req.firstName}</span>
                            {isCrit && <AlertCircle className="w-3 h-3 text-red-500" />}
                          </div>
                          <span className="text-[10px] font-medium text-green-600">COMPLETED</span>
                        </div>
                        <div className="sm:hidden flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{req.testName}</span>
                          <span>|</span>
                          <span>{req.patientNumber}</span>
                          <span>|</span>
                          <span>{formatShortDate(req.validatedAt || req.updatedAt)}</span>
                        </div>

                        {/* Desktop grid — read-only, no click-to-edit call to action */}
                        <div className="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{req.lastName}, {req.firstName}</span>
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-sm text-gray-600 truncate">
                          <FlaskConical className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                          {req.testName}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {req.specimenId ? (
                            <><span className="font-mono">{req.specimenId}</span> {req.specimenType && <span className="ml-1 text-gray-400">({req.specimenType})</span>}</>
                          ) : <span className="italic text-gray-300">N/A</span>}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {resultCount > 0 ? (
                            <span className="text-green-600">{resultCount} parameter{resultCount !== 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-gray-300">No data</span>
                          )}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {formatShortDate(req.validatedAt || req.updatedAt)}
                        </div>
                        <div className="hidden sm:flex col-span-1 items-center justify-end gap-1">
                          {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URG</span>}
                          {isCrit && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES VIEW ──────────────────────────────────────────── */}
          {activeView === "messages" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquareText className="w-5 h-5" style={{ color: BRAND }} />
                <h2 className="text-base font-bold text-gray-700">Staff Messages</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <StaffMessaging
                  currentUserName={user?.fullName || "Lab Technician"}
                  currentUserDept="Laboratory"
                />
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Send and receive messages from other departments
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
