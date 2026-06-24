"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import NotificationInbox from "../components/NotificationInbox";
import StaffMessaging from "../components/StaffMessaging";
import {
  Activity, Baby, FileText, LogOut, Printer, PlusCircle, Trash2,
  RefreshCw, Phone, User, Clock, AlertTriangle, X, Thermometer,
  Droplets, Heart, Wind, Scale, Ruler, Eye, AlertCircle, Stethoscope,
  ArrowRight, CheckCircle, Save, ClipboardList, Calendar, Loader2,
  Syringe, ChevronRight, Circle
} from "lucide-react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────
interface TriagePatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string | null;
  chiefComplaint: string;
  isEmergency: boolean;
  status: string;
  createdAt: string;
}

interface TreatmentEntry {
  id: number;
  date: string;
  drug: string;
  route: string;
  dose: string;
  time: string;
  signature: string;
}

const ROUTES = ["PO", "IV", "IM", "SC", "SL", "PR", "Topical", "Inhalation", "Intradermal", "OT (Other)"];

interface TriageFormData {
  modeOfArrival: string;
  temperature: string;
  bpSystolic: string;
  bpDiastolic: string;
  heartRate: string;
  respiratoryRate: string;
  spo2: string;
  weight: string;
  height: string;
  painLevel: string;
  painLocation: string;
  chiefComplaint: string;
  allergies: string;
  medicalHistory: string;
  nursingObservations: string;
  nursingNotes: string;
  esiLevel: number | null;
  redFlags: string[];
  triageOutcome: string;
  referredTo: string;
  studyType: string;
}

// ── Status Badge Component ────────────────────────────────────────────────
function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    NORMAL:         { bg: "bg-green-50",    text: "text-green-700",  dot: "bg-green-500" },
    AWAITING_TRIAGE:{ bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
    PENDING:        { bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-400" },
    CONFIRMED:      { bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
    COMPLETED:      { bg: "bg-green-50",    text: "text-green-700",  dot: "bg-green-500" },
    CANCELLED:      { bg: "bg-red-50",      text: "text-red-600",    dot: "bg-red-500" },
    ADMITTED:       { bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
    EMERGENCY:      { bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-500" },
    CRITICAL:       { bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-500" },
    WARNING:        { bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-400" },
    INFO:           { bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
  };
  const upper = status.toUpperCase();
  const c = config[upper] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  const sizeCls = size === "lg" ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${c.bg} ${c.text} ${sizeCls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {upper === "AWAITING_TRIAGE" ? "Awaiting Triage" : upper.charAt(0) + upper.slice(1).toLowerCase()}
    </span>
  );
}

// ── Badge for vital abnormal / named statuses ─────────────────────────────
function Badge({ color, children }: { color: "green" | "red" | "amber" | "blue"; children: React.ReactNode }) {
  const m: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${m[color]}`}>
      {children}
    </span>
  );
}

export default function NurseMidwifeDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("triage");
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([]);
  const [treatmentForm, setTreatmentForm] = useState({ date: new Date().toISOString().split("T")[0], drug: "", route: "PO", dose: "", time: "", signature: "" });
  const [nurseAppts, setNurseAppts] = useState<any[]>([]);
  const [nurseApptDate, setNurseApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [nurseApptFilter, setNurseApptFilter] = useState("all");
  const [nurseApptLoading, setNurseApptLoading] = useState(false);
  const [treatmentRoomPatients, setTreatmentRoomPatients] = useState<any[]>([]);
  const [trLoading, setTrLoading] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);
  // ── Treatment Room Medication Schedule ──────────────────────────────
  interface MedSchedule { id: number; medication: string; time: string; }
  const [treatmentMeds, setTreatmentMeds] = useState<Record<number, MedSchedule[]>>({});
  const addTreatmentMed = (patientId: number, medication: string, time: string) => {
    if (!medication || !time) return;
    setTreatmentMeds(prev => ({
      ...prev,
      [patientId]: [...(prev[patientId] || []), { id: Date.now(), medication, time }],
    }));
  };
  const removeTreatmentMed = (patientId: number, medId: number) => {
    setTreatmentMeds(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter(m => m.id !== medId),
    }));
  };
  const getMedAlert = (patientId: number): { status: "overdue" | "due" | null; label: string; count: number } => {
    const meds = treatmentMeds[patientId] || [];
    if (meds.length === 0) return { status: null, label: "", count: 0 };
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    let overdue = 0, dueSoon = 0;
    for (const m of meds) {
      const medDt = new Date(`${todayStr}T${m.time}:00`);
      const diffMs = medDt.getTime() - now.getTime();
      const diffMin = diffMs / 60000;
      if (diffMin < 0) overdue++;
      else if (diffMin <= 30) dueSoon++;
    }
    if (overdue > 0) return { status: "overdue", label: `${overdue} Overdue`, count: overdue };
    if (dueSoon > 0) return { status: "due", label: `${dueSoon} Due`, count: dueSoon };
    return { status: null, label: "", count: 0 };
  };
  const [selectedPatient, setSelectedPatient] = useState<TriagePatient | null>(null);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clock, setClock] = useState("");
  const [nurseName, setNurseName] = useState("Nurse");
  // ── Treatment Room Medication Form visibility ───────────────────────
  const [medFormPatientId, setMedFormPatientId] = useState<number | null>(null);
  const [medFormName, setMedFormName] = useState("");
  const [medFormTime, setMedFormTime] = useState("");

  // ── ANC state ────────────────────────────────────────────────────────────
  const [ancPatients, setAncPatients] = useState<any[]>([]);
  const [ancLoading, setAncLoading] = useState(false);
  const [ancError, setAncError] = useState<string | null>(null);
  const [showAncModal, setShowAncModal] = useState(false);
  const [ancSelectedPatient, setAncSelectedPatient] = useState<any>(null);
  const [ancSaving, setAncSaving] = useState(false);

  const emptyAncForm = () => ({
    gestationalAgeWeeks: "", gravida: "", para: "", LMP: "", EDD: "",
    fundalHeight: "", fetalHeartRate: "", fetalPresentation: "", fetalMovement: "",
    bpSystolic: "", bpDiastolic: "", maternalWeight: "",
    urineProtein: "NEGATIVE", urineGlucose: "NEGATIVE", urineNitrites: "NEGATIVE",
    edema: "NONE", edemaLocation: "",
    complaints: "", clinicalNotes: "",
    nextAppointmentDate: "", outcome: "CONTINUE_MONITORING",
    referredBy: "", referringDoctorName: "",
  });
  const [ancForm, setAncForm] = useState(emptyAncForm());
  const setAncField = (field: string, value: any) => {
    setAncForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Auto-calc EDD from LMP (280 days / 40 weeks)
  useEffect(() => {
    if (ancForm.LMP) {
      try {
        const lmp = new Date(ancForm.LMP);
        if (!isNaN(lmp.getTime())) {
          const edd = new Date(lmp);
          edd.setDate(edd.getDate() + 280);
          setAncField("EDD", edd.toISOString().split("T")[0]);
        }
      } catch {}
    }
  }, [ancForm.LMP]);

  const fetchAncPatients = useCallback(async () => {
    setAncLoading(true); setAncError(null);
    try {
      const res = await fetch("/api/anc-assessment");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setAncPatients(data.patients ?? []);
    } catch (err: any) { setAncError(err.message || "Could not reach server"); }
    finally { setAncLoading(false); }
  }, []);

  useEffect(() => {
    fetchAncPatients();
    const i = setInterval(fetchAncPatients, 30_000);
    return () => clearInterval(i);
  }, [fetchAncPatients]);

  const handleBeginAnc = (patient: any) => {
    setAncSelectedPatient(patient);
    setAncForm(emptyAncForm());
    setShowAncModal(true);
  };
  const handleCancelAnc = () => { setShowAncModal(false); setAncSelectedPatient(null); };

  const handleSaveAnc = async () => {
    if (!ancSelectedPatient) return;
    setAncSaving(true);
    try {
      const res = await fetch("/api/anc-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: ancSelectedPatient.id,
          ...ancForm,
          assessedBy: nurseName,
          assessedById: null,
          referredBy: ancSelectedPatient.referredBy || null,
          referringDoctorName: ancSelectedPatient.referringDoctorName || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); alert(`Failed to save: ${err.error}`); return; }
      setShowAncModal(false);
      setAncSelectedPatient(null);
      fetchAncPatients();
    } catch (err: any) { alert(`Network error: ${err.message}`); }
    finally { setAncSaving(false); }
  };

  // ── Live clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  // ── Load nurse name from sessionStorage ───────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setNurseName(u.fullName || u.username || "Nurse");
      }
    } catch {}
  }, []);

  const emptyTriageForm = (patient: TriagePatient): TriageFormData => ({
    modeOfArrival: "WALK_IN", temperature: "", bpSystolic: "", bpDiastolic: "",
    heartRate: "", respiratoryRate: "", spo2: "", weight: "", height: "",
    painLevel: "", painLocation: "", chiefComplaint: patient.chiefComplaint || "",
    allergies: "", medicalHistory: "", nursingObservations: "", nursingNotes: "",
    esiLevel: null, redFlags: [], triageOutcome: "SEND_DOCTOR", referredTo: "", studyType: "",
  });

  const [triageForm, setTriageForm] = useState<TriageFormData>(emptyTriageForm({} as TriagePatient));
  const setTriageField = (field: keyof TriageFormData, value: any) => {
    setTriageForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Appointments ──────────────────────────────────────────────────────────
  const fetchNurseAppointments = useCallback(async () => {
    setNurseApptLoading(true);
    try {
      const params = new URLSearchParams({ department: "Nurse_Midwife", date: nurseApptDate });
      if (nurseApptFilter !== "all") params.set("status", nurseApptFilter.toUpperCase());
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setNurseAppts(data.appointments ?? []);
    } catch { setNurseAppts([]); }
    finally { setNurseApptLoading(false); }
  }, [nurseApptDate, nurseApptFilter]);

  useEffect(() => { fetchNurseAppointments(); }, [fetchNurseAppointments]);
  useEffect(() => { const i = setInterval(fetchNurseAppointments, 30_000); return () => clearInterval(i); }, [fetchNurseAppointments]);

  // ── Treatment Room ───────────────────────────────────────────────────────
  const fetchTreatmentRoomPatients = useCallback(async () => {
    setTrLoading(true); setTrError(null);
    try {
      const res = await fetch("/api/nurse-patients?status=TREATMENT_ROOM");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setTreatmentRoomPatients(data);
    } catch (err: any) { setTrError(err.message || "Could not reach server"); }
    finally { setTrLoading(false); }
  }, []);

  useEffect(() => {
    fetchTreatmentRoomPatients();
    const i = setInterval(fetchTreatmentRoomPatients, 30_000);
    return () => clearInterval(i);
  }, [fetchTreatmentRoomPatients]);

  const handleCompleteTreatment = async (patientId: number) => {
    try {
      const res = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patientId, status: "ADMITTED", sentToTreatmentRoom: false }),
      });
      if (!res.ok) throw new Error("Failed to update patient");
      setTreatmentRoomPatients(prev => prev.filter((p: any) => p.id !== patientId));
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  // ── Triage ──────────────────────────────────────────────────────────────
  const handleBeginTriage = (patient: TriagePatient) => {
    setSelectedPatient(patient);
    setTriageForm(emptyTriageForm(patient));
    setShowTriageModal(true);
  };
  const handleCancelTriage = () => { setShowTriageModal(false); setSelectedPatient(null); };

  const handleSaveTriage = async (completeAndSend: boolean) => {
    if (!selectedPatient) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          modeOfArrival: triageForm.modeOfArrival,
          temperature: triageForm.temperature ? parseFloat(triageForm.temperature) : null,
          bpSystolic: triageForm.bpSystolic ? parseInt(triageForm.bpSystolic) : null,
          bpDiastolic: triageForm.bpDiastolic ? parseInt(triageForm.bpDiastolic) : null,
          heartRate: triageForm.heartRate ? parseInt(triageForm.heartRate) : null,
          respiratoryRate: triageForm.respiratoryRate ? parseInt(triageForm.respiratoryRate) : null,
          spo2: triageForm.spo2 ? parseInt(triageForm.spo2) : null,
          weight: triageForm.weight ? parseFloat(triageForm.weight) : null,
          height: triageForm.height ? parseFloat(triageForm.height) : null,
          painLevel: triageForm.painLevel ? parseInt(triageForm.painLevel) : null,
          painLocation: triageForm.painLocation || null,
          chiefComplaint: triageForm.chiefComplaint || null,
          allergies: triageForm.allergies || null,
          medicalHistory: triageForm.medicalHistory || null,
          nursingObservations: triageForm.nursingObservations || null,
          nursingNotes: triageForm.nursingNotes || null,
          esiLevel: triageForm.esiLevel,
          redFlags: triageForm.redFlags,
          triageOutcome: completeAndSend ? triageForm.triageOutcome : null,
          referredTo: triageForm.referredTo || null,
          studyType: triageForm.studyType || null,
          clinicalNotes: triageForm.chiefComplaint || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); alert(`Failed to save: ${err.error}`); return; }
      if (completeAndSend) { setShowTriageModal(false); setSelectedPatient(null); fetchTriagePatients(); }
      else { alert("Triage saved as draft."); }
    } catch (err: any) { alert(`Network error: ${err.message}`); }
    finally { setIsSaving(false); }
  };

  const handleAddTreatment = () => {
    if (!treatmentForm.drug || !treatmentForm.dose) return;
    setTreatmentEntries([...treatmentEntries, { ...treatmentForm, id: Date.now() }]);
    setTreatmentForm({ date: new Date().toISOString().split("T")[0], drug: "", route: "PO", dose: "", time: "", signature: "" });
  };

  const fetchTriagePatients = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/patients?status=AWAITING_TRIAGE");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      // Deduplicate by patient ID
      const seen = new Set<number>();
      const deduped = data.filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      setPatients(deduped);
    } catch (err: any) { setError(err.message || "Could not reach server"); }
    finally { setIsLoading(false); }
  }, []);

  // Track effect mount to avoid StrictMode double-fetch
  const triageFetchedRef = useRef(false);
  useEffect(() => {
    if (triageFetchedRef.current) return;
    triageFetchedRef.current = true;
    fetchTriagePatients();
    try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {}
    const interval = setInterval(fetchTriagePatients, 30_000);
    const hb = setInterval(() => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {} }, 120000);
    return () => { clearInterval(interval); clearInterval(hb); };
  }, [fetchTriagePatients]);

  // ── Tab fade-in animation key ────────────────────────────────────────────
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { setAnimKey(k => k + 1); }, [activeTab]);

  // ── Sticky header component ─────────────────────────────────────────────
  const StickyHeader = ({ tabName, children }: { tabName: string; children?: React.ReactNode }) => (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between rounded-t-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">{tabName}</h2>
      </div>
      <div className="flex items-center gap-5">
        {children}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5 bg-slate-100/70 px-2.5 py-1 rounded-lg">
            <Clock size={13} className="text-[#00703C]" />
            <span className="tabular-nums font-semibold text-slate-700">{clock}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#00703C]/10 px-2.5 py-1 rounded-lg">
            <User size={13} className="text-[#00703C]" />
            <span className="font-semibold text-[#00703C]">{nurseName}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Card wrapper ─────────────────────────────────────────────────────────
  const Card = ({ children, className = "", emergency = false }: { children: React.ReactNode; className?: string; emergency?: boolean }) => (
    <div className={`bg-white rounded-xl shadow-sm border ${emergency ? "border-red-200" : "border-slate-200/80"} hover:shadow-md transition-all duration-200 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="no-blur flex min-h-screen bg-[#f0f4f8]" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      {/* ── CSS Animations ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in-up 0.3s ease-out;
        }
        @keyframes pulse-alert {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.08); opacity: 0.85; }
        }
        .pulse-overdue {
          animation: pulse-alert 1s ease-in-out infinite;
        }
        .pulse-due {
          animation: pulse-alert 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <aside className="w-[280px] flex-shrink-0 flex flex-col text-white" style={{ background: "linear-gradient(180deg, #00703C 0%, #006633 45%, #005a2e 100%)", boxShadow: "4px 0 24px rgba(0, 0, 0, 0.12)" }}>
        {/* Logo section */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-white/10">
          <div className="mx-auto w-20 h-20 rounded-full border-[3px] border-white/80 shadow-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <img src="/Images/LOGO.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-base font-extrabold tracking-wider mt-3 text-white/95">MAIN STREET EMR</h2>
          <p className="text-[11px] font-medium text-white/70 mt-1 leading-tight">Welcome to Mainstreet Medical Center</p>
          <p className="text-[10px] font-bold text-white/90 bg-white/10 px-3 py-1 rounded-lg mt-1.5 inline-block">Nurse / Midwife</p>
          {nurseName && nurseName !== "Nurse" && (
            <p className="text-[13px] font-bold text-white mt-2 flex items-center justify-center gap-1.5">
              <User size={14} className="text-white/70" />
              {nurseName}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { id: "triage", label: "Triage & Vitals", icon: Activity },
            { id: "treatment-room", label: "Treatment Room", icon: Syringe },
            { id: "antenatal", label: "ANC Monitoring", icon: Baby },
            { id: "treatment", label: "Treatment Chart", icon: ClipboardList },
            { id: "appointments", label: "Appointments", icon: Calendar },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#00703C] shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={20} className={isActive ? "text-[#00703C]" : "text-white/50"} />
                <span className="flex-1 text-left">{tab.label}</span>
                {isActive && <ChevronRight size={14} className="text-[#00703C]" />}
              </button>
            );
          })}

          {/* Divider */}
          <div className="border-t border-white/10 my-3" />

          {/* Sidebar tools — compact */}
          <div className="space-y-1.5">
            <NotificationInbox department="Nurse/Midwife" sidebar={true} showTitle={true} />
            <StaffMessaging />
          </div>
        </nav>

        {/* Bottom area */}
        <div className="px-3 pb-3 space-y-2 pt-2">
          <button
            onClick={async () => {
              try {
                const r = sessionStorage.getItem("user") || localStorage.getItem("user");
                if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id, username: u.username }) }); }
              } catch {} router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-600/90 hover:bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors duration-200 text-sm shadow-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Tab content wrapper with fade-in */}
        <div key={animKey} className="animate-fade-in flex-1 p-6">

          {/* ────────────────────────────────────────────────────────────────
              TRIAGE TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "triage" && (
            <Card>
              <StickyHeader tabName="Triage & Vitals">
                <button onClick={fetchTriagePatients} disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] bg-[#00703C]/10 hover:bg-[#00703C]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </StickyHeader>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-sm font-bold text-slate-600">Patients Awaiting Triage</h3>
                  <span className="bg-[#00703C] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">{patients.length}</span>
                </div>

                {/* Loading */}
                {isLoading && patients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <RefreshCw size={28} className="animate-spin mb-3 text-[#00703C]/40" />
                    <p className="text-sm font-semibold text-slate-400">Loading patients...</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700 flex-1">{error}</span>
                    <button onClick={fetchTriagePatients}
                      className="text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors">Retry</button>
                  </div>
                )}

                {/* Empty */}
                {!isLoading && patients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <User size={44} className="text-slate-200 mb-4" />
                    <p className="text-sm font-semibold text-slate-400">No patients waiting for triage</p>
                    <p className="text-xs text-slate-300 mt-1">Patients will appear here once the receptionist sends them</p>
                  </div>
                )}

                {/* Patient cards */}
                {patients.map((p) => (
                  <div key={p.id} className={`rounded-xl border-l-4 ${p.isEmergency ? "border-l-red-500 bg-red-50/40" : "border-l-[#00703C] bg-white"} border border-slate-200/80 p-5 mb-3 hover:shadow-md transition-all duration-200`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-extrabold text-[#00703C] bg-[#dcfce7] px-2 py-0.5 rounded">{p.patientNumber}</span>
                        {p.isEmergency && <Badge color="red"><AlertTriangle size={10} /> EMERGENCY</Badge>}
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <div className="font-semibold text-slate-500">{p.gender} &middot; {p.age} yrs</div>
                        {p.phone && <div className="flex items-center gap-1 mt-0.5 justify-end"><Phone size={9} />{p.phone}</div>}
                        <div className="flex items-center gap-1 mt-0.5 justify-end text-[10px]"><Clock size={9} />{p.createdAt}</div>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-800 mb-2">{p.lastName}, {p.firstName}</h4>

                    <div className="bg-slate-50/70 rounded-lg px-4 py-2.5 border border-slate-100 mb-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Chief Complaint</p>
                      <p className="text-sm text-slate-600 font-medium">{p.chiefComplaint}</p>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => handleBeginTriage(p)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#00703C] hover:bg-[#005a2e] text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors">
                        <Activity size={14} /> Begin Triage
                      </button>
                      <button onClick={() => handleBeginTriage(p)}
                        className="flex items-center justify-center gap-1 border border-[#00703C] text-[#00703C] hover:bg-[#00703C]/5 font-bold text-xs py-2.5 px-4 rounded-lg transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────
              TREATMENT ROOM TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "treatment-room" && (
            <Card>
              <StickyHeader tabName="Treatment Room">
                <button onClick={fetchTreatmentRoomPatients} disabled={trLoading}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] bg-[#00703C]/10 hover:bg-[#00703C]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <RefreshCw size={13} className={trLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </StickyHeader>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-sm font-bold text-slate-600">Admitted Patients &mdash; Treatment Room</h3>
                  <span className="bg-[#00703C] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">{treatmentRoomPatients.length}</span>
                </div>

                {trError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700 flex-1">{trError}</span>
                    <button onClick={fetchTreatmentRoomPatients} className="text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors">Retry</button>
                  </div>
                )}

                {trLoading && treatmentRoomPatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <RefreshCw size={28} className="animate-spin mb-3 text-[#00703C]/40" />
                    <p className="text-sm font-semibold text-slate-400">Loading patients...</p>
                  </div>
                )}

                {!trLoading && treatmentRoomPatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Syringe size={44} className="text-slate-200 mb-4" />
                    <p className="text-sm font-semibold text-slate-400">No patients in Treatment Room</p>
                    <p className="text-xs text-slate-300 mt-1">Admitted patients sent by doctors will appear here</p>
                  </div>
                )}

                {treatmentRoomPatients.map((p: any) => {
                  const latestVisit = p.Visit?.[0];
                  const latestTriage = p.Triage?.[0];
                  const medAlert = getMedAlert(p.id);
                  const patientMeds = treatmentMeds[p.id] || [];
                  const isMedFormOpen = medFormPatientId === p.id;
                  return (
                    <div key={p.id} className={`rounded-xl border-l-4 ${p.isEmergency ? "border-l-red-500 bg-red-50/40" : "border-l-blue-500"} border border-slate-200/80 p-5 mb-3 hover:shadow-md transition-all duration-200 bg-white`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-extrabold text-[#00703C] bg-[#dcfce7] px-2 py-0.5 rounded">{p.patientNumber}</span>
                          {p.isEmergency && <Badge color="red"><AlertTriangle size={10} /> EMERGENCY</Badge>}
                          <StatusBadge status="ADMITTED" />
                          {medAlert.status === "overdue" && (
                            <span className="pulse-overdue inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-red-200">
                              <Clock size={10} /> {medAlert.label}
                            </span>
                          )}
                          {medAlert.status === "due" && (
                            <span className="pulse-due inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-amber-200">
                              <Clock size={10} /> {medAlert.label}
                            </span>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div className="font-semibold text-slate-500">{p.gender} &middot; {p.age} yrs</div>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-slate-800 mb-3">{p.lastName}, {p.firstName}</h4>

                      {latestVisit?.diagnosis && (
                        <div className="bg-slate-50/70 rounded-lg px-4 py-2.5 border border-slate-100 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnosis</p>
                          <p className="text-sm text-slate-600 font-medium">{latestVisit.diagnosis}</p>
                        </div>
                      )}

                      {latestVisit?.treatmentPlan && (
                        <div className="bg-slate-50/70 rounded-lg px-4 py-2.5 border border-slate-100 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Treatment Plan</p>
                          <p className="text-sm text-slate-600 font-medium">{latestVisit.treatmentPlan}</p>
                        </div>
                      )}

                      {latestTriage?.chiefComplaint && (
                        <div className="bg-slate-50/70 rounded-lg px-4 py-2.5 border border-slate-100 mb-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Chief Complaint</p>
                          <p className="text-sm text-slate-600 font-medium">{latestTriage.chiefComplaint}</p>
                        </div>
                      )}

                      {latestVisit?.doctorName && (
                        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                          <User size={11} className="text-slate-400" />
                          Referring Doctor: <span className="font-semibold text-slate-600">{latestVisit.doctorName}</span>
                        </p>
                      )}

                      {/* ── Scheduled Medications ──────────────────────────────── */}
                      {patientMeds.length > 0 && (
                        <div className="mb-3 bg-slate-50/70 rounded-lg border border-slate-100 divide-y divide-slate-100">
                          {patientMeds.map((m: MedSchedule) => {
                            const now = new Date();
                            const todayStr = now.toISOString().split("T")[0];
                            const medDt = new Date(`${todayStr}T${m.time}:00`);
                            const diffMin = (medDt.getTime() - now.getTime()) / 60000;
                            const isOverdue = diffMin < 0;
                            const isDue = diffMin >= 0 && diffMin <= 30;
                            return (
                              <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${isOverdue ? "bg-red-50/50" : isDue ? "bg-amber-50/50" : ""}`}>
                                <div className="flex items-center gap-3">
                                  {isOverdue ? (
                                    <span className="w-2 h-2 rounded-full bg-red-500 pulse-overdue" />
                                  ) : isDue ? (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 pulse-due" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-green-400" />
                                  )}
                                  <div>
                                    <span className="text-xs font-bold text-slate-700">{m.medication}</span>
                                    <span className={`text-[10px] ml-2 font-medium ${isOverdue ? "text-red-500" : isDue ? "text-amber-600" : "text-slate-400"}`}>
                                      {m.time} {isOverdue ? "(Overdue)" : isDue ? "(Due)" : ""}
                                    </span>
                                  </div>
                                </div>
                                <button onClick={() => removeTreatmentMed(p.id, m.id)}
                                  className="text-slate-300 hover:text-red-400 transition-colors p-1">
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Schedule Medication Form ───────────────────────────── */}
                      {isMedFormOpen && (
                        <div className="mb-3 bg-blue-50/60 rounded-lg border border-blue-200 p-3 flex items-center gap-2">
                          <div className="flex-1">
                            <input type="text" value={medFormName} onChange={e => setMedFormName(e.target.value)}
                              placeholder="Medication name" maxLength={100}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                          </div>
                          <div className="w-[100px]">
                            <input type="time" value={medFormTime} onChange={e => setMedFormTime(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                          </div>
                          <button onClick={() => { addTreatmentMed(p.id, medFormName, medFormTime); setMedFormName(""); setMedFormTime(""); setMedFormPatientId(null); }}
                            disabled={!medFormName || !medFormTime}
                            className="text-[10px] font-bold bg-[#00703C] hover:bg-[#005a2e] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                            Add
                          </button>
                          <button onClick={() => setMedFormPatientId(null)}
                            className="text-slate-400 hover:text-slate-600 p-1">
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* ── Action Row ─────────────────────────────────────────── */}
                      <div className="flex gap-2">
                        <button onClick={() => handleCompleteTreatment(p.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#00703C] hover:bg-[#005a2e] text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors">
                          <CheckCircle size={14} /> Complete Treatment
                        </button>
                        <button onClick={() => { const open = medFormPatientId !== p.id; setMedFormPatientId(open ? p.id : null); setMedFormName(""); setMedFormTime(""); }}
                          className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-lg border transition-colors ${
                            isMedFormOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "border-slate-200 text-slate-600 hover:border-[#00703C] hover:text-[#00703C]"
                          }`}>
                          <Syringe size={14} /> Meds
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────
              ANC MONITORING TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "antenatal" && (
            <Card>
              <StickyHeader tabName="ANC Monitoring">
                <button onClick={fetchAncPatients} disabled={ancLoading}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] bg-[#00703C]/10 hover:bg-[#00703C]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <RefreshCw size={13} className={ancLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </StickyHeader>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-sm font-bold text-slate-600">Antenatal Patients</h3>
                  <span className="bg-[#00703C] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">{ancPatients.length}</span>
                </div>

                {/* Source indicators */}
                <div className="flex items-center gap-4 mb-4 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Appointments</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Returning</span>
                </div>

                {ancError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700 flex-1">{ancError}</span>
                    <button onClick={fetchAncPatients} className="text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors">Retry</button>
                  </div>
                )}

                {ancLoading && ancPatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <RefreshCw size={28} className="animate-spin mb-3 text-[#00703C]/40" />
                    <p className="text-sm font-semibold text-slate-400">Loading ANC patients...</p>
                  </div>
                )}

                {!ancLoading && ancPatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Baby size={44} className="text-slate-200 mb-4" />
                    <p className="text-sm font-semibold text-slate-400">No ANC patients</p>
                    <p className="text-xs text-slate-300 mt-1">Patients are added when a doctor refers them or reception books an ANC appointment</p>
                  </div>
                )}

                {ancPatients.map((p: any) => {
                  const latest = p.latestAssessment;
                  return (
                    <div key={p.id} className={`rounded-xl border-l-4 ${p.source === "appointment" ? "border-l-blue-400" : "border-l-emerald-400"} border border-slate-200/80 p-5 mb-3 hover:shadow-md transition-all duration-200 bg-white`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-extrabold text-[#00703C] bg-[#dcfce7] px-2 py-0.5 rounded">{p.patientNumber}</span>
                          <Badge color={p.source === "appointment" ? "blue" : "green"}>
                            {p.source === "appointment" ? "Appointment" : (latest ? "Returning" : "Referred")}
                          </Badge>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div className="font-semibold text-slate-500">{p.gender} &middot; {p.age} yrs</div>
                          {p.phoneNumber && <div className="flex items-center gap-1 mt-0.5 justify-end"><Phone size={9} />{p.phoneNumber}</div>}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-slate-800 mb-2">{p.lastName}, {p.firstName}</h4>

                      {/* ANC-specific data when available */}
                      {latest && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          {latest.gestationalAgeWeeks && (
                            <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                              <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Gestation</p>
                              <p className="text-sm font-bold text-purple-700">{latest.gestationalAgeWeeks} wks</p>
                            </div>
                          )}
                          {latest.fundalHeight && (
                            <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Fundal Ht</p>
                              <p className="text-sm font-bold text-blue-700">{latest.fundalHeight} cm</p>
                            </div>
                          )}
                          {latest.fetalHeartRate && (
                            <div className="bg-pink-50 rounded-lg px-3 py-2 border border-pink-100">
                              <p className="text-[9px] font-bold text-pink-500 uppercase tracking-wider">FHR</p>
                              <p className="text-sm font-bold text-pink-700">{latest.fetalHeartRate} bpm</p>
                            </div>
                          )}
                          {latest.fetalPresentation && (
                            <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Presentation</p>
                              <p className="text-sm font-bold text-amber-700 capitalize">{latest.fetalPresentation.toLowerCase()}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Appointment info */}
                      {p.appointmentDate && (
                        <div className="bg-slate-50/70 rounded-lg px-4 py-2.5 border border-slate-100 mb-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Appointment</p>
                          <p className="text-xs text-slate-600">
                            {new Date(p.appointmentDate).toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {p.appointmentReason && <span className="ml-2 text-slate-400">| {p.appointmentReason}</span>}
                          </p>
                        </div>
                      )}

                      {/* Referral source */}
                      <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1.5">
                        <User size={11} className="text-slate-400" />
                        Referred by: <span className="font-semibold text-slate-600">{p.referredBy || (p.appointmentReason ? "Receptionist" : "System")}</span>
                        {p.referringDoctorName && <><span className="text-slate-300">|</span> Dr. {p.referringDoctorName}</>}
                      </p>

                      <button onClick={() => handleBeginAnc(p)}
                        className="flex items-center justify-center gap-2 w-full bg-[#00703C] hover:bg-[#005a2e] text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors">
                        <Baby size={14} /> Begin ANC Assessment
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────
              TREATMENT CHART TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "treatment" && (
            <Card>
              <StickyHeader tabName="Treatment Chart" />
              <div className="p-6">
                {/* ── Record Treatment Form Card ── */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200/80 p-5 mb-6 shadow-sm">
                  <h4 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-4">
                    <PlusCircle size={15} /> Record Treatment
                  </h4>
                  <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1.5fr_auto] gap-3 items-end">
                    {[
                      { label: "Date", key: "date", type: "date" },
                      { label: "Drug / Treatment", key: "drug", type: "text", placeholder: "e.g. Paracetamol" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                        <input type={f.type} placeholder={(f as any).placeholder} value={(treatmentForm as any)[f.key]}
                          onChange={e => setTreatmentForm({...treatmentForm, [f.key]: e.target.value})}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Route</label>
                      <select value={treatmentForm.route} onChange={e => setTreatmentForm({...treatmentForm, route: e.target.value})}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    {[
                      { label: "Dose", key: "dose", placeholder: "e.g. 500 mg" },
                      { label: "Time", key: "time", type: "time" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                        <input type={(f as any).type || "text"} placeholder={(f as any).placeholder} value={(treatmentForm as any)[f.key]}
                          onChange={e => setTreatmentForm({...treatmentForm, [f.key]: e.target.value})}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Signature</label>
                      <input type="text" placeholder="Nurse initials" value={treatmentForm.signature}
                        onChange={e => setTreatmentForm({...treatmentForm, signature: e.target.value})}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                    </div>
                    <div>
                      <button onClick={handleAddTreatment}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#00703C] hover:bg-[#005a2e] text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-colors">
                        <PlusCircle size={14} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Treatment Records Cards ── */}
                {treatmentEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <ClipboardList size={40} className="text-slate-200 mb-4" />
                    <p className="text-sm font-semibold text-slate-400">No treatment records yet</p>
                    <p className="text-xs text-slate-300 mt-1">Use the form above to record administered treatments</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3">
                      {treatmentEntries.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md transition-all duration-200 group">
                          <div className="w-9 h-9 rounded-full bg-[#00703C]/10 flex items-center justify-center text-xs font-extrabold text-[#00703C] flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-6 gap-4 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                              <p className="font-semibold text-slate-700 mt-0.5">{entry.date}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drug / Treatment</p>
                              <p className="font-bold text-slate-800 mt-0.5">{entry.drug}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Route</p>
                              <p className="font-semibold text-slate-700 mt-0.5">{entry.route}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dose</p>
                              <p className="font-semibold text-slate-700 mt-0.5">{entry.dose}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</p>
                              <p className="font-semibold text-slate-700 mt-0.5">{entry.time}</p>
                            </div>
                          </div>
                          <div className="text-right mr-3 hidden sm:block">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature</p>
                            <p className="text-xs font-[cursive] italic text-slate-600 mt-0.5">{entry.signature}</p>
                          </div>
                          <button onClick={() => setTreatmentEntries(treatmentEntries.filter(x => x.id !== entry.id))}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                      <button onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] border border-[#00703C] hover:bg-[#00703C]/5 px-4 py-2 rounded-lg transition-colors">
                        <Printer size={14} /> Print Chart
                      </button>
                      <button onClick={() => { setTreatmentEntries([]); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                        <Trash2 size={14} /> Clear All
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────
              APPOINTMENTS TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "appointments" && (
            <Card>
              <StickyHeader tabName="Appointments">
                <button onClick={fetchNurseAppointments} disabled={nurseApptLoading}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] bg-[#00703C]/10 hover:bg-[#00703C]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <RefreshCw size={13} className={nurseApptLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </StickyHeader>
              <div className="p-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <input type="date" value={nurseApptDate} onChange={e => setNurseApptDate(e.target.value)}
                    className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  <select value={nurseApptFilter} onChange={e => setNurseApptFilter(e.target.value)}
                    className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className="text-xs text-slate-400 ml-auto font-medium">{nurseAppts.length} appointment(s)</span>
                </div>

                {/* Date header */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 mb-3">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      {new Date(nurseApptDate + "T12:00:00").toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>

                  {nurseApptLoading ? (
                    <div className="py-16 flex items-center justify-center text-slate-400 text-sm">
                      <Loader2 size={16} className="animate-spin mr-2" /> Loading appointments...
                    </div>
                  ) : nurseAppts.length === 0 ? (
                    <div className="py-16 text-center">
                      <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-400">No appointments for this date</p>
                      <p className="text-xs text-slate-300 mt-1">Appointments can be scheduled from Reception</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {nurseAppts.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            a.status === "CANCELLED" ? "bg-red-100 text-red-500" :
                            a.status === "COMPLETED" ? "bg-green-100 text-green-600" :
                            a.status === "CONFIRMED" ? "bg-blue-100 text-blue-600" :
                            "bg-amber-100 text-amber-600"
                          }`}>
                            {a.Patient?.firstName?.[0]}{a.Patient?.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">
                                {a.Patient?.lastName}, {a.Patient?.firstName}
                              </span>
                              <StatusBadge status={a.status} />
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="font-mono">{a.Patient?.patientNumber}</span>
                              <span className="text-slate-300">|</span>
                              <span>{new Date(a.appointmentDate).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</span>
                              {a.Patient?.phoneNumber && <><span className="text-slate-300">|</span><span>{a.Patient.phoneNumber}</span></>}
                            </div>
                            {a.reason && <div className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-3 py-1.5">{a.reason}</div>}
                            {a.notes && <div className="text-[11px] text-slate-400 mt-1 italic">{a.notes}</div>}
                            {a.Staff && <div className="text-[10px] text-slate-400 mt-0.5">with {a.Staff.fullName}</div>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {a.status === "PENDING" && (
                              <button onClick={async () => {
                                await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status: "CONFIRMED" }) });
                                setNurseAppts((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CONFIRMED" } : x));
                              }}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors">
                                Confirm
                              </button>
                            )}
                            {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                              <button onClick={async () => {
                                await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
                                setNurseAppts((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CANCELLED" } : x));
                              }}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ────────────────────────────────────────────────────────────────
              REPORTS TAB
              ──────────────────────────────────────────────────────────────── */}
          {activeTab === "reports" && (
            <Card>
              <StickyHeader tabName="Reports & Handover" />
              <div className="p-6">
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-[#00703C]" /> Clinical Handover Notes
                  </h4>
                  <textarea placeholder="Clinical notes for handover..." value={reportText} onChange={e => setReportText(e.target.value)}
                    className="w-full h-[150px] px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all mb-4" />
                  <button onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#00703C] hover:bg-[#005a2e] text-white font-bold text-xs py-3 px-6 rounded-lg transition-colors">
                    <Printer size={16} /> PRINT HANDOVER
                  </button>
                </div>
              </div>
            </Card>
          )}

        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          TRIAGE ASSESSMENT MODAL — kept original design but polished
          ═══════════════════════════════════════════════════════════════════════ */}
      {showTriageModal && selectedPatient && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center overflow-auto p-5">
          <style>{`
            .watermarked-form::before {
              content: '';
              position: absolute;
              inset: 0;
              background: url('/Images/LOGO.jpg') center / 55% auto no-repeat;
              opacity: 0.045;
              pointer-events: none;
              z-index: 0;
            }
            .watermarked-form > * { position: relative; z-index: 1; }
            @media print { .watermarked-form::before { opacity: 0.08 !important; } }
          `}</style>
          <div className="w-full max-w-[1200px] bg-white rounded-2xl overflow-hidden shadow-2xl mt-5 mb-5" style={{ animation: "fade-in-up 0.25s ease-out" }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00703C] to-[#005a2e] px-8 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedPatient.lastName}, {selectedPatient.firstName}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                    <span className="font-mono">{selectedPatient.patientNumber}</span>
                    <span className="text-white/40">|</span>
                    <span>{selectedPatient.gender} &middot; {selectedPatient.age} yrs</span>
                    <span className="text-white/40">|</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{selectedPatient.createdAt}</span>
                    {selectedPatient.isEmergency && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">EMERGENCY</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleCancelTriage}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                <X size={15} /> Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="watermarked-form p-8 max-h-[calc(100vh-180px)] overflow-y-auto relative">

              {/* Mode of Arrival */}
              <div className="mb-6">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">Mode of Arrival</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "WALK_IN", label: "Walk-in" },
                    { value: "AMBULANCE", label: "Ambulance" },
                    { value: "WHEELCHAIR", label: "Wheelchair" },
                    { value: "REFERRAL", label: "Referral" },
                    { value: "TRANSFER", label: "Transfer" },
                  ].map(mode => (
                    <button key={mode.value} onClick={() => setTriageField("modeOfArrival", mode.value)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        triageForm.modeOfArrival === mode.value
                          ? "bg-[#00703C] text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-[#00703C] hover:text-[#00703C]"
                      }`}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vital Signs */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Activity size={15} /> Vital Signs
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { key: 'temperature', label: 'Temp (°C)', icon: Thermometer, low: 36.1, high: 37.8 },
                    { key: 'heartRate', label: 'Pulse (bpm)', icon: Heart, low: 60, high: 100 },
                    { key: 'respiratoryRate', label: 'RR (br/min)', icon: Wind, low: 12, high: 20 },
                    { key: 'spo2', label: 'SpO₂ (%)', icon: Droplets, low: 95, high: 100 },
                  ].map(v => {
                    const val = parseFloat(triageForm[v.key as keyof TriageFormData] as string);
                    const abnormal = !isNaN(val) && (val < v.low || val > v.high);
                    const Icon = v.icon;
                    return (
                      <div key={v.key} className={`rounded-xl border p-3 ${abnormal ? "bg-red-50 border-red-200" : "bg-slate-50/60 border-slate-200"}`}>
                        <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${abnormal ? "text-red-600" : "text-slate-500"}`}>
                          <Icon size={13} /> {v.label}
                          {abnormal && <AlertTriangle size={11} className="text-red-500" />}
                        </label>
                        <input type="number" step="0.1" value={triageForm[v.key as keyof TriageFormData] as string}
                          onChange={e => setTriageField(v.key as keyof TriageFormData, e.target.value)}
                          className={`w-full px-3 py-2 text-sm font-bold rounded-lg border outline-none transition-all ${
                            abnormal ? "border-red-300 bg-white focus:ring-2 focus:ring-red-200" : "border-slate-200 bg-white focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C]"
                          }`}
                          placeholder="&mdash;" />
                        {abnormal && <span className="text-[10px] text-red-500 mt-1 block">Normal: {v.low}&ndash;{v.high}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'bpSystolic', label: 'BP Systolic (mmHg)', icon: Eye, low: 90, high: 140 },
                    { key: 'bpDiastolic', label: 'BP Diastolic (mmHg)', icon: Eye, low: 60, high: 90 },
                    { key: 'weight', label: 'Weight (kg)', icon: Scale, low: null, high: null },
                    { key: 'height', label: 'Height (cm)', icon: Ruler, low: null, high: null },
                  ].map(v => {
                    const val = parseFloat(triageForm[v.key as keyof TriageFormData] as string);
                    const abnormal = v.low !== null && !isNaN(val) && (val < v.low || val > v.high);
                    const Icon = v.icon;
                    return (
                      <div key={v.key} className={`rounded-xl border p-3 ${abnormal ? "bg-red-50 border-red-200" : "bg-slate-50/60 border-slate-200"}`}>
                        <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${abnormal ? "text-red-600" : "text-slate-500"}`}>
                          <Icon size={13} /> {v.label}
                          {abnormal && <AlertTriangle size={11} className="text-red-500" />}
                        </label>
                        <input type="number" step="0.1" value={triageForm[v.key as keyof TriageFormData] as string}
                          onChange={e => setTriageField(v.key as keyof TriageFormData, e.target.value)}
                          className={`w-full px-3 py-2 text-sm font-bold rounded-lg border outline-none transition-all ${
                            abnormal ? "border-red-300 bg-white focus:ring-2 focus:ring-red-200" : "border-slate-200 bg-white focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C]"
                          }`}
                          placeholder="&mdash;" />
                        {abnormal && <span className="text-[10px] text-red-500 mt-1 block">Normal: {v.low}&ndash;{v.high}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pain & Clinical Assessment */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pain Assessment</h4>
                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-2">Pain Level (0&ndash;10)</label>
                    <div className="flex gap-1 flex-wrap">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} onClick={() => setTriageField("painLevel", n.toString())}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                            triageForm.painLevel === n.toString()
                              ? "bg-[#00703C] text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-500 hover:border-[#00703C]"
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
                      <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span><span>Worst</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Pain Location</label>
                    <input type="text" value={triageForm.painLocation} onChange={e => setTriageField("painLocation", e.target.value)}
                      placeholder="e.g., lower abdomen, right knee..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                </div>
                <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Allergies & Medical History</h4>
                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Known Allergies</label>
                    <textarea value={triageForm.allergies} onChange={e => setTriageField("allergies", e.target.value)}
                      placeholder="List known allergies..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Relevant Medical History</label>
                    <textarea value={triageForm.medicalHistory} onChange={e => setTriageField("medicalHistory", e.target.value)}
                      placeholder="Chronic conditions, past surgeries..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                </div>
              </div>

              {/* Nursing Observations */}
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nursing Observations</h4>
                <textarea value={triageForm.nursingObservations} onChange={e => setTriageField("nursingObservations", e.target.value)}
                  placeholder="General appearance, skin condition, mobility, behaviour, additional observations..."
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
              </div>

              {/* Red-Flag Indicators */}
              <div className="mb-6 bg-red-50/60 border border-red-200 rounded-xl p-4">
                <h4 className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <AlertCircle size={14} /> Red-Flag Indicators &mdash; Check all that apply
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    "Airway compromise", "Severe respiratory distress", "Shock / hypotension",
                    "Unresponsive / unconscious", "Active seizure", "Severe bleeding / hemorrhage",
                    "Chest pain + cardiac symptoms", "Severe allergic reaction",
                  ].map(flag => {
                    const checked = triageForm.redFlags.includes(flag);
                    return (
                      <label key={flag}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border text-xs font-medium transition-all ${
                          checked ? "bg-red-100 border-red-300 text-red-800" : "bg-white border-red-100 text-red-600 hover:border-red-200"
                        }`}>
                        <input type="checkbox" checked={checked}
                          onChange={() => setTriageField("redFlags", checked ? triageForm.redFlags.filter(f => f !== flag) : [...triageForm.redFlags, flag])}
                          className="accent-red-500 w-3.5 h-3.5" />
                        {flag}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ESI Classification */}
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Stethoscope size={14} /> Emergency Severity Index (ESI)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { level: 1, label: "Resuscitation", color: "#dc2626", desc: "Immediate life-saving intervention" },
                    { level: 2, label: "Emergent", color: "#f97316", desc: "High risk / confused / severe pain" },
                    { level: 3, label: "Urgent", color: "#eab308", desc: "Needs 2+ resources, stable vitals" },
                    { level: 4, label: "Less Urgent", color: "#22c55e", desc: "Needs 1 resource" },
                    { level: 5, label: "Non-Urgent", color: "#06b6d4", desc: "No resources needed" },
                  ].map(esi => {
                    const isSelected = triageForm.esiLevel === esi.level;
                    return (
                      <button key={esi.level} onClick={() => setTriageField("esiLevel", esi.level)}
                        className={`rounded-xl p-3 border-2 text-center transition-all ${
                          isSelected ? "shadow-sm" : ""
                        }`}
                        style={{
                          borderColor: isSelected ? esi.color : "#e2e8f0",
                          backgroundColor: isSelected ? `${esi.color}12` : "white",
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-1.5"
                          style={{ backgroundColor: isSelected ? esi.color : "#cbd5e1" }}>
                          {esi.level}
                        </div>
                        <div className="text-[11px] font-bold" style={{ color: isSelected ? esi.color : "#475569" }}>{esi.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{esi.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nursing Notes */}
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nursing Notes</h4>
                <textarea value={triageForm.nursingNotes} onChange={e => setTriageField("nursingNotes", e.target.value)}
                  placeholder="Free-text nursing notes, clinical impressions, handover details..."
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
              </div>

              {/* Triage Outcome */}
              <div className="mb-6 bg-green-50/60 border border-green-200 rounded-xl p-4">
                <h4 className="text-[11px] font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <ArrowRight size={14} /> Triage Outcome — Where does the patient go next?
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { value: "SEND_DOCTOR", label: "Doctor", color: "#6366f1", desc: "Joins doctor queue" },
                    { value: "EMERGENCY", label: "Emergency Unit", color: "#dc2626", desc: "Immediate care needed" },
                    { value: "OBSERVATION", label: "Observation Area", color: "#eab308", desc: "Monitor & reassess" },
                    { value: "SPECIALIST", label: "Specialist", color: "#06b6d4", desc: "Specialist consultation" },
                    { value: "DENTIST", label: "Dentist", color: "#0891b2", desc: "Dental department" },
                    { value: "LABORATORY", label: "Laboratory", color: "#d97706", desc: "Lab tests & specimens" },
                    { value: "RADIOLOGY", label: "Radiology", color: "#7c3aed", desc: "X-ray / imaging" },
                    { value: "DISCHARGE", label: "Discharge", color: "#22c55e", desc: "Patient can go home" },
                  ].map(outcome => {
                    const isSelected = triageForm.triageOutcome === outcome.value;
                    return (
                      <button key={outcome.value} onClick={() => setTriageField("triageOutcome", outcome.value)}
                        className={`rounded-xl p-3 border-2 text-center transition-all ${
                          isSelected ? "shadow-sm bg-white" : "bg-white"
                        }`}
                        style={{
                          borderColor: isSelected ? outcome.color : "#d0d5dd",
                        }}>
                        <div className="text-xs font-bold" style={{ color: isSelected ? outcome.color : "#475569" }}>{outcome.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{outcome.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {triageForm.triageOutcome === "SPECIALIST" && (
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Referred To (Specialist / Department)</label>
                    <input type="text" value={triageForm.referredTo} onChange={e => setTriageField("referredTo", e.target.value)}
                      placeholder="e.g., Orthopedics, Cardiology, Dr. Mukasa..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                )}
                {triageForm.triageOutcome === "RADIOLOGY" && (
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Imaging Study Type</label>
                    <select value={triageForm.studyType} onChange={e => setTriageField("studyType", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                      <option value="">Select study type...</option>
                      <option value="X_RAY">X-Ray</option>
                      <option value="ULTRASOUND">Ultrasound</option>
                      <option value="CT_SCAN">CT Scan</option>
                      <option value="MRI">MRI</option>
                      <option value="MAMMOGRAPHY">Mammography</option>
                      <option value="ECHOCARDIOGRAPHY">Echocardiography</option>
                      <option value="DOPPLER">Doppler</option>
                      <option value="FLUOROSCOPY">Fluoroscopy</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <button onClick={handleCancelTriage} disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => handleSaveTriage(false)} disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-[#00703C] bg-white text-[#00703C] text-xs font-bold hover:bg-[#00703C]/5 transition-colors flex items-center gap-1.5">
                  <Save size={14} /> {isSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => handleSaveTriage(true)} disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#00703C] hover:bg-[#005a2e] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                  <CheckCircle size={14} /> {isSaving ? "Sending..." : "Complete & Send"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ANC ASSESSMENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      {showAncModal && ancSelectedPatient && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center overflow-auto p-5">
          <div className="w-full max-w-[900px] bg-white rounded-2xl overflow-hidden shadow-2xl mt-5 mb-5" style={{ animation: "fade-in-up 0.25s ease-out" }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00703C] to-[#005a2e] px-8 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {ancSelectedPatient.firstName?.[0]}{ancSelectedPatient.lastName?.[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{ancSelectedPatient.lastName}, {ancSelectedPatient.firstName}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                    <span className="font-mono">{ancSelectedPatient.patientNumber}</span>
                    <span className="text-white/40">|</span>
                    <span>{ancSelectedPatient.gender} &middot; {ancSelectedPatient.age} yrs</span>
                  </div>
                </div>
              </div>
              <button onClick={handleCancelAnc}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                <X size={15} /> Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[calc(100vh-180px)] overflow-y-auto">
              {/* ── Obstetric History ───────────────────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Baby size={15} /> Obstetric History
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { key: "gestationalAgeWeeks", label: "Gestational Age (wks)", type: "number", placeholder: "e.g. 28" },
                    { key: "gravida", label: "Gravida", type: "number", placeholder: "e.g. 2" },
                    { key: "para", label: "Para", type: "number", placeholder: "e.g. 1" },
                    { key: "LMP", label: "LMP (Last Menstrual Period)", type: "date" },
                    { key: "EDD", label: "EDD (Est. Delivery Date)", type: "date" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                      <input type={f.type} placeholder={(f as any).placeholder}
                        value={(ancForm as any)[f.key]}
                        onChange={e => setAncField(f.key, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                      {f.key === "EDD" && ancForm.EDD && ancForm.LMP && (
                        <p className="text-[9px] text-emerald-600 mt-0.5 font-medium">Auto-calculated from LMP</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Fetal Assessment ───────────────────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Heart size={15} /> Fetal Assessment
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "fundalHeight", label: "Fundal Height (cm)", type: "number", step: "0.1", placeholder: "e.g. 30" },
                    { key: "fetalHeartRate", label: "Fetal Heart Rate (bpm)", type: "number", placeholder: "e.g. 140" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                      <input type={f.type} step={(f as any).step} placeholder={(f as any).placeholder}
                        value={(ancForm as any)[f.key]}
                        onChange={e => setAncField(f.key, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Fetal Presentation</label>
                    <select value={ancForm.fetalPresentation} onChange={e => setAncField("fetalPresentation", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                      <option value="">Select...</option>
                      <option value="CEPHALIC">Cephalic</option>
                      <option value="BREECH">Breech</option>
                      <option value="TRANSVERSE">Transverse</option>
                      <option value="OBLIQUE">Oblique</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Fetal Movement</label>
                    <select value={ancForm.fetalMovement} onChange={e => setAncField("fetalMovement", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                      <option value="">Select...</option>
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="REDUCED">Reduced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Maternal Vitals ────────────────────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Activity size={15} /> Maternal Vitals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="grid grid-cols-2 gap-3 col-span-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">BP Systolic (mmHg)</label>
                      <input type="number" value={ancForm.bpSystolic} onChange={e => setAncField("bpSystolic", e.target.value)}
                        placeholder="e.g. 120" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">BP Diastolic (mmHg)</label>
                      <input type="number" value={ancForm.bpDiastolic} onChange={e => setAncField("bpDiastolic", e.target.value)}
                        placeholder="e.g. 80" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Maternal Weight (kg)</label>
                    <input type="number" step="0.1" value={ancForm.maternalWeight} onChange={e => setAncField("maternalWeight", e.target.value)}
                      placeholder="e.g. 65.5" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                </div>
              </div>

              {/* ── Urine Dipstick ─────────────────────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Droplets size={15} /> Urine Dipstick
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "urineProtein", label: "Protein" },
                    { key: "urineGlucose", label: "Glucose" },
                    { key: "urineNitrites", label: "Nitrites" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                      <select value={(ancForm as any)[f.key]} onChange={e => setAncField(f.key, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                        <option value="NEGATIVE">Negative</option>
                        <option value="TRACE">Trace</option>
                        <option value="PLUS_1">+</option>
                        <option value="PLUS_2">++</option>
                        <option value="PLUS_3">+++</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Edema ──────────────────────────────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#00703C] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <AlertCircle size={15} /> Edema Assessment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Edema Severity</label>
                    <select value={ancForm.edema} onChange={e => setAncField("edema", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all">
                      <option value="NONE">None</option>
                      <option value="MILD">Mild</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="SEVERE">Severe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Edema Location</label>
                    <input type="text" value={ancForm.edemaLocation} onChange={e => setAncField("edemaLocation", e.target.value)}
                      placeholder="e.g. ankles, hands, face..." className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                  </div>
                </div>
              </div>

              {/* ── Complaints & Notes ─────────────────────────────────────── */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Complaints / Symptoms</h4>
                  <textarea value={ancForm.complaints} onChange={e => setAncField("complaints", e.target.value)}
                    placeholder="Any symptoms or concerns reported by the patient..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Clinical Notes</h4>
                  <textarea value={ancForm.clinicalNotes} onChange={e => setAncField("clinicalNotes", e.target.value)}
                    placeholder="Assessment notes, observations, plan..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#00703C]/20 focus:border-[#00703C] transition-all" />
                </div>
              </div>

              {/* ── Outcome & Follow-Up ────────────────────────────────────── */}
              <div className="mb-6 bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Calendar size={14} /> Outcome & Follow-Up
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1.5">Outcome</label>
                    <select value={ancForm.outcome} onChange={e => setAncField("outcome", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all">
                      <option value="CONTINUE_MONITORING">Continue Monitoring</option>
                      <option value="REFER_TO_DOCTOR">Refer to Doctor</option>
                      <option value="ADMIT">Admit</option>
                      <option value="DISCHARGE">Discharge</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1.5">Next Appointment Date</label>
                    <input type="date" value={ancForm.nextAppointmentDate} onChange={e => setAncField("nextAppointmentDate", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all" />
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ─────────────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <button onClick={handleCancelAnc} disabled={ancSaving}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveAnc} disabled={ancSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#00703C] hover:bg-[#005a2e] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                  <Save size={14} /> {ancSaving ? "Saving..." : "Save Assessment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
