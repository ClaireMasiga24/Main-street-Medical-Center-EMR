"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import NotificationInbox from "../components/NotificationInbox";
import StaffMessaging from "../components/StaffMessaging";
import {
  Activity, AlertTriangle, ArrowRight, Baby, Bell, Camera, CheckCircle,
  Clock, Download, FileText, Filter, Image, LogOut, Mic, Monitor,
  PlusCircle, Printer, RefreshCw, Save, Search, Send, Settings,
  ShieldAlert, SlidersHorizontal, Stethoscope, Upload, User, X,
  BarChart3, Calendar, FolderOpen, ListChecks, Scan, ClipboardList,
  Heart, ZoomIn, AlertCircle, ChevronDown, ChevronRight,
  Loader2, Eye, Microscope, Notebook, Radio, Syringe,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phoneNumber: string | null;
  isEmergency: boolean;
  currentStatus: string;
}

interface Visit {
  id: number;
  symptoms: string | null;
  diagnosis: string | null;
  createdAt: string;
}

interface ReferringStaff {
  id: number;
  fullName: string;
}

interface ImagingRequest {
  id: number;
  patientId: number;
  visitId: number | null;
  requestedById: number | null;
  studyType: string;
  priority: string;
  referralSource: string | null;
  clinicalNotes: string | null;
  clinicalHistory: string | null;
  status: string;
  isCritical: boolean;
  criticalNote: string | null;
  imageCount: number;
  findings: string | null;
  impression: string | null;
  conclusion: string | null;
  radiologistNotes: string | null;
  reportedById: number | null;
  reportedAt: string | null;
  measurements: string | null;
  machineResults: string | null;
  machineModel: string | null;
  createdAt: string;
  updatedAt: string;
  Patient: Patient;
  Visit: Visit | null;
  Staff: ReferringStaff | null;
}

// ─── Constants ──────────────────────────────────────────────────────────

const STUDY_TYPES = [
  { value: "X_RAY", label: "X-Ray", icon: Radio },
  { value: "ULTRASOUND", label: "Ultrasound", icon: Baby },
  { value: "CT_SCAN", label: "CT Scan", icon: Monitor },
  { value: "MRI", label: "MRI", icon: Monitor },
  { value: "MAMMOGRAPHY", label: "Mammography", icon: Eye },
  { value: "ECHOCARDIOGRAPHY", label: "Echocardiography", icon: Heart },
  { value: "DOPPLER", label: "Doppler", icon: Activity },
  { value: "FLUOROSCOPY", label: "Fluoroscopy", icon: Microscope },
];

const STATUS_TABS = [
  { value: "", label: "All Studies", color: "#64748b" },
  { value: "ORDERED", label: "Pending", color: "#eab308" },
  { value: "IN_PROGRESS", label: "In Progress", color: "#3b82f6" },
  { value: "AWAITING_INTERPRETATION", label: "Awaiting Report", color: "#f97316" },
  { value: "REPORTED", label: "Reported", color: "#22c55e" },
];

const PRIORITY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  ROUTINE: { label: "Routine", color: "#166534", bg: "#dcfce7" },
  URGENT: { label: "Urgent", color: "#9a3412", bg: "#ffedd5" },
  STAT: { label: "STAT", color: "#991b1b", bg: "#fef2f2" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  ORDERED: { label: "Ordered", color: "#854d0e", bg: "#fef9c3" },
  ACCEPTED: { label: "Accepted", color: "#1e40af", bg: "#dbeafe" },
  IN_PROGRESS: { label: "In Progress", color: "#1e40af", bg: "#dbeafe" },
  AWAITING_INTERPRETATION: { label: "Awaiting Report", color: "#9a3412", bg: "#ffedd5" },
  REPORTED: { label: "Reported", color: "#166534", bg: "#dcfce7" },
  CANCELLED: { label: "Cancelled", color: "#991b1b", bg: "#fef2f2" },
};

const REFERRAL_LABELS: Record<string, string> = {
  RECEPTION: "Reception", TRIAGE: "Triage / Nurse", DOCTOR: "Doctor",
  EMERGENCY: "Emergency Unit", SPECIALIST: "Specialist Clinic", WARD: "Ward",
};

// ─── Helpers ────────────────────────────────────────────────────────────

const studyTypeLabel = (v: string) => STUDY_TYPES.find(s => s.value === v)?.label ?? v;
const referralLabel = (v: string | null) => v ? (REFERRAL_LABELS[v] ?? v) : "—";
const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })
    + " " + dt.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
};
const formatShortDate = (d: string) => {
  const dt = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return dt.toLocaleDateString("en-UG", { day: "2-digit", month: "short" });
};

const inputStyle = (abnormal = false): React.CSSProperties => ({
  width: "100%", padding: "10px 12px", border: `1px solid ${abnormal ? "#f87171" : "#d0d5dd"}`,
  borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
});

// ─── Component ──────────────────────────────────────────────────────────

export default function RadiologyDashboard() {
  const router = useRouter();

  // ── Data State ────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<ImagingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ImagingRequest | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [studyTypeFilter, setStudyTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [criticalFilter, setCriticalFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Report Editor ─────────────────────────────────────────────────────
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [radiologistNotes, setRadiologistNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // ── Stats ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, awaitingReport: 0, reported: 0, critical: 0 });

  // ── Appointments ──────────────────────────────────────────────────────
  const [radAppts, setRadAppts] = useState<any[]>([]);
  const [radApptDate, setRadApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [radApptFilter, setRadApptFilter] = useState("all");
  const [radApptLoading, setRadApptLoading] = useState(false);

  // ── Sidebar ───────────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState("worklist");

  // ── Data Fetching ─────────────────────────────────────────────────────
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (studyTypeFilter) params.set("studyType", studyTypeFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (criticalFilter) params.set("isCritical", "true");
    if (searchQuery) params.set("search", searchQuery);
    return params.toString();
  }, [statusFilter, studyTypeFilter, priorityFilter, criticalFilter, searchQuery]);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const qs = buildQueryString();
      const res = await fetch(`/api/imaging${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load imaging requests");
      const data = await res.json();
      setRequests(data);

      // Compute stats from live data
      setStats({
        total: data.length,
        pending: data.filter((r: ImagingRequest) => r.status === "ORDERED" || r.status === "ACCEPTED").length,
        inProgress: data.filter((r: ImagingRequest) => r.status === "IN_PROGRESS").length,
        awaitingReport: data.filter((r: ImagingRequest) => r.status === "AWAITING_INTERPRETATION").length,
        reported: data.filter((r: ImagingRequest) => r.status === "REPORTED").length,
        critical: data.filter((r: ImagingRequest) => r.isCritical).length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  const fetchRadAppointments = useCallback(async () => {
    setRadApptLoading(true);
    try {
      const params = new URLSearchParams({ department: "Radiology", date: radApptDate });
      if (radApptFilter !== "all") params.set("status", radApptFilter.toUpperCase());
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setRadAppts(data.appointments ?? []);
    } catch { setRadAppts([]); }
    finally { setRadApptLoading(false); }
  }, [radApptDate, radApptFilter]);

  useEffect(() => { fetchRadAppointments(); }, [fetchRadAppointments]);
  useEffect(() => { const i = setInterval(fetchRadAppointments, 15_000); return () => clearInterval(i); }, [fetchRadAppointments]);

  useEffect(() => {
    fetchRequests();
    try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {}
    const interval = setInterval(fetchRequests, 30_000);
    const hb = setInterval(() => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {} }, 120000);
    return () => { clearInterval(interval); clearInterval(hb); };
  }, [fetchRequests]);

  // ── Select Request ────────────────────────────────────────────────────
  const handleSelectRequest = (req: ImagingRequest) => {
    setSelectedRequest(req);
    setFindings(req.findings ?? "");
    setImpression(req.impression ?? "");
    setConclusion(req.conclusion ?? "");
    setRadiologistNotes(req.radiologistNotes ?? "");
    setImageUrls([]);
  };

  // ── Status Updates ────────────────────────────────────────────────────
  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/imaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
      fetchRequests(); // refresh stats
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Save Report ───────────────────────────────────────────────────────
  const saveReport = async (finalize: boolean) => {
    if (!selectedRequest) return;
    setIsSaving(true);
    try {
      const payload: any = {
        id: selectedRequest.id,
        findings,
        impression,
        conclusion,
        radiologistNotes,
      };
      if (finalize) {
        payload.status = "REPORTED";
      } else if (!selectedRequest.findings && findings) {
        payload.status = "AWAITING_INTERPRETATION";
      }

      const res = await fetch("/api/imaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();

      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, ...updated } : r));
      setSelectedRequest(prev => prev ? { ...prev, ...updated } : null);
      if (finalize) alert("Report finalized and will be sent to the referring clinician.");
      else alert("Draft saved.");
      fetchRequests();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Mark Critical ─────────────────────────────────────────────────────
  const toggleCritical = async () => {
    if (!selectedRequest) return;
    try {
      const res = await fetch("/api/imaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequest.id,
          isCritical: !selectedRequest.isCritical,
          criticalNote: !selectedRequest.isCritical ? "Critical finding identified — immediate attention required" : null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setSelectedRequest(prev => prev ? { ...prev, isCritical: !prev.isCritical } : null);
      fetchRequests();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Voice Recording (placeholder) ─────────────────────────────────────
  const toggleRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice-to-text is not supported in this browser. Try Chrome.");
      return;
    }
    setIsRecording(!isRecording);
    if (!isRecording) {
      // In a real implementation, this would start speech recognition
      // and append results to the findings field
      alert("Voice recording started. Speak your findings...");
    }
  };

  // ── Filtered list for the active tab ──────────────────────────────────
  const getFilteredList = () => {
    let list = [...requests];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.Patient.firstName.toLowerCase().includes(q) ||
        r.Patient.lastName.toLowerCase().includes(q) ||
        r.Patient.patientNumber.toLowerCase().includes(q) ||
        r.studyType.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (studyTypeFilter) list = list.filter(r => r.studyType === studyTypeFilter);
    if (priorityFilter) list = list.filter(r => r.priority === priorityFilter);
    if (criticalFilter) list = list.filter(r => r.isCritical);
    return list;
  };

  const filteredRequests = getFilteredList();

  const StatIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock size={20} />;
      case "inProgress": return <Loader2 size={20} />;
      case "awaitingReport": return <FileText size={20} />;
      case "reported": return <CheckCircle size={20} />;
      case "critical": return <AlertTriangle size={20} />;
      default: return <BarChart3 size={20} />;
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Segoe UI','Inter',Arial,sans-serif" }}>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{ width: "270px", backgroundColor: "#00703C", color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid white", overflow: "hidden", flexShrink: 0 }}>
              <img src="/Images/LOGO.jpg" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "bold", lineHeight: 1.2 }}>MAIN STREET</h2>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.8 }}>Radiology & Imaging</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { id: "worklist", label: "Worklist", icon: ClipboardList },
            { id: "pending", label: "Pending Studies", icon: Clock },
            { id: "inProgress", label: "In Progress", icon: Loader2 },
            { id: "awaiting", label: "Awaiting Report", icon: FileText },
            { id: "reported", label: "Reported", icon: CheckCircle },
            { id: "critical", label: "Critical Results", icon: AlertTriangle },
          ].map(tab => {
            const isActive = sidebarTab === tab.id;
            const count = tab.id === "critical" ? stats.critical
              : tab.id === "pending" ? stats.pending
              : tab.id === "inProgress" ? stats.inProgress
              : tab.id === "awaiting" ? stats.awaitingReport
              : tab.id === "reported" ? stats.reported
              : null;
            return (
              <button key={tab.id} onClick={() => setSidebarTab(tab.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                  borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: isActive ? "bold" : "500",
                  backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  color: "#fff", textAlign: "left", transition: "all 0.15s",
                }}>
                {React.createElement(tab.icon, { size: 18 })}
                <span style={{ flex: 1 }}>{tab.label}</span>
                {count !== null && (
                  <span style={{
                    backgroundColor: tab.id === "critical" ? "#dc2626" : "rgba(255,255,255,0.2)",
                    padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold",
                  }}>{count}</span>
                )}
              </button>
            );
          })}
          <button onClick={() => setSidebarTab("appointments")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
              borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: sidebarTab === "appointments" ? "bold" : "500",
              backgroundColor: sidebarTab === "appointments" ? "rgba(255,255,255,0.18)" : "transparent",
              color: "#fff", textAlign: "left", marginTop: "4px",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.target as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.18)"}
            onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = sidebarTab === "appointments" ? "rgba(255,255,255,0.18)" : "transparent"}
          >
            <Calendar size={18} />
            <span style={{ flex: 1 }}>Appointments</span>
          </button>
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Imaging Dept</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", opacity: 0.7 }}>Logged In</p>
          </div>
          <div style={{ marginBottom: "8px" }}><NotificationInbox department="Radiology" /></div>
          <div style={{ marginBottom: "8px" }}><StaffMessaging /></div>
          <button onClick={async () => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: u.id, username: u.username }) }); } } catch {} router.push("/"); }}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "#b91c1c", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{ backgroundColor: "white", borderBottom: "1px solid #e2e8f0", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient, ID, or study..."
                style={{ width: "100%", padding: "10px 12px 10px 38px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", outline: "none", backgroundColor: "#f8fafc" }} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: showFilters ? "#dcfce7" : "white", cursor: "pointer", color: showFilters ? "#00703C" : "#64748b", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold" }}>
              <SlidersHorizontal size={15} /> Filters
            </button>
            <button onClick={fetchRequests} disabled={isLoading}
              style={{ padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}>
              <RefreshCw size={16} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              <Clock size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              {new Date().toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button style={{ width: "38px", height: "38px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={16} />
              {stats.critical > 0 && (
                <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#dc2626", color: "white", fontSize: "9px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {stats.critical}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ── Quick Stats ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", padding: "20px 28px 12px" }}>
          {[
            { label: "Total Studies", count: stats.total, icon: BarChart3, color: "#00703C", bg: "#dcfce7" },
            { label: "Pending", count: stats.pending, icon: Clock, color: "#eab308", bg: "#fef9c3" },
            { label: "In Progress", count: stats.inProgress, icon: Loader2, color: "#3b82f6", bg: "#dbeafe" },
            { label: "Awaiting Report", count: stats.awaitingReport, icon: FileText, color: "#f97316", bg: "#ffedd5" },
            { label: "Reported Today", count: stats.reported, icon: CheckCircle, color: "#22c55e", bg: "#dcfce7" },
            { label: "Critical", count: stats.critical, icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: "white", borderRadius: "12px", padding: "14px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1e293b" }}>{s.count}</p>
                <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        {showFilters && (
          <div style={{ margin: "0 28px 12px", backgroundColor: "white", borderRadius: "12px", padding: "16px 20px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "12px", backgroundColor: "white", outline: "none" }}>
                <option value="">All Statuses</option>
                <option value="ORDERED">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_INTERPRETATION">Awaiting Report</option>
                <option value="REPORTED">Reported</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Study Type</label>
              <select value={studyTypeFilter} onChange={e => setStudyTypeFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "12px", backgroundColor: "white", outline: "none" }}>
                <option value="">All Types</option>
                {STUDY_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Priority</label>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "12px", backgroundColor: "white", outline: "none" }}>
                <option value="">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", color: "#64748b", cursor: "pointer", marginTop: "16px" }}>
              <input type="checkbox" checked={criticalFilter} onChange={e => setCriticalFilter(e.target.checked)} style={{ accentColor: "#dc2626" }} />
              <AlertTriangle size={13} color="#dc2626" /> Critical only
            </label>
          </div>
        )}

        {/* ── APPOINTMENTS VIEW ──────────────────────────────────────────── */}
        {sidebarTab === "appointments" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
              <input type="date" value={radApptDate} onChange={e => setRadApptDate(e.target.value)}
                style={{ fontSize: "13px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", outline: "none" }} />
              <select value={radApptFilter} onChange={e => setRadApptFilter(e.target.value)}
                style={{ fontSize: "13px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", outline: "none" }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "auto" }}>{radAppts.length} appointment(s)</span>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                  {new Date(radApptDate + "T12:00:00").toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>

              {radApptLoading ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <Loader2 size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} /> Loading appointments...
                </div>
              ) : radAppts.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <Calendar size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                  <p style={{ fontWeight: "bold", fontSize: "14px" }}>No appointments for this date</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Appointments can be scheduled from Reception</p>
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {radAppts.map((a: any) => (
                    <li key={a.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f8fafc", cursor: "default" }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", fontWeight: "bold", flexShrink: 0,
                        backgroundColor: a.status === "CANCELLED" ? "#fecaca" : a.status === "COMPLETED" ? "#bbf7d0" : a.status === "CONFIRMED" ? "#bfdbfe" : "#fde68a",
                        color: a.status === "CANCELLED" ? "#b91c1c" : a.status === "COMPLETED" ? "#166534" : a.status === "CONFIRMED" ? "#1e40af" : "#92400e",
                      }}>
                        {a.Patient?.firstName?.[0]}{a.Patient?.lastName?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>
                            {a.Patient?.lastName}, {a.Patient?.firstName}
                          </span>
                          <span style={{
                            fontSize: "10px", padding: "1px 8px", borderRadius: "10px", fontWeight: "bold",
                            backgroundColor: a.status === "CANCELLED" ? "#fef2f2" : a.status === "COMPLETED" ? "#f0fdf4" : a.status === "CONFIRMED" ? "#eff6ff" : "#fffbeb",
                            color: a.status === "CANCELLED" ? "#b91c1c" : a.status === "COMPLETED" ? "#166534" : a.status === "CONFIRMED" ? "#1e40af" : "#92400e",
                          }}>
                            {a.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                          {a.Patient?.patientNumber} · {new Date(a.appointmentDate).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                          {a.Patient?.phoneNumber && ` · ${a.Patient.phoneNumber}`}
                        </div>
                        {a.reason && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{a.reason}</div>}
                        {a.notes && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", fontStyle: "italic" }}>{a.notes}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        {a.status === "PENDING" && (
                          <button onClick={async () => {
                            await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status: "CONFIRMED" }) });
                            setRadAppts((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CONFIRMED" } : x));
                          }}
                            style={{ fontSize: "10px", padding: "6px 10px", borderRadius: "6px", border: "none", backgroundColor: "#dbeafe", color: "#1e40af", cursor: "pointer", fontWeight: "bold" }}>
                            Confirm
                          </button>
                        )}
                        {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                          <button onClick={async () => {
                            await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
                            setRadAppts((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CANCELLED" } : x));
                          }}
                            style={{ fontSize: "10px", padding: "6px 10px", borderRadius: "6px", border: "none", backgroundColor: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontWeight: "bold" }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Status Tabs (hidden when viewing appointments) ──────────────── */}
        {sidebarTab !== "appointments" && (<div style={{ display: "flex", gap: "0", padding: "0 28px", borderBottom: "2px solid #e2e8f0" }}>
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab.value;
            const tabCount = tab.value === "" ? stats.total
              : tab.value === "ORDERED" ? stats.pending
              : tab.value === "IN_PROGRESS" ? stats.inProgress
              : tab.value === "AWAITING_INTERPRETATION" ? stats.awaitingReport
              : tab.value === "REPORTED" ? stats.reported
              : 0;
            return (
              <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                style={{
                  padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: isActive ? "bold" : "500",
                  color: isActive ? "#00703C" : "#64748b",
                  borderBottom: isActive ? "3px solid #00703C" : "3px solid transparent",
                  marginBottom: "-2px", display: "flex", alignItems: "center", gap: "8px",
                  transition: "all 0.15s",
                }}>
                {tab.label}
                <span style={{
                  backgroundColor: isActive ? "#dcfce7" : "#f1f5f9",
                  color: isActive ? "#00703C" : "#64748b",
                  padding: "1px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold",
                }}>{tabCount}</span>
              </button>
            );
          })}
        </div>)}

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Worklist (left panel) ──────────────────────────────────────── */}
          <div style={{ width: "420px", minWidth: "380px", borderRight: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>
                {sidebarTab === "critical" ? "Critical Results" : "Worklist"}
                <span style={{ marginLeft: "8px", fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>({filteredRequests.length})</span>
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px", display: "block" }} />
                  <p>Loading studies...</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <FolderOpen size={40} style={{ margin: "0 auto 16px", display: "block", opacity: 0.4 }} />
                  <p style={{ fontWeight: "bold", fontSize: "14px" }}>No studies found</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Imaging requests will appear here once ordered</p>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const priorityInfo = PRIORITY_BADGE[req.priority] ?? PRIORITY_BADGE.ROUTINE;
                  const statusInfo = STATUS_BADGE[req.status] ?? STATUS_BADGE.ORDERED;
                  const isSelected = selectedRequest?.id === req.id;
                  return (
                    <div key={req.id} onClick={() => handleSelectRequest(req)}
                      style={{
                        padding: "14px 18px", borderBottom: "1px solid #e2e8f0", cursor: "pointer",
                        backgroundColor: isSelected ? "#dcfce7" : req.isCritical ? "#fef2f2" : "white",
                        borderLeft: `4px solid ${req.isCritical ? "#dc2626" : req.priority === "STAT" ? "#f97316" : "transparent"}`,
                        transition: "all 0.1s",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", color: "#00703C" }}>
                            {req.Patient.patientNumber}
                          </span>
                          {req.isCritical && <AlertTriangle size={13} color="#dc2626" />}
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: priorityInfo.bg, color: priorityInfo.color, fontWeight: "bold" }}>
                            {priorityInfo.label}
                          </span>
                          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: statusInfo.bg, color: statusInfo.color, fontWeight: "bold" }}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>
                        {req.Patient.lastName}, {req.Patient.firstName}
                      </p>
                      <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#64748b" }}>
                        <span style={{ fontWeight: "600" }}>{studyTypeLabel(req.studyType)}</span>
                        <span>|</span>
                        <span>{req.Patient.gender} · {req.Patient.age} yrs</span>
                        <span>|</span>
                        <span>{formatShortDate(req.createdAt)}</span>
                      </div>
                      {req.clinicalNotes && (
                        <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94a3b8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {req.clinicalNotes}
                        </p>
                      )}
                      <div style={{ marginTop: "6px", display: "flex", gap: "6px", fontSize: "10px", color: "#94a3b8" }}>
                        {req.referralSource && (
                          <span style={{ backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                            {referralLabel(req.referralSource)}
                          </span>
                        )}
                        {req.imageCount > 0 && (
                          <span style={{ backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                            <Image size={10} style={{ verticalAlign: "middle", marginRight: "2px" }} />{req.imageCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Detail & Reporting Panel (right) ───────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!selectedRequest ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", padding: "40px" }}>
                <Scan size={60} style={{ opacity: 0.2, marginBottom: "20px" }} />
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#64748b" }}>Select a Study</h3>
                <p style={{ fontSize: "13px", textAlign: "center", maxWidth: "400px" }}>Choose an imaging request from the worklist to view patient details, review clinical notes, and create your report.</p>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* ── Patient Summary Bar ──────────────────────────────────── */}
                <div style={{ backgroundColor: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "bold", color: "#1e293b" }}>
                          {selectedRequest.Patient.lastName}, {selectedRequest.Patient.firstName}
                        </h2>
                        {selectedRequest.isCritical && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fef2f2", color: "#b91c1c", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>
                            <AlertTriangle size={12} /> CRITICAL
                          </span>
                        )}
                        {selectedRequest.Patient.isEmergency && (
                          <span style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#00703C" }}>{selectedRequest.Patient.patientNumber}</span>
                        <span>{selectedRequest.Patient.gender} · {selectedRequest.Patient.age} yrs</span>
                        {selectedRequest.Patient.phoneNumber && <span>{selectedRequest.Patient.phoneNumber}</span>}
                        <span>Arrived: {formatShortDate(selectedRequest.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {selectedRequest.status === "ORDERED" && (
                      <button onClick={() => updateStatus(selectedRequest.id, "ACCEPTED")}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={14} /> Accept Study
                      </button>
                    )}
                    {(selectedRequest.status === "ACCEPTED" || selectedRequest.status === "ORDERED") && (
                      <button onClick={() => updateStatus(selectedRequest.id, "IN_PROGRESS")}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#00703C", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Activity size={14} /> Begin Exam
                      </button>
                    )}
                    <button onClick={toggleCritical}
                      style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${selectedRequest.isCritical ? "#dc2626" : "#d0d5dd"}`, backgroundColor: selectedRequest.isCritical ? "#fef2f2" : "white", color: selectedRequest.isCritical ? "#b91c1c" : "#64748b", cursor: "pointer", fontWeight: "bold", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldAlert size={14} /> {selectedRequest.isCritical ? "Unmark Critical" : "Mark Critical"}
                    </button>
                  </div>
                </div>

                {/* ── Scrollable Detail Content ──────────────────────────────── */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

                  {/* Study & Referral Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Scan size={14} /> Study Details
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        <div><span style={{ color: "#94a3b8" }}>Study Type</span><p style={{ margin: "2px 0 0", fontWeight: "bold", color: "#1e293b" }}>{studyTypeLabel(selectedRequest.studyType)}</p></div>
                        <div><span style={{ color: "#94a3b8" }}>Priority</span>
                          <p style={{ margin: "2px 0 0", fontWeight: "bold" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: PRIORITY_BADGE[selectedRequest.priority].bg, color: PRIORITY_BADGE[selectedRequest.priority].color, fontSize: "11px" }}>
                              {PRIORITY_BADGE[selectedRequest.priority].label}
                            </span>
                          </p>
                        </div>
                        <div><span style={{ color: "#94a3b8" }}>Referral Source</span><p style={{ margin: "2px 0 0", fontWeight: "bold", color: "#1e293b" }}>{referralLabel(selectedRequest.referralSource)}</p></div>
                        <div><span style={{ color: "#94a3b8" }}>Ordered</span><p style={{ margin: "2px 0 0", fontWeight: "bold", color: "#1e293b" }}>{formatDate(selectedRequest.createdAt)}</p></div>
                        {selectedRequest.reportedAt && (
                          <div><span style={{ color: "#94a3b8" }}>Reported</span><p style={{ margin: "2px 0 0", fontWeight: "bold", color: "#1e293b" }}>{formatDate(selectedRequest.reportedAt)}</p></div>
                        )}
                        {selectedRequest.Staff && (
                          <div><span style={{ color: "#94a3b8" }}>Requested By</span><p style={{ margin: "2px 0 0", fontWeight: "bold", color: "#1e293b" }}>{selectedRequest.Staff.fullName}</p></div>
                        )}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FileText size={14} /> Clinical Notes & History
                      </h4>
                      <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                        {selectedRequest.clinicalNotes ? (
                          <div style={{ marginBottom: "10px" }}>
                            <p style={{ margin: "0 0 4px", fontWeight: "bold", color: "#64748b", fontSize: "11px" }}>Reason for Investigation</p>
                            <p style={{ margin: 0 }}>{selectedRequest.clinicalNotes}</p>
                          </div>
                        ) : (
                          <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No clinical notes provided</p>
                        )}
                        {selectedRequest.clinicalHistory && (
                          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                            <p style={{ margin: "0 0 4px", fontWeight: "bold", color: "#64748b", fontSize: "11px" }}>Clinical History</p>
                            <p style={{ margin: 0 }}>{selectedRequest.clinicalHistory}</p>
                          </div>
                        )}
                      </div>
                      {selectedRequest.Visit?.symptoms && (
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", fontSize: "12px" }}>
                          <p style={{ margin: "0 0 4px", fontWeight: "bold", color: "#64748b", fontSize: "11px" }}>Chief Complaint (Visit)</p>
                          <p style={{ margin: 0, color: "#475569" }}>{selectedRequest.Visit.symptoms}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Image Upload / Gallery ──────────────────────────────── */}
                  <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Image size={14} /> Images & Scans
                        {selectedRequest.imageCount > 0 && (
                          <span style={{ backgroundColor: "#00703C", color: "white", padding: "0 8px", borderRadius: "10px", fontSize: "10px" }}>{selectedRequest.imageCount}</span>
                        )}
                      </h4>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*,.dcm,.dicom";
                          input.multiple = true;
                          input.onchange = () => {
                            if (input.files) {
                              setImageUrls(prev => [...prev, ...Array.from(input.files!).map(f => URL.createObjectURL(f))]);
                              updateStatus(selectedRequest.id, selectedRequest.status).then(() => fetchRequests());
                            }
                          };
                          input.click();
                        }} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "bold", color: "#475569" }}>
                          <Upload size={14} /> Upload Images
                        </button>
                        <button onClick={() => {
                          alert("Machine import activated. In production, this would connect to DICOM-compatible devices (PACS, modality worklist) to import studies directly.");
                        }} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "bold", color: "#475569" }}>
                          <Download size={14} /> Import from Machine
                        </button>
                      </div>
                    </div>
                    {imageUrls.length > 0 ? (
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                        {imageUrls.map((url, i) => (
                          <div key={i} style={{ width: "140px", height: "120px", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                            <img src={url} alt={`Scan ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                              style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.5)", color: "white", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "24px", textAlign: "center", border: "2px dashed #e2e8f0", borderRadius: "8px", color: "#94a3b8" }}>
                        <Camera size={28} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: "12px" }}>No images uploaded yet. Upload DICOM images or import directly from the imaging machine.</p>
                      </div>
                    )}
                    {selectedRequest.machineResults && (
                      <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "11px", color: "#64748b" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>Machine Results {selectedRequest.machineModel ? `(${selectedRequest.machineModel})` : ""}</p>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{selectedRequest.machineResults}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Measurements ────────────────────────────────────────── */}
                  {selectedRequest.measurements && (
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Ruler size={14} /> Measurements & Annotations
                      </h4>
                      <div style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{selectedRequest.measurements}</div>
                    </div>
                  )}

                  {/* ── Report Editor ────────────────────────────────────────── */}
                  <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={16} color="#00703C" /> Radiology Report
                      </h4>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={toggleRecording}
                          style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", backgroundColor: isRecording ? "#fef2f2" : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "bold", color: isRecording ? "#b91c1c" : "#475569" }}>
                          <Mic size={14} /> {isRecording ? "Stop Recording" : "Voice-to-Text"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Findings</label>
                        <textarea value={findings} onChange={e => setFindings(e.target.value)}
                          placeholder="Describe the imaging findings in detail..."
                          rows={5} style={{ ...inputStyle(), resize: "vertical", minHeight: "80px" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Impression</label>
                        <textarea value={impression} onChange={e => setImpression(e.target.value)}
                          placeholder="Your clinical impression based on the findings..."
                          rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Conclusion / Diagnosis</label>
                        <textarea value={conclusion} onChange={e => setConclusion(e.target.value)}
                          placeholder="Final conclusion and diagnosis..."
                          rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Radiologist Notes (internal)</label>
                        <textarea value={radiologistNotes} onChange={e => setRadiologistNotes(e.target.value)}
                          placeholder="Private notes for internal department use..."
                          rows={2} style={{ ...inputStyle(), resize: "vertical" }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Action Buttons ────────────────────────────────────────── */}
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingBottom: "20px" }}>
                    <button onClick={() => window.print()}
                      style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #d0d5dd", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", color: "#475569" }}>
                      <Printer size={15} /> Print
                    </button>
                    <button onClick={() => saveReport(false)} disabled={isSaving}
                      style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #00703C", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", color: "#00703C" }}>
                      <Save size={15} /> {isSaving ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={() => saveReport(true)} disabled={isSaving || !findings}
                      style={{ padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#00703C", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", color: "white", opacity: !findings ? 0.5 : 1 }}>
                      <CheckCircle size={15} /> {isSaving ? "Finalizing..." : "Finalize Report"}
                    </button>
                    {selectedRequest.status === "REPORTED" && (
                      <button onClick={() => alert("Report sent to referring clinician.")}
                        style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#6366f1", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", color: "white" }}>
                        <Send size={15} /> Send Report
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ═══ Watermark styles (reuse across print/forms) ═══ */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          aside, header, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Ruler icon (missing from lucide in this version) ─────────────────
function Ruler(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2" />
      <path d="M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />
      <path d="M3 22h18" />
      <path d="M7 18V10" />
      <path d="M17 18V10" />
      <path d="M12 18V10" />
    </svg>
  );
}
