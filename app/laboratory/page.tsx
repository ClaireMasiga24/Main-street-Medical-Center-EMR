"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import StaffMessaging from "../components/StaffMessaging";
import {
  FlaskConical, Search, RefreshCw, LogOut, AlertTriangle, Clock,
  User, Phone, ArrowRight, CheckCircle, XCircle, Save, Printer,
  ShieldAlert, FileText, Download, Upload, Filter, ChevronDown,
  Microscope, TestTube, Droplets, Syringe, Beaker, Pill,
  Activity, BadgeCheck, AlertCircle, Plus, Minus, Trash2,
  Eye, EyeOff, Calendar, Star, FilePlus, ClipboardList,
  Heart, ShieldCheck, CheckCheck, CircleAlert, FlaskRound,
  ScanBarcode, ScrollText, ListChecks, Layers, Sigma, RadioTower,
  GripHorizontal, Table2, Send, MessageSquare, History, BarChart3,
  Bell, PhoneCall, Stethoscope, Building2, Hash, Timer, Users,
  FileSpreadsheet, Columns3, Wifi, Cpu, TestTubes, Bone, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────
interface TestResultEntry { test: string; result: string; unit: string; referenceRange: string; flag: string; }
interface Attachment { name: string; path: string; type: string; uploadedAt: string; }
interface ChainOfCustodyEntry { action: string; by: string; at: string; from: string; to: string; }

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
  chainOfCustody: string | null;
  attachments: string | null;
  status: string; createdAt: string; updatedAt: string;
}

interface NotificationItem { id: number; text: string; type: string; }
interface LabStats { totalToday: number; pending: number; completed: number; rejected: number; critical: number; urgent: number; avgTatMinutes: number; departments: { referralSource: string | null; _count: number }[]; }

// ─── Constants ────────────────────────────────────────────────────────
const STATUS_SECTIONS = [
  { key: "PENDING", label: "Pending Requests", icon: ClipboardList, color: "amber" },
  { key: "SPECIMEN_COLLECTED", label: "Samples Collected", icon: Droplets, color: "blue" },
  { key: "PROCESSING", label: "In Progress", icon: Microscope, color: "indigo" },
  { key: "AWAITING_VALIDATION", label: "Awaiting Validation", icon: BadgeCheck, color: "purple" },
  { key: "COMPLETED", label: "Completed Results", icon: CheckCircle, color: "green" },
  { key: "REJECTED", label: "Rejected", icon: XCircle, color: "red" },
];

const PRIORITY_COLORS: Record<string, string> = {
  ROUTINE: "bg-slate-100 text-slate-600 border-slate-200",
  URGENT: "bg-amber-50 text-amber-700 border-amber-200",
  STAT: "bg-red-50 text-red-700 border-red-200",
};

const SPECIMEN_TYPES = ["BLOOD","URINE","STOOL","CSF","SWAB","SPUTUM","TISSUE","SERUM","PLASMA","OTHER"];
const COMMON_PANELS = ["Complete Blood Count (CBC)","Liver Function Test (LFT)","Renal Function Test (RFT)","Blood Glucose / HBA1C","Lipid Profile","Thyroid Function Test (TFT)","Urinalysis / U/A","Malaria RDT / Blood Film","Widal Test","Stool Analysis","Pregnancy Test (hCG)","HIV Rapid Test","Hepatitis B / C Serology","Blood Group & Crossmatch","Tuberculosis (AFB/Genexpert)","Electrolytes Panel","Coagulation Profile (INR/PTT)","Blood Culture & Sensitivity","C-reactive Protein (CRP)","Procalcitonin (PCT)"];
const DEPARTMENTS = ["Nurse/Midwife","Reception","Clinician","Doctor","Specialist","Radiology","Pharmacy","Administration","Billing","Ward","Emergency","Theatre","ICU","NICU"];
const REJECTION_REASONS = ["Hemolyzed sample","Clotted sample","Insufficient quantity","Wrong container/tube","Mislabeled specimen","Contaminated sample","Expired collection tube","Improper transport/storage","Patient not properly prepared","Duplicate request","Other"];
const ANALYZER_TYPES = [
  { id: "CBC", label: "CBC / Hematology Analyzer", icon: TestTubes },
  { id: "CHEMISTRY", label: "Chemistry Analyzer", icon: Beaker },
  { id: "HEMATOLOGY", label: "Hematology Analyzer", icon: Microscope },
  { id: "URINALYSIS", label: "Urinalysis Machine", icon: Droplets },
  { id: "COAGULATION", label: "Coagulation Analyzer", icon: TestTube },
  { id: "IMMUNOLOGY", label: "Immunology Analyzer", icon: FlaskRound },
  { id: "MICROBIOLOGY", label: "Microbiology / Culture", icon: FlaskConical },
  { id: "OTHER", label: "Other Equipment", icon: Cpu },
];
const CRITICAL_METHODS = ["PHONE","PAGE","IN_PERSON","EMAIL","SYSTEM"];

const formatDate = (iso: string) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};
const formatDateShort = (iso: string) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};
const formatDuration = (startIso: string, endIso: string) => {
  if (!startIso || !endIso) return "—";
  try {
    const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  } catch { return "—"; }
};
const tatStatusClass = (createdIso: string, status: string, priority: string) => {
  if (!createdIso || status === "COMPLETED" || status === "REJECTED") return "";
  const elapsed = (Date.now() - new Date(createdIso).getTime()) / 60000;
  const thresholds = priority === "STAT" ? [30, 60] : priority === "URGENT" ? [60, 120] : [120, 240];
  if (elapsed > thresholds[1]) return "bg-red-100 text-red-700 border-red-200";
  if (elapsed > thresholds[0]) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
};

// ─── CBC Analyzer Sample Data ─────────────────────────────────────────
const CBC_PANEL_TESTS = [
  { test: "White Blood Cell (WBC)", unit: "x10³/µL", range: "4.0–11.0" },
  { test: "Red Blood Cell (RBC)", unit: "x10⁶/µL", range: "4.5–5.5" },
  { test: "Hemoglobin (HGB)", unit: "g/dL", range: "12.0–16.0" },
  { test: "Hematocrit (HCT)", unit: "%", range: "36–46" },
  { test: "Mean Corpuscular Volume (MCV)", unit: "fL", range: "80–100" },
  { test: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", range: "27–32" },
  { test: "Mean Corpuscular HGB Conc. (MCHC)", unit: "g/dL", range: "32–36" },
  { test: "Red Cell Distribution Width (RDW)", unit: "%", range: "11.5–14.5" },
  { test: "Platelet Count (PLT)", unit: "x10³/µL", range: "150–450" },
  { test: "Neutrophils", unit: "%", range: "40–60" },
  { test: "Lymphocytes", unit: "%", range: "20–40" },
  { test: "Monocytes", unit: "%", range: "2–8" },
  { test: "Eosinophils", unit: "%", range: "1–4" },
  { test: "Basophils", unit: "%", range: "0–1" },
];

const CHEMISTRY_PANEL_TESTS = [
  { test: "Glucose (Fasting)", unit: "mg/dL", range: "70–110" },
  { test: "Creatinine", unit: "mg/dL", range: "0.6–1.2" },
  { test: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", range: "7–20" },
  { test: "Sodium (Na)", unit: "mEq/L", range: "136–145" },
  { test: "Potassium (K)", unit: "mEq/L", range: "3.5–5.1" },
  { test: "Chloride (Cl)", unit: "mEq/L", range: "98–106" },
  { test: "Total Protein", unit: "g/dL", range: "6.0–8.3" },
  { test: "Albumin", unit: "g/dL", range: "3.5–5.0" },
  { test: "Total Bilirubin", unit: "mg/dL", range: "0.1–1.2" },
  { test: "ALT (SGPT)", unit: "U/L", range: "7–56" },
  { test: "AST (SGOT)", unit: "U/L", range: "5–40" },
  { test: "Alkaline Phosphatase (ALP)", unit: "U/L", range: "44–147" },
];

// ─── Main Component ───────────────────────────────────────────────────
export default function LaboratoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [allRequests, setAllRequests] = useState<LabRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [referralFilter, setReferralFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Selected request
  const [selectedRequest, setSelectedRequest] = useState<LabRequestItem | null>(null);
  const [detailView, setDetailView] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [persistedNotifs, setPersistedNotifs] = useState<any[]>([]);

  // Print / Signature
  const [labSignature, setLabSignature] = useState("");

  // Stats
  const [stats, setStats] = useState<LabStats>({
    totalToday: 0, pending: 0, completed: 0, rejected: 0, critical: 0, urgent: 0, avgTatMinutes: 0, departments: [],
  });

  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Bulk selection (table view)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modals
  const [showCriticalPanel, setShowCriticalPanel] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showCommPanel, setShowCommPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showAnalyzerPanel, setShowAnalyzerPanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [historyPatientId, setHistoryPatientId] = useState<number | null>(null);
  const [patientHistory, setPatientHistory] = useState<LabRequestItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportRequest, setReportRequest] = useState<LabRequestItem | null>(null);

  // Table sort
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Lab Records view
  const [showLabRecords, setShowLabRecords] = useState(false);
  const [allLabRecords, setAllLabRecords] = useState<LabRequestItem[]>([]);
  const [labRecordsLoading, setLabRecordsLoading] = useState(false);
  const [labRecordsSearch, setLabRecordsSearch] = useState("");
  const [labRecordsStatusFilter, setLabRecordsStatusFilter] = useState("");
  const [labRecordsPriorityFilter, setLabRecordsPriorityFilter] = useState("");
  const [labRecordsPage, setLabRecordsPage] = useState(1);
  const [labRecordsTotal, setLabRecordsTotal] = useState(0);
  const RECORDS_PER_PAGE = 50;

  // ── Auth ────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }
    const parsed = JSON.parse(storedUser);
    if (!["LAB_TECHNICIAN", "ADMINISTRATOR"].includes(parsed.role)) { router.push("/"); return; }
    setUser(parsed);
    setIsAuthed(true);
  }, [router]);

  // ── Fetch ───────────────────────────────────────────────────────────
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/laboratory?action=stats");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {} // non-critical
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/laboratory?action=notifications");
      const data = await res.json();
      if (data.success) setPersistedNotifs(data.notifications);
    } catch {}
  }, []);

  const fetchAllLabRecords = useCallback(async () => {
    setLabRecordsLoading(true);
    try {
      const res = await fetch("/api/laboratory?all=true");
      const data = await res.json();
      if (data.success) {
        setAllLabRecords(data.requests);
        setLabRecordsTotal(data.requests.length);
      }
    } catch (err: any) { console.error("Failed to fetch lab records", err); }
    finally { setLabRecordsLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    fetchRequests();
    fetchStats();
    fetchNotifications();
    const interval = setInterval(() => { fetchRequests(); fetchStats(); }, 60_000);
    return () => clearInterval(interval);
  }, [fetchRequests, fetchStats, fetchNotifications, isAuthed]);

  // ── Compute inline notifications ────────────────────────────────────
  useEffect(() => {
    if (!allRequests.length) return;
    const newNotifs: NotificationItem[] = [];
    allRequests.forEach(r => {
      if (r.isCritical && r.status !== "COMPLETED")
        newNotifs.push({ id: r.id, text: `Critical: ${r.testName} — ${r.lastName}, ${r.firstName} (${r.patientNumber})`, type: "critical" });
      if (r.priority === "STAT" && r.status === "PENDING")
        newNotifs.push({ id: r.id + 10000, text: `STAT request: ${r.testName} for ${r.lastName}, ${r.firstName}`, type: "urgent" });
    });
    if (newNotifs.length) setNotifications(newNotifs.slice(0, 10));
  }, [allRequests]);

  // ── Barcode handler ─────────────────────────────────────────────────
  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const match = allRequests.find(r => r.specimenId === barcodeInput.trim());
      if (match) {
        setSelectedRequest(match);
        setDetailView(true);
        setBarcodeInput("");
      } else {
        alert(`Specimen not found: ${barcodeInput}`);
        setBarcodeInput("");
      }
    }
  };

  // ── API helper ──────────────────────────────────────────────────────
  const callLabApi = async (action: string, payload: any) => {
    const res = await fetch("/api/laboratory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
    return res.json();
  };

  const handleRefresh = () => { setIsLoading(true); fetchRequests(); fetchStats(); };

  // ── Logout ──────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user?.id, username: user?.username }) }); } catch {}
    localStorage.removeItem("user"); sessionStorage.removeItem("user"); router.push("/");
  };

  // ── Filtering & Sorting ─────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    let items = allRequests.filter(r => {
      if (activeTab !== "ALL" && r.status !== activeTab) return false;
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (referralFilter && r.referralSource !== referralFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const sf = [r.patientNumber, r.firstName, r.lastName, `${r.firstName} ${r.lastName}`, r.testName, r.testPanel,
          r.specimenId, r.specimenType, r.priority, r.status, r.referralSource, r.requestedBy, r.requestedDepartment,
          r.clinicalNotes, r.referralNotes, r.criticalNote, r.rejectionReason, r.collectedByName, r.enteredByName, r.validatedByName,
          `${r.age}`, r.gender, r.analyzerType, r.analyzerModel];
        if (!sf.some(f => f && f.toLowerCase().includes(q))) return false;
      }
      return true;
    });

    // Sort
    items.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "patientNumber": valA = a.patientNumber; valB = b.patientNumber; break;
        case "lastName": valA = a.lastName; valB = b.lastName; break;
        case "testName": valA = a.testName; valB = b.testName; break;
        case "priority": valA = a.priority; valB = b.priority; break;
        case "status": valA = a.status; valB = b.status; break;
        case "referralSource": valA = a.referralSource; valB = b.referralSource; break;
        case "specimenType": valA = a.specimenType; valB = b.specimenType; break;
        case "specimenCollectedAt": valA = a.specimenCollectedAt || ""; valB = b.specimenCollectedAt || ""; break;
        default: valA = a.createdAt; valB = b.createdAt; break;
      }
      if (sortDir === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return items;
  }, [allRequests, activeTab, priorityFilter, referralFilter, searchQuery, sortField, sortDir]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_SECTIONS.forEach(s => counts[s.key] = allRequests.filter(r => r.status === s.key).length);
    return counts;
  }, [allRequests]);

  const referralSources = useMemo(() => [...new Set(allRequests.map(r => r.referralSource).filter(Boolean))], [allRequests]);

  // ── Bulk actions ────────────────────────────────────────────────────
  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) { alert("Select items first"); return; }
    try {
      if (action === "start_processing") {
        await callLabApi("BULK_START_PROCESSING", { ids: selectedIds, startedBy: user?.fullName || "Lab Technician" });
      } else {
        await callLabApi("BULK_UPDATE_STATUS", { ids: selectedIds, status: action });
      }
      handleRefresh();
      setSelectedIds([]);
      setSelectAll(false);
      alert(`Bulk action completed for ${selectedIds.length} items`);
    } catch (err: any) { alert(err.message); }
  };

  const toggleSelectAll = () => {
    if (selectAll) { setSelectedIds([]); setSelectAll(false); }
    else { setSelectedIds(filteredRequests.map(r => r.id)); setSelectAll(true); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // ── Print handler ──────────────────────────────────────────────────
  const handlePrint = (sectionId: string) => {
    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });

    // Print queue list
    if (sectionId === "lab-queue-print") {
      const filtered = filteredRequests.length > 0 ? filteredRequests : allRequests;
      const rows = filtered.slice(0, 50).map((r: LabRequestItem) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:11px">${r.lastName}, ${r.firstName}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:11px;font-family:monospace">${r.patientNumber}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:11px">${r.testName}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:11px">${r.status}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:11px">${new Date(r.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html>
      <html><head><title>Main Street Medical Center — Lab Queue</title>
      <style>
        @page { margin: 10mm; }
        body { font-family: Arial, sans-serif; margin:0; padding:20px; color:#1e293b; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #cbd5e1; padding:6px 10px; text-align:left; font-size:11px; }
        th { background:#f1f5f9; font-weight:700; font-size:10px; text-transform:uppercase; }
        .watermark { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:-1; opacity:0.05; }
        .watermark img { width:50%; height:auto; }
      </style></head>
      <body>
        <img src="/Images/LOGO.jpg" style="position:fixed;inset:0;width:50%;margin:auto;opacity:0.05;pointer-events:none;z-index:-1;object-fit:contain" />
        <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #0a2e1a;padding-bottom:15px">
          <h1 style="font-size:18px;color:#0a2e1a;margin:0">MAIN STREET MEDICAL CENTER</h1>
          <p style="font-size:12px;color:#555;margin:4px 0 0 0">Laboratory Request Queue — ${today}</p>
          <p style="font-size:10px;color:#94a3b8;margin:4px 0 0 0">Total: ${filtered.length} request(s)</p>
        </div>
        <table>
          <thead><tr><th>Patient</th><th>ID</th><th>Test</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8">No requests</td></tr>'}</tbody>
        </table>
        <div style="margin-top:20px;text-align:center;font-size:8px;color:#94a3b8">Main Street Medical Center &bull; Laboratory Queue &bull; ${new Date().toLocaleString("en-UG")}</div>
      </body></html>`;

      const pw = window.open("", "_blank", "width=800,height=600");
      if (!pw) { alert("Please allow pop-ups to print."); return; }
      pw.document.write(html);
      pw.document.close();
      setTimeout(() => { pw.focus(); pw.print(); }, 800);
      return;
    }

    // Build self-contained HTML for the individual report
    const request = reportRequest;
    if (!request) return;

    let results: any[] = [];
    if (request.results) { try { const p = JSON.parse(request.results); if (Array.isArray(p)) results = p; } catch {} }

    const resultsRows = results.map((r: any, i: number) => {
      const abn = r.flag === "high" || r.flag === "low" || r.flag === "critical";
      return `<tr${abn ? ' style="background:#fef2f2"' : ""}>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;font-size:12px">${i + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;font-size:13px;font-weight:600${abn ? ';color:#b91c1c' : ''}">${r.test}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;font-size:13px;font-weight:700${abn ? ';color:#dc2626' : ''}">${r.result}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;font-size:12px;color:#64748b">${r.unit || ""}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;font-size:12px;color:#64748b">${r.referenceRange || ""}</td>
        <td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center">${abn ? `<span style="font-size:10px;font-weight:bold;padding:2px 8px;border-radius:4px;background:${r.flag === 'critical' ? '#fecaca' : '#fde68a'};color:${r.flag === 'critical' ? '#991b1b' : '#92400e'}">${r.flag.toUpperCase()}</span>` : '<span style="color:#16a34a;font-size:12px">Normal</span>'}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
    <html><head><title>Main Street Medical Center — Lab Report</title>
    <style>
      @page { margin: 15mm; }
      body { font-family: Arial, sans-serif; margin:0; padding:0; color:#1e293b; }
      table { width:100%; border-collapse:collapse; margin:16px 0; }
      th, td { border:1px solid #cbd5e1; padding:8px 12px; text-align:left; font-size:12px; }
      th { background:#f1f5f9; font-weight:700; font-size:11px; text-transform:uppercase; }
      .watermark img { position:fixed; inset:0; width:50%; margin:auto; opacity:0.06; pointer-events:none; z-index:-1; object-fit:contain; }
    </style></head>
    <body>
      <img src="/Images/LOGO.jpg" style="position:fixed;inset:0;width:50%;margin:auto;opacity:0.06;pointer-events:none;z-index:-1;object-fit:contain" />
      <div style="padding:40px;max-width:800px;margin:0 auto">
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #0a2e1a;padding-bottom:20px">
          <h1 style="font-size:22px;color:#0a2e1a;margin:0;font-weight:bold">MAIN STREET MEDICAL CENTER</h1>
          <p style="font-size:13px;color:#555;margin:4px 0 0 0">Laboratory Report</p>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 0 0">Report #: LAB-RPT-${String(request.id).padStart(6, "0")} | Date: ${today}</p>
        </div>
        <table style="border:none">
          <tr>
            <td style="border:none;font-weight:bold;color:#0a2e1a;width:150px">Patient:</td>
            <td style="border-bottom:1px solid #ccc">${request.lastName}, ${request.firstName}</td>
            <td style="border:none;font-weight:bold;color:#0a2e1a;width:100px">ID:</td>
            <td style="border-bottom:1px solid #ccc">${request.patientNumber}</td>
          </tr>
          <tr>
            <td style="border:none;font-weight:bold;color:#0a2e1a">Gender / Age:</td>
            <td style="border-bottom:1px solid #ccc">${request.gender} / ${request.age}y</td>
            <td style="border:none;font-weight:bold;color:#0a2e1a">Test:</td>
            <td style="border-bottom:1px solid #ccc">${request.testName}</td>
          </tr>
          <tr>
            <td style="border:none;font-weight:bold;color:#0a2e1a">Doctor:</td>
            <td style="border-bottom:1px solid #ccc">${request.requestedBy || "—"}</td>
            <td style="border:none;font-weight:bold;color:#0a2e1a">Specimen:</td>
            <td style="border-bottom:1px solid #ccc">${request.specimenId || "—"}</td>
          </tr>
        </table>
        ${results.length > 0 ? `
        <table>
          <thead><tr><th>#</th><th>Investigation</th><th>Result</th><th>Unit</th><th>Range</th><th style="text-align:center">Flag</th></tr></thead>
          <tbody>${resultsRows}</tbody>
        </table>` : '<p style="text-align:center;color:#94a3b8;padding:20px">No results entered yet</p>'}
        ${request.clinicalNotes ? `<div style="margin-bottom:16px"><h3 style="font-size:11px;color:#0a2e1a;text-transform:uppercase;letter-spacing:1px">Clinical Notes</h3><p style="font-size:12px;color:#475569;margin:0">${request.clinicalNotes}</p></div>` : ""}
        <div style="margin-top:40px;border-top:1px solid #ccc;padding-top:24px;display:flex;justify-content:space-between">
          <div style="text-align:center">
            <p style="border-top:1px solid #000;width:200px;margin:36px auto 4px;padding-top:4px;font-size:13px;font-weight:bold">${labSignature || "Technician"}</p>
            <p style="font-size:10px;color:#64748b;margin:0">Lab Technician</p>
          </div>
          <div style="text-align:center">
            <p style="border-top:1px solid #000;width:200px;margin:36px auto 4px;padding-top:4px;font-size:13px;font-weight:bold">${request.validatedByName || "—"}</p>
            <p style="font-size:10px;color:#64748b;margin:0">Validator</p>
          </div>
        </div>
        <div style="margin-top:20px;text-align:center;font-size:9px;color:#94a3b8">Main Street Medical Center &bull; Laboratory Report &bull; ${new Date().toLocaleString("en-UG")}</div>
      </div>
    </body></html>`;

    const pw = window.open("", "_blank", "width=800,height=600");
    if (!pw) { alert("Please allow pop-ups to print."); return; }
    pw.document.write(html);
    pw.document.close();
    setTimeout(() => { pw.focus(); pw.print(); }, 800);
  };

  // ── Early auth loading ──────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw size={32} className="animate-spin" />
          <span className="font-semibold">Authenticating…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 z-40 h-screen w-72 bg-[#00703C] text-white transition-transform duration-300 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-green-800 text-center">
          <Image src="/Images/LOGO.jpg" alt="Logo" width={80} height={80} className="rounded-full border-2 border-white mx-auto" priority />
          <h2 className="mt-3 text-lg font-bold">MAIN STREET EMR</h2>
          <p className="text-green-100 text-xs mt-1">Laboratory Information System</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {STATUS_SECTIONS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.key] || 0;
            return (
              <button key={tab.key} onClick={() => { setShowLabRecords(false); setActiveTab(tab.key); setDetailView(false); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${activeTab === tab.key ? "bg-white text-[#00703C] shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon size={18} />
                <span className="flex-1">{tab.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tab.key ? "bg-[#00703C] text-white" : "bg-white/20 text-white"}`}>{count}</span>
              </button>
            );
          })}

          <div className="border-t border-green-700/50 my-3 pt-3 space-y-1">
            <button onClick={() => setShowCriticalPanel(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all">
              <ShieldAlert size={18} /> Critical Results
            </button>
            <button onClick={() => setShowCommPanel(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all">
              <MessageSquare size={18} /> Lab Communications
            </button>
            <button onClick={() => setShowStatsPanel(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all">
              <BarChart3 size={18} /> Performance Stats
            </button>
            <button onClick={() => { setShowLabRecords(true); setDetailView(false); setSelectedRequest(null); fetchAllLabRecords(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all">
              <History size={18} /> Lab Records
            </button>
            <button onClick={() => window.open("/api/appointments?department=Laboratory", "_blank")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all">
              <Calendar size={18} /> Appointments
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-green-800 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <p className="font-bold text-lg">{stats.totalToday}</p>
              <p className="text-green-100">Today</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="font-bold text-lg text-red-300">{stats.critical + stats.urgent}</p>
              <p className="text-green-100">Alerts</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="font-bold text-lg">{stats.avgTatMinutes}</p>
              <p className="text-green-100">Avg TAT (min)</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="font-bold text-lg">{stats.pending}</p>
              <p className="text-green-100">Pending</p>
            </div>
          </div>
          <div className="px-3 py-2">
            <StaffMessaging />
          </div>
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-sm transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-72">
        {/* Mobile header */}
        <div className="md:hidden bg-[#00703C] text-white px-4 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-2xl leading-none">☰</button>
          <span className="font-bold text-sm">Lab LIS</span>
          <button onClick={handleRefresh} className="text-white/80 hover:text-white">
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── NOTIFICATIONS BAR ─────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-4 md:px-8 py-2">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="flex gap-6 overflow-x-auto">
                  {notifications.map((n) => (
                    <span key={n.id} className="text-xs font-semibold text-red-700 whitespace-nowrap flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${n.type === "critical" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                      {n.text}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setNotifications([])} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <XCircle size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          {/* ── PAGE HEADER ──────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                <FlaskConical size={28} className="text-[#00703C]" />
                Laboratory Information System
              </h1>
              <p className="text-slate-500 text-sm mt-1">
ld                Welcome to Main Street Medical Centre Laboratory System, <strong className="text-[#00703C]">{user?.fullName || user?.username || "Lab Technician"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="hidden md:flex items-center gap-1.5 text-xs">
                <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle size={11} /> {stats.completed} Done
                </span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1">
                  <Clock size={11} /> {stats.avgTatMinutes}m avg
                </span>
                {stats.critical > 0 && (
                  <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                    <ShieldAlert size={11} /> {stats.critical} Critical
                  </span>
                )}
                {stats.urgent > 0 && (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1">
                    <AlertTriangle size={11} /> {stats.urgent} STAT
                  </span>
                )}
              </div>

              <button onClick={() => setShowStatsPanel(true)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#00703C] text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold transition shadow-sm">
                <BarChart3 size={13} /> Stats
              </button>
              <button onClick={handleRefresh} disabled={isLoading}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#00703C] text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm">
                <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* ── SEARCH & FILTERS ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ID, test, specimen, doctor, notes..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus:border-[#00703C] focus:bg-white" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><XCircle size={16} /></button>}
              </div>

              {/* Barcode scanner */}
              <div className="relative">
                <ScanBarcode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeScan}
                  placeholder="Scan barcode (LAB-YYYY-NNNN)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-mono font-bold text-[#00703C] outline-none transition focus:border-[#00703C] focus:bg-white" />
              </div>

              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00703C] focus:bg-white">
                <option value="">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>

              <select value={referralFilter} onChange={(e) => setReferralFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00703C] focus:bg-white">
                <option value="">All Departments</option>
                {referralSources.map((s) => (<option key={s} value={s!}>{s}</option>))}
              </select>
            </div>

            {/* View toggle + bulk actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowLabRecords(false); setViewMode("cards"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "cards" ? "bg-[#00703C] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  <GripHorizontal size={13} /> Card View
                </button>
                <button onClick={() => { setShowLabRecords(false); setViewMode("table"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "table" ? "bg-[#00703C] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  <Table2 size={13} /> Worklist Table
                </button>
              </div>

              {viewMode === "table" && selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{selectedIds.length} selected</span>
                  <button onClick={() => handleBulkAction("PROCESSING")}
                    className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">
                    <Microscope size={12} /> Start Processing
                  </button>
                  <button onClick={() => { setSelectedIds([]); setSelectAll(false); }}
                    className="text-xs text-slate-400 hover:text-red-500 font-semibold">Clear</button>
                </div>
              )}
            </div>
          </div>

          {/* ── ERROR ────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-700 text-sm">
              <AlertTriangle size={18} />
              <span className="font-semibold">{error}</span>
              <button onClick={handleRefresh} className="ml-auto bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold text-xs transition">Retry</button>
            </div>
          )}

          {showLabRecords ? (
            <LabRecordsView
              records={allLabRecords}
              isLoading={labRecordsLoading}
              search={labRecordsSearch}
              setSearch={setLabRecordsSearch}
              statusFilter={labRecordsStatusFilter}
              setStatusFilter={setLabRecordsStatusFilter}
              priorityFilter={labRecordsPriorityFilter}
              setPriorityFilter={setLabRecordsPriorityFilter}
              page={labRecordsPage}
              setPage={setLabRecordsPage}
              perPage={RECORDS_PER_PAGE}
              total={labRecordsTotal}
              onRefresh={fetchAllLabRecords}
              onSelectRequest={(r: LabRequestItem) => { setSelectedRequest(r); setDetailView(true); setShowLabRecords(false); }}
              formatDate={formatDateShort}
              formatDuration={formatDuration}
              tatStatusClass={tatStatusClass}
            />
          ) : detailView && selectedRequest ? (
            <LabRequestDetail
              request={selectedRequest}
              onBack={() => { setDetailView(false); setSelectedRequest(null); }}
              onRefresh={handleRefresh}
              callLabApi={callLabApi}
              formatDate={formatDate}
              formatDateShort={formatDateShort}
              handlePrint={handlePrint}
              user={user}
              setShowHistoryPanel={setShowHistoryPanel}
              setHistoryPatientId={setHistoryPatientId}
              setShowSharePanel={setShowSharePanel}
              setShowCriticalPanel={setShowCriticalPanel}
              setShowAnalyzerPanel={setShowAnalyzerPanel}
              setReportRequest={setReportRequest}
            />
          ) : viewMode === "table" ? (
            <WorklistTableView
              requests={filteredRequests}
              formatDate={formatDateShort}
              formatDuration={formatDuration}
              tatStatusClass={tatStatusClass}
              onSelectRequest={(r: LabRequestItem) => { setSelectedRequest(r); setDetailView(true); }}
              selectedIds={selectedIds}
              selectAll={selectAll}
              toggleSelectAll={toggleSelectAll}
              toggleSelect={toggleSelect}
              sortField={sortField}
              sortDir={sortDir}
              onSort={(field: string) => {
                if (sortField === field) setSortDir((d: string) => d === "asc" ? "desc" : "asc");
                else { setSortField(field); setSortDir("asc"); }
              }}
            />
          ) : (
            <CardView
              requests={filteredRequests}
              isLoading={isLoading}
              activeTab={activeTab}
              formatDate={formatDateShort}
              onSelectRequest={(r: LabRequestItem) => { setSelectedRequest(r); setDetailView(true); }}
              handlePrint={handlePrint}
            />
          )}
        </div>
      </main>

      {/* ── MODALS ──────────────────────────────────────────────────── */}

      {/* Critical Results Panel */}
      {showCriticalPanel && (
        <CriticalResultsPanel
          onClose={() => setShowCriticalPanel(false)}
          callLabApi={callLabApi}
          formatDate={formatDate}
          allRequests={allRequests}
          user={user}
          onRefresh={handleRefresh}
        />
      )}

      {/* Share Panel */}
      {showSharePanel && (
        <ShareResultPanel
          request={selectedRequest}
          onClose={() => setShowSharePanel(false)}
          callLabApi={callLabApi}
          user={user}
        />
      )}

      {/* Communications Panel */}
      {showCommPanel && (
        <CommunicationsPanel
          onClose={() => setShowCommPanel(false)}
          callLabApi={callLabApi}
          user={user}
          formatDate={formatDate}
        />
      )}

      {/* Patient History Panel */}
      {showHistoryPanel && (
        <PatientHistoryPanel
          patientId={historyPatientId}
          onClose={() => { setShowHistoryPanel(false); setHistoryPatientId(null); }}
          formatDate={formatDate}
          formatDateShort={formatDateShort}
        />
      )}

      {/* Analyzer Integration Panel */}
      {showAnalyzerPanel && selectedRequest && (
        <AnalyzerIntegrationPanel
          request={selectedRequest}
          onClose={() => setShowAnalyzerPanel(false)}
          callLabApi={callLabApi}
          onRefresh={handleRefresh}
        />
      )}

      {/* Stats Panel */}
      {showStatsPanel && (
        <StatsPanel
          stats={stats}
          onClose={() => setShowStatsPanel(false)}
          formatDuration={formatDuration}
        />
      )}

      {/* Report Preview */}
      {reportRequest && (
        <ReportPreviewModal
          request={reportRequest}
          onClose={() => setReportRequest(null)}
          formatDate={formatDate}
          handlePrint={handlePrint}
          labSignature={labSignature}
          setLabSignature={setLabSignature}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CARD VIEW
// ═══════════════════════════════════════════════════════════════════════
function CardView({ requests, isLoading, activeTab, formatDate, onSelectRequest, handlePrint }: any) {
  const tab = STATUS_SECTIONS.find((t: any) => t.key === activeTab);
  const Icon = tab?.icon || ClipboardList;

  return (
    <div id="lab-queue-print">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={20} className="text-[#00703C]" />
          <h2 className="text-lg font-bold text-slate-800">{tab?.label}</h2>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{requests.length}</span>
        </div>
        <button onClick={() => handlePrint("lab-queue-print")}
          className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold transition no-print">
          <Printer size={14} /> Print
        </button>
      </div>

      {isLoading && requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <RefreshCw size={36} className="mx-auto text-slate-200 mb-4 animate-spin" />
          <p className="font-bold text-slate-400">Loading laboratory requests…</p>
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <FlaskConical size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-400 text-lg">No requests in this section</p>
        </div>
      )}

      {requests.map((req: LabRequestItem) => (
        <LabRequestCard key={req.id} req={req} onClick={() => onSelectRequest(req)} formatDate={formatDate} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORKLIST TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════
function WorklistTableView({ requests, formatDate, formatDuration, tatStatusClass, onSelectRequest, selectedIds, selectAll, toggleSelectAll, toggleSelect, sortField, sortDir, onSort }: any) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowRight size={10} className="rotate-90 opacity-30" />;
    return <ArrowRight size={10} className={`rotate-90 ${sortDir === "asc" ? "rotate-270" : ""}`} />;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700", SPECIMEN_COLLECTED: "bg-blue-100 text-blue-700",
      PROCESSING: "bg-indigo-100 text-indigo-700", AWAITING_VALIDATION: "bg-purple-100 text-purple-700",
      COMPLETED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || "bg-slate-100 text-slate-600"}`}>{status.replace(/_/g, " ")}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 w-10">
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300" />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("specimenId")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Specimen ID <SortIcon field="specimenId" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("patientNumber")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Patient # <SortIcon field="patientNumber" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("lastName")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Patient Name <SortIcon field="lastName" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("testName")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Test / Panel <SortIcon field="testName" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("requestedBy")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Clinician <SortIcon field="requestedBy" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("referralSource")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Dept <SortIcon field="referralSource" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("priority")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Priority <SortIcon field="priority" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("specimenType")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Specimen <SortIcon field="specimenType" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("status")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Status <SortIcon field="status" />
                </div>
              </th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => onSort("specimenCollectedAt")}>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Collected <SortIcon field="specimenCollectedAt" />
                </div>
              </th>
              <th className="px-3 py-3 text-left">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TAT</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12 text-slate-400 font-semibold">No requests match your criteria</td></tr>
            ) : requests.map((req: LabRequestItem) => {
              const created = req.createdAt;
              const collected = req.specimenCollectedAt;
              const lastEvent = req.validatedAt || req.resultEnteredAt || req.processingStartedAt || collected || created;
              const tatDisplay = req.status === "COMPLETED" && req.validatedAt
                ? formatDuration(created, req.validatedAt)
                : req.processingStartedAt
                  ? formatDuration(req.processingStartedAt, new Date().toISOString())
                  : collected
                    ? formatDuration(collected, new Date().toISOString())
                    : formatDuration(created, new Date().toISOString());

              return (
                <tr key={req.id}
                  onClick={() => onSelectRequest(req)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${req.isCritical ? "bg-red-50/50" : ""} ${selectAll || selectedIds.includes(req.id) ? "bg-[#00703C]/5" : ""}`}>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(req.id)} onChange={() => toggleSelect(req.id)} className="w-4 h-4 rounded border-slate-300" />
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs font-bold text-amber-600">{req.specimenId || "—"}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-[#00703C]">{req.patientNumber}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{req.lastName}, {req.firstName}</span>
                      {req.isEmergency && <AlertTriangle size={10} className="text-red-500" />}
                      {req.isCritical && <ShieldAlert size={10} className="text-red-600" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{req.gender} &middot; {req.age}y</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-slate-700">{req.testName}</span>
                    {req.testPanel && <div className="text-[10px] text-slate-400">{req.testPanel}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">{req.requestedBy}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{req.referralSource || "—"}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[req.priority] || ""}`}>{req.priority}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{req.specimenType || "—"}</td>
                  <td className="px-3 py-3">{statusBadge(req.status)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{req.specimenCollectedAt ? formatDate(req.specimenCollectedAt) : "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tatStatusClass(created, req.status, req.priority)}`}>
                      {tatDisplay}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 border-t border-slate-200">
        {requests.length} request{requests.length !== 1 ? "s" : ""} &middot; Click a row to open details
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LAB REQUEST CARD
// ═══════════════════════════════════════════════════════════════════════
function LabRequestCard({ req, onClick, formatDate }: { req: LabRequestItem; onClick: () => void; formatDate: (iso: string) => string }) {
  const priorityColor = PRIORITY_COLORS[req.priority] || PRIORITY_COLORS.ROUTINE;
  const StatusIcon = req.status === "COMPLETED" ? CheckCircle : req.status === "REJECTED" ? XCircle :
    req.status === "SPECIMEN_COLLECTED" ? Droplets : req.status === "PROCESSING" ? Microscope :
    req.status === "AWAITING_VALIDATION" ? BadgeCheck : ClipboardList;

  const elapsed = req.createdAt ? Math.round((Date.now() - new Date(req.createdAt).getTime()) / 60000) : 0;
  const tatDisplay = elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;
  const tatColor = elapsed > (req.priority === "STAT" ? 60 : req.priority === "URGENT" ? 120 : 240) ? "text-red-500" :
    elapsed > (req.priority === "STAT" ? 30 : req.priority === "URGENT" ? 60 : 120) ? "text-amber-500" : "text-green-500";

  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-4 md:p-5 mb-3 cursor-pointer transition-all hover:shadow-md hover:border-[#00703C]/30 ${req.isEmergency ? "border-l-4 border-l-red-500" : "border-l-4 border-l-[#00703C]"} ${req.isCritical ? "ring-2 ring-red-200" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-mono text-xs font-extrabold text-[#00703C] bg-green-50 px-2 py-0.5 rounded-md border border-green-100">{req.patientNumber}</span>
            {req.specimenId && <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">#{req.specimenId}</span>}
            {req.isEmergency && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> EMERGENCY</span>}
            {req.isCritical && <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><ShieldAlert size={10} /> CRITICAL</span>}
          </div>

          <h3 className="text-base font-bold text-slate-800 truncate">{req.lastName}, {req.firstName}</h3>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span>{req.gender} &middot; {req.age} yrs</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-700">{req.testName}</span>
            {req.testPanel && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{req.testPanel}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
            <span>Dr: <strong className="text-slate-600">{req.requestedBy}</strong></span>
            <span>Dept: <strong className="text-slate-600">{req.referralSource || "—"}</strong></span>
            <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(req.createdAt)}</span>
            <span className={`flex items-center gap-1 font-bold ${tatColor}`}>
              <Timer size={10} /> {tatDisplay}
            </span>
          </div>

          {req.specimenType && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{req.specimenType}</span>
              {req.analyzerType && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold">{req.analyzerType}</span>}
            </div>
          )}

          {req.clinicalNotes && (
            <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 italic border border-slate-100">
              &ldquo;{req.clinicalNotes}&rdquo;
            </div>
          )}
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-3 flex-shrink-0">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${priorityColor}`}>{req.priority}</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <StatusIcon size={14} className={req.status === "COMPLETED" ? "text-green-600" : req.status === "REJECTED" ? "text-red-500" : req.status === "AWAITING_VALIDATION" ? "text-purple-500" : "text-slate-400"} />
            <span>{req.status.replace(/_/g, " ")}</span>
          </div>
          <ArrowRight size={16} className="text-slate-300 md:mt-1" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LAB REQUEST DETAIL — Full Workup View
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function LabRequestDetail({ request, onBack, onRefresh, callLabApi, formatDate, formatDateShort, handlePrint, user, setShowHistoryPanel, setHistoryPatientId, setShowSharePanel, setShowCriticalPanel, setShowAnalyzerPanel, setReportRequest }: any) {
  const [activeWorkTab, setActiveWorkTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [specimenType, setSpecimenType] = useState(request.specimenType || "");
  const [collectedByName, setCollectedByName] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCategory, setRejectionCategory] = useState("");
  const [resultEntries, setResultEntries] = useState<TestResultEntry[]>(() => { if (request.results) { try { const p = JSON.parse(request.results); if (Array.isArray(p)) return p; } catch {} } return [{ test: request.testName, result: "", unit: "", referenceRange: "", flag: "normal" }]; });
  const [enteredByName, setEnteredByName] = useState("");
  const [isCritical, setIsCritical] = useState(request.isCritical);
  const [criticalNote, setCriticalNote] = useState(request.criticalNote || "");
  const [validatedByName, setValidatedByName] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>(() => { if (request.attachments) { try { return JSON.parse(request.attachments); } catch { return []; } } return []; });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chain, setChain] = useState<ChainOfCustodyEntry[]>(() => { if (request.chainOfCustody) { try { return JSON.parse(request.chainOfCustody); } catch { return []; } } return []; });
  const addResultRow = () => setResultEntries([...resultEntries, { test: "", result: "", unit: "", referenceRange: "", flag: "normal" }]);
  const updateResult = (idx: number, field: string, value: string) => {
    const updated = [...resultEntries]; (updated[idx] as any)[field] = value;
    if (field === "result" && value && updated[idx].referenceRange) {
      const v = parseFloat(value); const m = updated[idx].referenceRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (m && !isNaN(v)) { const lo = parseFloat(m[1]), hi = parseFloat(m[2]); (updated[idx] as any).flag = v < lo ? "low" : v > hi ? "high" : "normal"; }
    }
    setResultEntries(updated);
  };
  const removeResultRow = (idx: number) => { if (resultEntries.length > 1) setResultEntries((resultEntries as any[]).filter((_: any, i: number) => i !== idx)); };
  const handleRecordSpecimen = async () => { if (!specimenType) return; setIsSaving(true); try { const r = await callLabApi("RECORD_SPECIMEN", { id: request.id, specimenType, collectedByName: collectedByName || undefined }); setChain([...chain, { action: "SPECIMEN_COLLECTED", by: collectedByName || "Unknown", at: new Date().toISOString(), from: "REQUEST", to: "COLLECTION" }]); onRefresh(); alert("Collected. Label: " + r.specimenId); } catch (e: any) { alert(e.message); } finally { setIsSaving(false); } };
  const handleRejectSpecimen = async () => { if (!rejectionReason) { alert("Provide a reason"); return; } if (!confirm("Reject?")) return; setIsSaving(true); try { await callLabApi("REJECT_SPECIMEN", { id: request.id, rejectionReason, rejectedBy: user?.fullName }); onRefresh(); } catch (e: any) { alert(e.message); } finally { setIsSaving(false); } };
  const handleStartProcessing = async () => { setIsSaving(true); try { await callLabApi("SET_PROCESSING", { id: request.id, processingStartedBy: user?.fullName }); onRefresh(); } catch (e: any) { alert(e.message); } finally { setIsSaving(false); } };
  const handleSaveResults = async () => { const ne = resultEntries.filter((r: any) => r.test && r.result); if (!ne.length || !enteredByName) { alert("Fill results and name"); return; } setIsSaving(true); try { await callLabApi("ENTER_RESULTS", { id: request.id, results: JSON.stringify(ne), enteredByName, isCritical, criticalNote: criticalNote || undefined }); onRefresh(); alert("Saved"); } catch (e: any) { alert(e.message); } finally { setIsSaving(false); } };
  const handleValidateResults = async () => { if (!validatedByName) { alert("Enter your name"); return; } if (!confirm("Validate?")) return; setIsSaving(true); try { await callLabApi("VALIDATE_RESULTS", { id: request.id, validatedByName }); onRefresh(); alert("Published"); } catch (e: any) { alert(e.message); } finally { setIsSaving(false); } };
  const handleFileAttach = async (e: any) => { const f = e.target.files?.[0]; if (!f) return; try { const fd = new FormData(); fd.append("file", f); const uploadRes = await fetch("/api/laboratory/upload", { method: "POST", body: fd }); const uploadData = await uploadRes.json(); if (!uploadData.success) { alert(uploadData.error || "Upload failed"); return; } const a = uploadData.attachment; await callLabApi("ATTACH_FILE", { id: request.id, attachment: a }); setAttachments([...attachments, a]); } catch (e: any) { alert(e.message); } if (fileInputRef.current) fileInputRef.current.value = ""; };
  const storedResults: TestResultEntry[] = (() => { if (request.results) { try { const p = JSON.parse(request.results); if (Array.isArray(p)) return p; } catch {} } return []; })();
  const canCollect = request.status === "PENDING" || request.status === "REJECTED";
  const canProcess = request.status === "SPECIMEN_COLLECTED";
  const canEnter = request.status === "SPECIMEN_COLLECTED" || request.status === "PROCESSING";
  const canValidate = request.status === "AWAITING_VALIDATION";
  const isCompleted = request.status === "COMPLETED";

  const tat = useMemo(() => {
    const o: Record<string, string | null> = { requestReceived: request.createdAt, specimenCollected: request.specimenCollectedAt, processingStarted: request.processingStartedAt, resultsEntered: request.resultEnteredAt, validated: request.validatedAt, collectionToProcessing: null, processingToResults: null, resultsToValidation: null, totalTAT: null };
    if (o.specimenCollected && o.processingStarted) o.collectionToProcessing = formatDuration(o.specimenCollected, o.processingStarted);
    if (o.processingStarted && o.resultsEntered) o.processingToResults = formatDuration(o.processingStarted, o.resultsEntered);
    if (o.resultsEntered && o.validated) o.resultsToValidation = formatDuration(o.resultsEntered, o.validated);
    if (o.requestReceived && o.validated) o.totalTAT = formatDuration(o.requestReceived, o.validated);
    else if (o.requestReceived) o.totalTAT = Math.round((Date.now() - new Date(o.requestReceived).getTime()) / 60000) + "m (pending)";
    return o;
  }, [request]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#00703C] font-semibold text-sm mb-4"><ArrowRight size={16} className="rotate-180" /> Back</button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#00703C]/10 flex items-center justify-center text-[#00703C] font-black text-lg">{request.firstName[0]}{request.lastName[0]}</div>
            <div><div className="flex items-center gap-2 flex-wrap"><h2 className="text-xl font-bold text-slate-800">{request.lastName}, {request.firstName}</h2><span className="font-mono text-xs font-extrabold text-[#00703C] bg-green-50 px-2 py-0.5 rounded-md">{request.patientNumber}</span>{request.isEmergency && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">EMERGENCY</span>}{request.isCritical && <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">CRITICAL</span>}</div>
              <p className="text-sm text-slate-500 mt-1">{request.gender} &middot; {request.age}y &middot; {formatDate(request.createdAt)}</p></div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0"><span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${PRIORITY_COLORS[request.priority]}`}>{request.priority}</span><span className={`text-xs font-bold px-3 py-1 rounded-full ${isCompleted ? "bg-green-50 text-green-700 border-green-200" : request.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" : request.status === "AWAITING_VALIDATION" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{request.status.replace(/_/g, " ")}</span></div>
        </div>
      </div>

      {/* Quick action buttons */}
      {!isCompleted && request.status !== "REJECTED" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {canCollect && <button onClick={() => setActiveWorkTab("specimen")} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-amber-100"><Droplets size={14} /> Collect</button>}
          {canProcess && <button onClick={handleStartProcessing} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-indigo-100"><Microscope size={14} /> Process</button>}
          {canEnter && <button onClick={() => setActiveWorkTab("results")} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-blue-100"><FileText size={14} /> Results</button>}
          {canValidate && <button onClick={() => setActiveWorkTab("validation")} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-purple-100"><BadgeCheck size={14} /> Validate</button>}
          {request.status === "PROCESSING" && <button onClick={() => setShowAnalyzerPanel(true)} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-purple-100"><Cpu size={14} /> Analyzer</button>}
          <button onClick={() => setReportRequest(request)} className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-green-100"><Printer size={14} /> Report</button>
          <button onClick={() => { setHistoryPatientId(request.id); setShowHistoryPanel(true); }} className="flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-slate-100"><History size={14} /> History</button>
          {storedResults.length > 0 && <button onClick={() => setShowSharePanel(true)} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-blue-100"><Send size={14} /> Share</button>}
          {request.isCritical && <button onClick={() => setShowCriticalPanel(true)} className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-red-100"><ShieldAlert size={14} /> Critical</button>}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200">
        {[{ key: "overview", label: "Overview & TAT", icon: Activity },{ key: "specimen", label: "Specimen", icon: Droplets, disabled: isCompleted },{ key: "results", label: "Results Entry", icon: Microscope, disabled: isCompleted && !!request.results },{ key: "validation", label: "Validation", icon: BadgeCheck, disabled: !canValidate && !isCompleted },{ key: "attachments", label: "Attachments", icon: Upload }].map((tab: any) => {
          const Icon = tab.icon;
          return <button key={tab.key} onClick={() => setActiveWorkTab(tab.key)} disabled={tab.disabled} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition ${activeWorkTab === tab.key ? "bg-white text-[#00703C] border-t border-l border-r border-slate-200 -mb-px shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"} ${tab.disabled ? "opacity-30 cursor-not-allowed" : ""}`}><Icon size={16} /> {tab.label}</button>;
        })}
      </div>

      {/* Overview Tab */}
      {activeWorkTab === "overview" && (<div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4"><Activity size={16} className="inline text-[#00703C] mr-2" />Turnaround Time (TAT)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Received</p><p className="text-xs font-semibold mt-1">{tat.requestReceived ? formatDateShort(tat.requestReceived) : "—"}</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-blue-500 uppercase">Collected</p><p className="text-xs font-semibold text-blue-700 mt-1">{tat.specimenCollected ? formatDateShort(tat.specimenCollected) : "—"}</p>{tat.collectionToProcessing && <p className="text-[10px] text-blue-400">{tat.collectionToProcessing}</p>}</div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-indigo-500 uppercase">Processing</p><p className="text-xs font-semibold text-indigo-700 mt-1">{tat.processingStarted ? formatDateShort(tat.processingStarted) : "—"}</p>{tat.processingToResults && <p className="text-[10px] text-indigo-400">{tat.processingToResults}</p>}</div>
            <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-purple-500 uppercase">Results</p><p className="text-xs font-semibold text-purple-700 mt-1">{tat.resultsEntered ? formatDateShort(tat.resultsEntered) : "—"}</p>{tat.resultsToValidation && <p className="text-[10px] text-purple-400">{tat.resultsToValidation}</p>}</div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-green-500 uppercase">Validated</p><p className="text-xs font-semibold text-green-700 mt-1">{tat.validated ? formatDateShort(tat.validated) : "—"}</p>{tat.totalTAT && <p className="text-[10px] text-green-600 font-bold">{tat.totalTAT}</p>}</div>
          </div>
        </div>

        {storedResults.length > 0 && (<div id="lab-report-print" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex justify-between mb-4"><h3 className="text-sm font-bold text-slate-700"><FileText size={16} className="inline text-[#00703C] mr-2" /> Results</h3>
            <div className="flex gap-2"><button onClick={() => setReportRequest(request)} className="text-xs font-semibold text-[#00703C] hover:text-green-700"><Printer size={14} className="inline mr-1" /> Report</button><button onClick={() => setShowSharePanel(true)} className="text-xs font-semibold text-blue-600"><Send size={14} className="inline mr-1" /> Share</button></div></div>
          <table className="w-full text-sm"><thead><tr className="bg-slate-50"><th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase border-b">Test</th><th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase border-b">Result</th><th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase border-b">Unit</th><th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase border-b">Range</th><th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase border-b">Flag</th></tr></thead>
            <tbody>{storedResults.map((r: any, i: number) => (<tr key={i} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold text-slate-700">{r.test}</td><td className={`px-4 py-3 font-bold ${r.flag === "high" || r.flag === "critical" ? "text-red-600" : r.flag === "low" ? "text-amber-600" : "text-slate-800"}`}>{r.result}</td><td className="px-4 py-3 text-slate-500">{r.unit}</td><td className="px-4 py-3 text-slate-500">{r.referenceRange}</td><td className="px-4 py-3"><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.flag === "critical" || r.flag === "high" ? "bg-red-50 text-red-700" : r.flag === "low" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{r.flag.toUpperCase()}</span></td></tr>))}</tbody></table>
        </div>)}

        {isCompleted && (<div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center"><CheckCircle size={40} className="mx-auto text-green-600 mb-3" /><h3 className="text-lg font-bold text-green-800">Report Published</h3><p className="text-sm text-green-600">Validated by {request.validatedByName} on {formatDate(request.validatedAt || "")}</p></div>)}
        {request.status === "REJECTED" && (<div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center"><XCircle size={40} className="mx-auto text-orange-500 mb-3" /><h3 className="text-lg font-bold text-orange-800">Rejected: {request.rejectionReason}</h3></div>)}
      </div>)}

      {/* Specimen Tab */}
      {activeWorkTab === "specimen" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4"><Droplets size={16} className="text-[#00703C] inline mr-2" />Collect Specimen</h3>
          <div className="space-y-4">
            <select value={specimenType} onChange={(e) => setSpecimenType(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold bg-white outline-none focus:border-[#00703C]"><option value="">Select type</option>{SPECIMEN_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
            <input value={collectedByName} onChange={(e) => setCollectedByName(e.target.value)} placeholder="Collector name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#00703C]" />
            <button onClick={handleRecordSpecimen} disabled={!specimenType || isSaving} className="w-full flex items-center justify-center gap-2 bg-[#00703C] hover:bg-green-800 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">{isSaving ? "Saving..." : <><Droplets size={16} /> Record & Generate Barcode</>}</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 text-red-600"><XCircle size={16} className="inline mr-2" />Reject Specimen</h3>
          <div className="space-y-4">
            <select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold bg-white outline-none focus:border-red-400"><option value="">Select reason</option>{REJECTION_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}</select>
            <button onClick={handleRejectSpecimen} disabled={!rejectionReason || isSaving} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">{isSaving ? "Processing..." : <><XCircle size={16} /> Reject & Log</>}</button>
          </div>
        </div>
      </div>)}

      {/* Results Tab */}
      {activeWorkTab === "results" && (<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between mb-4"><h3 className="text-sm font-bold text-slate-700"><Microscope size={16} className="text-[#00703C] inline mr-2" />Results Entry</h3>
          <div className="flex gap-2"><button onClick={() => setShowAnalyzerPanel(true)} className="text-xs font-bold text-purple-600 hover:text-purple-700"><Cpu size={14} className="inline mr-1" /> Analyzer</button><button onClick={addResultRow} className="text-xs font-bold text-[#00703C]"><Plus size={14} className="inline mr-1" /> Add</button></div></div>
        {resultEntries.map((entry: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-3 mb-2">
            <div className="col-span-3"><input list="common-tests" value={entry.test} onChange={(e) => updateResult(idx, "test", e.target.value)} placeholder="Test" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#00703C]" /></div>
            <div className="col-span-2"><input value={entry.result} onChange={(e) => updateResult(idx, "result", e.target.value)} placeholder="Value" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#00703C]" /></div>
            <div className="col-span-2"><input value={entry.unit} onChange={(e) => updateResult(idx, "unit", e.target.value)} placeholder="Unit" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00703C]" /></div>
            <div className="col-span-3"><input value={entry.referenceRange} onChange={(e) => updateResult(idx, "referenceRange", e.target.value)} placeholder="Range" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00703C]" /></div>
            <div className="col-span-1"><span className={`text-[10px] font-extrabold px-2 py-1 rounded-full block text-center ${entry.flag === "critical" || entry.flag === "high" ? "bg-red-50 text-red-700" : entry.flag === "low" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{entry.flag.toUpperCase()}</span></div>
            <div className="col-span-1 text-right"><button onClick={() => removeResultRow(idx)} className="text-slate-300 hover:text-red-500" disabled={resultEntries.length <= 1}><Trash2 size={14} /></button></div>
          </div>
        ))}
        <datalist id="common-tests">{COMMON_PANELS.map((p: string) => (<option key={p} value={p} />))}</datalist>
        <div className="mt-4 space-y-3 border-t pt-4">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} className="w-4 h-4" /><span className="text-sm font-bold text-slate-700">Mark Critical</span></label>
          {isCritical && <textarea value={criticalNote} onChange={(e) => setCriticalNote(e.target.value)} placeholder="Critical note..." rows={2} className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm outline-none" />}
          <input value={enteredByName} onChange={(e) => setEnteredByName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#00703C]" />
          <button onClick={handleSaveResults} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">{isSaving ? "Saving..." : <><Save size={16} className="inline mr-2" /> Save & Submit</>}</button>
        </div>
      </div>)}

      {/* Validation Tab */}
      {activeWorkTab === "validation" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"><h3 className="text-sm font-bold text-slate-700 mb-4"><Eye size={16} className="text-[#00703C] inline mr-2" />Preview</h3>
          {storedResults.length > 0 ? <table className="w-full text-sm"><thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Test</th><th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Result</th><th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Flag</th></tr></thead>
            <tbody>{storedResults.map((r: any, i: number) => (<tr key={i} className="border-b border-slate-50"><td className="px-3 py-2 font-semibold">{r.test}</td><td className="px-3 py-2 font-bold">{r.result} {r.unit}</td><td className="px-3 py-2"><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.flag === "critical" || r.flag === "high" ? "bg-red-50 text-red-700" : r.flag === "low" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{r.flag.toUpperCase()}</span></td></tr>))}</tbody></table> : <p className="text-slate-400 text-sm italic">No results.</p>}</div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"><h3 className="text-sm font-bold text-slate-700 mb-4 text-purple-600"><BadgeCheck size={16} className="inline mr-2" />Validate</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4"><strong>Before validating:</strong> Verify results are accurate.{request.isCritical && <span className="text-red-600 font-bold block">This result is CRITICAL.</span>}</div>
          <input value={validatedByName} onChange={(e) => setValidatedByName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-purple-500 mb-4" />
          <button onClick={handleValidateResults} disabled={!validatedByName || isSaving} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">{isSaving ? "Validating..." : <><BadgeCheck size={18} className="inline mr-2" /> Validate & Publish</>}</button>
        </div>
      </div>)}

      {/* Attachments Tab */}
      {activeWorkTab === "attachments" && (<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4"><Upload size={16} className="text-[#00703C] inline mr-2" />Attachments</h3>
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center hover:border-[#00703C] hover:bg-green-50/30 cursor-pointer"><Upload size={36} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-500">Click to upload</p><input ref={fileInputRef} type="file" onChange={handleFileAttach} className="hidden" /></div>
        {attachments.map((a: any, i: number) => (<a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mt-2 border hover:bg-blue-50 hover:border-blue-200 transition-colors"><FileText size={18} className="text-slate-400 flex-shrink-0" /><span className="text-sm font-semibold flex-1 truncate">{a.name}</span><ExternalLink size={14} className="text-blue-500 flex-shrink-0" /></a>))}
      </div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CRITICAL RESULTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function CriticalResultsPanel({ onClose, callLabApi, formatDate, allRequests, user, onRefresh }: any) {
  const [notifMethod, setNotifMethod] = useState("PHONE");
  const [notifiedPerson, setNotifiedPerson] = useState("");
  const [notifiedDept, setNotifiedDept] = useState("");
  const [notifNotes, setNotifNotes] = useState("");
  const [selectedLabReq, setSelectedLabReq] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [pastNotifs, setPastNotifs] = useState<any[]>([]);
  useEffect(() => { fetch("/api/laboratory?action=critical_notifications").then(r => r.json()).then(d => { if (d.success) setPastNotifs(d.notifications); }).catch(() => {}); }, []);
  const criticalItems = allRequests.filter((r: any) => r.isCritical && r.status !== "COMPLETED");
  const handleRecord = async () => {
    if (!selectedLabReq || !notifiedPerson || !notifMethod) { alert("Fill all required fields"); return; } setSaving(true);
    try { const req = allRequests.find((r: any) => r.id === selectedLabReq); await callLabApi("RECORD_CRITICAL_NOTIFICATION", { labRequestId: selectedLabReq, patientId: req?.patientId || 0, notifiedPerson, notifiedDept, notificationMethod: notifMethod, notes: notifNotes || undefined }); alert("Recorded"); setNotifiedPerson(""); setNotifNotes(""); setSelectedLabReq(""); onRefresh(); } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><ShieldAlert size={20} /> Critical Results</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="p-6 space-y-6">
          {criticalItems.length > 0 && (<div className="bg-red-50 border border-red-200 rounded-xl p-4"><h3 className="text-sm font-bold text-red-700 mb-2">Active ({criticalItems.length})</h3>{criticalItems.map((r: any) => (<div key={r.id} className="flex justify-between bg-white rounded-lg px-3 py-2 border border-red-100 mb-1"><span className="font-semibold text-sm">{r.lastName}, {r.firstName} — {r.testName}</span><span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span></div>))}</div>)}
          <div className="bg-slate-50 rounded-xl p-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Record Notification</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3"><select value={selectedLabReq} onChange={(e) => setSelectedLabReq(e.target.value ? parseInt(e.target.value) : "")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"><option value="">Select...</option>{allRequests.filter((r: any) => r.isCritical).map((r: any) => (<option key={r.id} value={r.id}>{r.lastName}, {r.firstName}</option>))}</select>
                <select value={notifMethod} onChange={(e) => setNotifMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400">{CRITICAL_METHODS.map((m: string) => (<option key={m} value={m}>{m.replace(/_/g, " ")}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-3"><input value={notifiedPerson} onChange={(e) => setNotifiedPerson(e.target.value)} placeholder="Notified person *" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400" />
                <select value={notifiedDept} onChange={(e) => setNotifiedDept(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"><option value="">Department</option>{DEPARTMENTS.map((d: string) => (<option key={d} value={d}>{d}</option>))}</select></div>
              <textarea value={notifNotes} onChange={(e) => setNotifNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400" />
              <button onClick={handleRecord} disabled={saving} className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-30">{saving ? "..." : <><ShieldAlert size={16} className="inline mr-1" /> Record</>}</button>
            </div>
          </div>
          {pastNotifs.length > 0 && (<div><h3 className="text-sm font-bold text-slate-700 mb-3">History</h3><div className="space-y-2 max-h-60 overflow-y-auto">{pastNotifs.map((n: any) => (<div key={n.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border"><div className={`w-2 h-2 rounded-full mt-1.5 ${n.acknowledgedAt ? "bg-green-500" : "bg-red-500 animate-pulse"}`} /><div className="flex-1"><p className="text-xs font-bold">{n.notifiedPerson} — {n.notificationMethod}{n.acknowledgedAt ? ` (acknowledged)` : " (pending)"}</p><p className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</p></div></div>))}</div></div>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SHARE RESULT PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function ShareResultPanel({ request, onClose, callLabApi, user }: any) {
  const [targetDept, setTargetDept] = useState(""); const [shareNote, setShareNote] = useState(""); const [saving, setSaving] = useState(false);
      const handleShare = async () => { if (!request || !targetDept) { alert("Select a department"); return; } setSaving(true); try { await callLabApi("SHARE_RESULT", { labRequestId: request.id, patientId: request.patientId, sharedById: user?.staffId || user?.id || 0, sharedByName: user?.fullName || "Lab", targetDept, note: shareNote || undefined }); alert(`Shared with ${targetDept}`); onClose(); } catch (e: any) { alert(e.message); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><Send size={20} /> Share Result</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs font-bold text-slate-400 uppercase">Patient</p><p className="font-bold">{request?.lastName}, {request?.firstName} <span className="text-[#00703C] font-mono">{request?.patientNumber}</span></p></div>
          <select value={targetDept} onChange={(e) => setTargetDept(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"><option value="">Select department</option>{DEPARTMENTS.map((d: string) => (<option key={d} value={d}>{d}</option>))}</select>
          <textarea value={shareNote} onChange={(e) => setShareNote(e.target.value)} placeholder="Note" rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />
          <button onClick={handleShare} disabled={!targetDept || saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">{saving ? "..." : <><Send size={16} className="inline mr-2" /> Share</>}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// COMMUNICATIONS PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function CommunicationsPanel({ onClose, callLabApi, user, formatDate }: any) {
  const [messages, setMessages] = useState<any[]>([]); const [messageType, setMessageType] = useState("GENERAL"); const [message, setMessage] = useState(""); const [recipientDept, setRecipientDept] = useState(""); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/laboratory?action=communications").then(r => r.json()).then(d => { if (d.success) setMessages(d.communications); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const handleSend = async () => { if (!message.trim()) return; setSaving(true); try { await callLabApi("SEND_COMMUNICATION", { messageType, message, senderId: user?.staffId || user?.id || 0, senderName: user?.fullName || "Lab", senderDept: "Laboratory", recipientDept: recipientDept || undefined }); setMessage(""); const r = await fetch("/api/laboratory?action=communications"); const d = await r.json(); if (d.success) setMessages(d.communications); } catch (e: any) { alert(e.message); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 pb-12" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare size={20} /> Lab Communications</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="p-4 border-b space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-purple-500"><option value="GENERAL">General</option><option value="CLARIFICATION">Clarification</option><option value="SPECIMEN_ISSUE">Specimen Issue</option><option value="REPEAT_REQUEST">Repeat Request</option><option value="CRITICAL_ALERT">Critical Alert</option></select>
            <select value={recipientDept} onChange={(e) => setRecipientDept(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-purple-500"><option value="">All Depts</option>{DEPARTMENTS.map((d: string) => (<option key={d} value={d}>{d}</option>))}</select>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type message..." rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-500" />
          <button onClick={handleSend} disabled={!message.trim() || saving} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 px-5 rounded-xl font-bold text-sm disabled:opacity-30">{saving ? "..." : <><Send size={14} /> Send</>}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? <RefreshCw size={24} className="animate-spin mx-auto text-slate-300 mt-8" /> : messages.length === 0 ? <p className="text-center text-slate-400 py-8">No messages</p> : messages.map((m: any) => (
            <div key={m.id} className={`rounded-xl p-3 border ${m.messageType === "CRITICAL_ALERT" ? "bg-red-100 border-red-300" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex justify-between mb-1"><span className="text-xs font-bold text-purple-600">{m.senderName}</span><span className="text-[10px] text-slate-400">{formatDate(m.createdAt)}</span></div>
              <p className="text-sm text-slate-700">{m.message}</p>{m.recipientDept && <p className="text-[10px] text-slate-400 mt-1">To: {m.recipientDept}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PATIENT HISTORY PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function PatientHistoryPanel({ patientId, onClose, formatDate }: any) {
  const [history, setHistory] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!patientId) return; fetch(`/api/laboratory?action=patient_history&patientId=${patientId}`).then(r => r.json()).then(d => { if (d.success) setHistory(d.history); }).catch(() => {}).finally(() => setLoading(false)); }, [patientId]);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><History size={20} /> Patient Lab History</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="flex-1 overflow-y-auto p-6">{loading ? <RefreshCw size={32} className="animate-spin mx-auto text-slate-300 mt-12" /> : history.length === 0 ? <p className="text-center text-slate-400 py-12">No previous lab records.</p> : history.map((req: any) => {
          const results: TestResultEntry[] = (() => { if (req.results) { try { const p = JSON.parse(req.results); if (Array.isArray(p)) return p; } catch {} } return []; })();
          return (<div key={req.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3">
            <div className="flex justify-between mb-2"><span className="text-sm font-bold">{req.testName}</span><span className="text-xs text-slate-400">{formatDate(req.createdAt)}</span></div>
            {results.length > 0 && <table className="w-full text-xs mt-2"><thead><tr className="bg-slate-100"><th className="px-2 py-1 text-left font-bold">Test</th><th className="px-2 py-1 text-left font-bold">Result</th><th className="px-2 py-1 text-left font-bold">Flag</th></tr></thead><tbody>{results.map((r: any, i: number) => (<tr key={i} className="border-b"><td className="px-2 py-1">{r.test}</td><td className={`px-2 py-1 font-bold ${r.flag === "high" || r.flag === "critical" ? "text-red-600" : ""}`}>{r.result}</td><td className="px-2 py-1"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.flag === "critical" || r.flag === "high" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{r.flag}</span></td></tr>))}</tbody></table>}
          </div>);
        })}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ANALYZER INTEGRATION PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function AnalyzerIntegrationPanel({ request, onClose, callLabApi, onRefresh }: any) {
  const [analyzerType, setAnalyzerType] = useState(""); const [analyzerModel, setAnalyzerModel] = useState(""); const [importedData, setImportedData] = useState<TestResultEntry[]>([]); const [rawData, setRawData] = useState(""); const [importStage, setImportStage] = useState<"select" | "preview" | "imported">("select"); const [saving, setSaving] = useState(false);
  const getPanel = (type: string) => { switch(type) { case "CBC": return CBC_PANEL_TESTS; case "CHEMISTRY": return CHEMISTRY_PANEL_TESTS; default: return []; } };
  const handleSimulate = () => { const p = getPanel(analyzerType); if (!p.length) { alert("No panel for this type"); return; } const s = p.map((pt: any) => { const m = pt.range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/); if (!m) return { test: pt.test, result: "—", unit: pt.unit, referenceRange: pt.range, flag: "normal" }; const lo = parseFloat(m[1]), hi = parseFloat(m[2]), mid = (lo+hi)/2, v = Math.round((mid + (Math.random()-0.5)*(hi-lo)*0.4)*10)/10; return { test: pt.test, result: String(v), unit: pt.unit, referenceRange: pt.range, flag: v < lo ? "low" : v > hi ? "high" : "normal" }; }); setImportedData(s); setRawData(JSON.stringify(s, null, 2)); setImportStage("preview"); };
  const handleConfirm = async () => { if (!importedData.length) return; setSaving(true); try { await callLabApi("IMPORT_ANALYZER_RESULTS", { id: request.id, analyzerType, analyzerResults: importedData, analyzerModel: analyzerModel || undefined }); setImportStage("imported"); onRefresh(); } catch (e: any) { alert(e.message); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><Cpu size={20} /> Analyzer Integration</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {importStage === "select" && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><select value={analyzerType} onChange={(e) => setAnalyzerType(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-purple-500"><option value="">Select analyzer</option>{ANALYZER_TYPES.map((a: any) => (<option key={a.id} value={a.id}>{a.label}</option>))}</select><input value={analyzerModel} onChange={(e) => setAnalyzerModel(e.target.value)} placeholder="Model" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-500" /></div>
            <textarea value={rawData} onChange={(e) => setRawData(e.target.value)} placeholder="Paste raw data or click Simulate..." rows={5} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:border-purple-500" />
            <div className="flex gap-3"><button onClick={handleSimulate} disabled={!analyzerType} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-30"><Cpu size={16} className="inline mr-2" /> Simulate {analyzerType}</button></div>
          </div>)}
          {importStage === "preview" && (<div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-xs font-bold text-amber-700">Preview — {importedData.length} results. Edit if needed.</p></div>
            <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl"><table className="w-full text-sm"><thead><tr className="bg-slate-50 sticky top-0"><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Test</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Result</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Unit</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Range</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Flag</th></tr></thead>
              <tbody>{importedData.map((r, i) => (<tr key={i} className="border-b"><td className="px-3 py-2 text-xs">{r.test}</td><td className="px-3 py-2"><input value={r.result} onChange={(e) => { const u = [...importedData]; u[i].result = e.target.value; setImportedData(u); }} className={`w-20 rounded border px-2 py-1 text-sm font-bold ${r.flag === "high" || r.flag === "critical" ? "text-red-600 border-red-200" : r.flag === "low" ? "text-amber-600 border-amber-200" : "border-slate-200"}`} /></td><td className="px-3 py-2 text-xs text-slate-500">{r.unit}</td><td className="px-3 py-2 text-xs text-slate-500">{r.referenceRange}</td><td className="px-3 py-2"><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.flag === "critical" || r.flag === "high" ? "bg-red-50 text-red-700" : r.flag === "low" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{r.flag.toUpperCase()}</span></td></tr>))}</tbody></table></div>
            <div className="flex gap-3"><button onClick={handleConfirm} disabled={saving} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-30">{saving ? "..." : <><Save size={16} className="inline mr-2" /> Import {importedData.length} results</>}</button><button onClick={() => setImportStage("select")} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm">Back</button></div>
          </div>)}
          {importStage === "imported" && (<div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"><CheckCircle size={40} className="mx-auto text-green-600 mb-3" /><h3 className="text-lg font-bold text-green-800">Import Complete</h3><button onClick={onClose} className="mt-4 bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm">Done</button></div>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE STATS PANEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function StatsPanel({ stats, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#00703C] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl"><h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={20} /> Performance</h2><button onClick={onClose} className="text-white/80 hover:text-white"><XCircle size={20} /></button></div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-blue-700">{stats.totalToday}</p><p className="text-[11px] font-bold text-blue-500 uppercase">Today</p></div>
            <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-amber-700">{stats.pending}</p><p className="text-[11px] font-bold text-amber-500 uppercase">Pending</p></div>
            <div className="bg-green-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-green-700">{stats.completed}</p><p className="text-[11px] font-bold text-green-500 uppercase">Completed</p></div>
            <div className="bg-purple-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-purple-700">{stats.avgTatMinutes}</p><p className="text-[11px] font-bold text-purple-500 uppercase">Avg TAT</p></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-red-600">{stats.rejected}</p><p className="text-[11px] font-bold text-red-500 uppercase">Rejected</p></div>
            <div className="bg-red-100 rounded-xl p-4 text-center"><p className="text-2xl font-black text-red-700">{stats.critical}</p><p className="text-[11px] font-bold text-red-600 uppercase">Critical</p></div>
            <div className="bg-amber-100 rounded-xl p-4 text-center"><p className="text-2xl font-black text-amber-700">{stats.urgent}</p><p className="text-[11px] font-bold text-amber-600 uppercase">Urgent</p></div>
            <div className="bg-teal-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-teal-700">{stats.pending + stats.completed}</p><p className="text-[11px] font-bold text-teal-500 uppercase">Total</p></div>
          </div>
          {stats.departments.length > 0 && <div><h3 className="text-sm font-bold text-slate-700 mb-3"><Building2 size={16} className="inline text-[#00703C] mr-2" />Department Workload</h3>{stats.departments.map((d: any, i: number) => (<div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-2"><span className="text-sm font-semibold flex-1">{d.referralSource || "Unknown"}</span><span className="font-bold text-[#00703C]">{d._count}</span></div>))}</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// REPORT PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function ReportPreviewModal({ request, onClose, formatDate, handlePrint, labSignature, setLabSignature }: any) {
  const results: TestResultEntry[] = (() => { if (request.results) { try { const p = JSON.parse(request.results); if (Array.isArray(p)) return p; } catch {} } return []; })();
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white shadow-2xl w-full max-w-4xl mx-4 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#00703C] text-white px-6 py-4 flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2"><FileText size={20} /> Report</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <input type="text" placeholder="Tech signature..." value={labSignature} onChange={(e) => setLabSignature(e.target.value)}
                className="bg-transparent text-white text-xs placeholder-white/50 border-b border-white/30 w-28 focus:outline-none" />
            </div>
            <button onClick={() => handlePrint("report-content")} className="bg-white text-[#00703C] px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-50"><Printer size={16} className="inline mr-1" /> Print</button>
            <button onClick={onClose} className="text-white/80"><XCircle size={20} /></button>
          </div>
        </div>
        <div id="report-content" className="p-8 max-h-[80vh] overflow-y-auto">
          <div className="text-center border-b-2 border-[#00703C] pb-6 mb-6">
            <div className="flex items-center justify-center gap-4 mb-3"><Image src="/Images/LOGO.jpg" alt="Logo" width={70} height={70} className="rounded-full" /><div><h1 className="text-2xl font-bold text-[#00703C]">MAIN STREET MEDICAL CENTER</h1><p className="text-sm text-slate-500">Laboratory Report</p></div></div>
            <div className="grid grid-cols-2 gap-x-8 text-xs text-slate-500 mt-3"><span>Report #: <strong>LAB-RPT-{String(request.id).padStart(6, "0")}</strong></span><span>Date: <strong>{formatDate(request.validatedAt || request.createdAt)}</strong></span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Patient</h4><p className="font-bold">{request.lastName}, {request.firstName}</p><p className="font-mono text-[#00703C] font-bold">{request.patientNumber}</p><p>{request.gender} / {request.age}y</p></div>
            <div className="bg-slate-50 rounded-xl p-4"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Investigation</h4><p className="font-bold">{request.testName}</p><p>Doctor: {request.requestedBy}</p><p>Specimen: {request.specimenId || "—"}</p></div>
          </div>
          {results.length > 0 && <table className="w-full border-collapse mb-6"><thead><tr className="bg-[#00703C]/10"><th className="border border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase">#</th><th className="border border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase">Investigation</th><th className="border border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase">Result</th><th className="border border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase">Unit</th><th className="border border-slate-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase">Range</th><th className="border border-slate-200 px-4 py-2.5 text-center text-[11px] font-bold uppercase">Flag</th></tr></thead>
            <tbody>{results.map((r: any, i: number) => { const abn = r.flag === "high" || r.flag === "low" || r.flag === "critical"; return (<tr key={i} className={abn ? "bg-red-50/50" : ""}><td className="border border-slate-200 px-4 py-2.5 text-xs">{i+1}</td><td className={`border border-slate-200 px-4 py-2.5 text-sm font-semibold ${abn ? "text-red-700" : ""}`}>{r.test}</td><td className={`border border-slate-200 px-4 py-2.5 text-sm font-bold ${abn ? "text-red-600" : ""}`}>{r.result}</td><td className="border border-slate-200 px-4 py-2.5 text-sm text-slate-500">{r.unit}</td><td className="border border-slate-200 px-4 py-2.5 text-sm text-slate-500">{r.referenceRange}</td><td className="border border-slate-200 px-4 py-2.5 text-center">{abn ? <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.flag === "critical" ? "bg-red-200 text-red-800 animate-pulse" : "bg-amber-100 text-amber-700"}`}>{r.flag === "critical" ? "CRITICAL" : r.flag === "high" ? "HIGH" : "LOW"}</span> : <span className="text-green-600 text-xs">N</span>}</td></tr>); })}</tbody></table>}
          <div className="border-t-2 border-slate-200 pt-6">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="border-t border-slate-300 mt-8 mb-1" />
                <p className="text-xs font-bold text-[#0a2e1a]">{labSignature || "_________________"}</p>
                <p className="text-xs text-slate-400">Lab Technician</p>
              </div>
              <div>
                <div className="border-t border-slate-300 mt-8 mb-1" />
                <p className="text-xs font-bold">{request.validatedByName || "—"}</p>
                <p className="text-xs text-slate-400">Validator</p>
              </div>
              <div>
                <div className="border-t border-slate-300 mt-8 mb-1" />
                <p className="text-xs font-bold">MSMC</p>
                <p className="text-xs text-slate-400">Authorized</p>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-[9px] text-slate-400">Main Street Medical Center &bull; Report {new Date().toLocaleString("en-UG")}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LAB RECORDS VIEW — Complete archive of everything the lab has ever worked on
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
function LabRecordsView({
  records, isLoading, search, setSearch,
  statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
  page, setPage, perPage, total, onRefresh,
  onSelectRequest, formatDate, formatDuration, tatStatusClass,
}: any) {
  const statusBadge = (st: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700", SPECIMEN_COLLECTED: "bg-blue-100 text-blue-700",
      PROCESSING: "bg-indigo-100 text-indigo-700", AWAITING_VALIDATION: "bg-purple-100 text-purple-700",
      COMPLETED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[st] || "bg-slate-100 text-slate-600"}`}>{st.replace(/_/g, " ")}</span>;
  };

  // Filter and sort
  const filtered = useMemo(() => {
    let items = [...records];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r: LabRequestItem) =>
        [r.patientNumber, r.firstName, r.lastName, `${r.firstName} ${r.lastName}`,
          r.testName, r.testPanel, r.specimenId, r.specimenType, r.priority,
          r.status, r.referralSource, r.requestedBy, r.requestedDepartment,
          r.enteredByName, r.validatedByName, r.collectedByName,
        ].some(f => f && f.toLowerCase().includes(q))
      );
    }
    if (statusFilter) items = items.filter((r: LabRequestItem) => r.status === statusFilter);
    if (priorityFilter) items = items.filter((r: LabRequestItem) => r.priority === priorityFilter);
    items.sort((a: LabRequestItem, b: LabRequestItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [records, search, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const allStatuses = records.reduce((acc: string[], r: LabRequestItem) => {
    const s = r.status as string;
    if (!acc.includes(s)) acc.push(s);
    return acc;
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <History size={28} className="text-[#00703C]" />
            Lab Records Archive
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete history &mdash; <strong className="text-[#00703C]">{total}</strong> total records
          </p>
        </div>
        <button onClick={onRefresh} disabled={isLoading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#00703C] text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm">
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search patient, test, specimen, doctor..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus:border-[#00703C] focus:bg-white" />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><XCircle size={16} /></button>}
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00703C] focus:bg-white">
            <option value="">All Statuses</option>
            {allStatuses.map((s: string) => (<option key={s} value={s}>{s.replace(/_/g, " ")}</option>))}
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00703C] focus:bg-white">
            <option value="">All Priorities</option>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="STAT">STAT</option>
          </select>
        </div>
        <div className="text-xs text-slate-400 mt-3">
          Showing {filtered.length > 0 ? (safePage - 1) * perPage + 1 : 0}&ndash;{Math.min(safePage * perPage, filtered.length)} of {filtered.length} records
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw size={36} className="mx-auto text-slate-200 mb-4 animate-spin" />
            <p className="font-bold text-slate-400">Loading all lab records…</p>
          </div>
        ) : paged.length === 0 ? (
          <div className="p-16 text-center">
            <History size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-400 text-lg">No records found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test / Panel</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinician</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dept</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Specimen</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">TAT</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((req: LabRequestItem, idx: number) => {
                  const created = req.createdAt;
                  const collected = req.specimenCollectedAt;
                  const tatDisplay = req.status === "COMPLETED" && req.validatedAt
                    ? formatDuration(created, req.validatedAt)
                    : req.processingStartedAt
                      ? formatDuration(req.processingStartedAt, new Date().toISOString())
                      : collected
                        ? formatDuration(collected, new Date().toISOString())
                        : formatDuration(created, new Date().toISOString());

                  return (
                    <tr key={req.id} onClick={() => onSelectRequest(req)}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${req.isCritical ? "bg-red-50/50" : ""}`}>
                      <td className="px-3 py-3 text-xs text-slate-400 font-mono">{(safePage - 1) * perPage + idx + 1}</td>
                      <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{req.lastName}, {req.firstName}</span>
                          {req.isEmergency && <AlertTriangle size={10} className="text-red-500" />}
                          {req.isCritical && <ShieldAlert size={10} className="text-red-600" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{req.patientNumber} &middot; {req.gender} &middot; {req.age}y</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-700 text-xs">{req.testName}</span>
                        {req.testPanel && <div className="text-[10px] text-slate-400">{req.testPanel}</div>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{req.requestedBy}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{req.referralSource || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        {req.specimenId ? (
                          <div>
                            <span className="font-mono text-[10px] font-bold text-amber-600">{req.specimenId}</span>
                            {req.specimenType && <div className="text-[10px] text-slate-400">{req.specimenType}</div>}
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[req.priority] || ""}`}>{req.priority}</span>
                      </td>
                      <td className="px-3 py-3">{statusBadge(req.status)}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tatStatusClass ? tatStatusClass(created, req.status, req.priority) : ""}`}>
                          {tatDisplay}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-[#00703C] disabled:opacity-40 disabled:cursor-not-allowed transition">
                Previous
              </button>
              <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-[#00703C] disabled:opacity-40 disabled:cursor-not-allowed transition">
                Next
              </button>
            </div>
          </div>
        )}
        {!isLoading && (
          <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 border-t border-slate-200">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} &middot; Click a row to view full details
          </div>
        )}
      </div>
    </div>
  );
}
