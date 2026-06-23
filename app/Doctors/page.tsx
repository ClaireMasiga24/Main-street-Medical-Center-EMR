"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import NotificationInbox from "../components/NotificationInbox";
import {
  Users, Pill, ArrowLeft, ArrowRight, CheckCircle,
  LogOut, AlertTriangle, Stethoscope, DoorOpen, Hospital,
  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Calendar, ClipboardList, Printer,
  Clock, Activity, AlertCircle, FileText, Bell, Search, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RxDraft = { medication: string; dosage: string; instructions: string };

interface DashboardPatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  phoneNumber: string | null;
  isEmergency: boolean;
  currentStatus: string;
  updatedAt: string;
  waitingMinutes: number;
  waitingDisplay: string;
  chiefComplaint: string;
  esiLevel: number | null;
  triageCompletedAt: string | null;
  source: string;
  pendingLabs: number;
  pendingImaging: number;
  hasAppointment: boolean;
}

interface DashboardMetrics {
  awaitingDoctor: number;
  inConsultation: number;
  completedToday: number;
  pendingLabs: number;
  pendingRadiology: number;
  todayAppointments: number;
  admittedPatients: number;
}

interface ClinicalUpdate {
  id: string;
  type: "CRITICAL_LAB" | "CRITICAL_IMAGING" | "LAB_RESULT" | "RADIOLOGY_REPORT" | "COMMUNICATION";
  title: string;
  message: string;
  patientName: string;
  patientId: number;
  patientNumber: string;
  timestamp: string;
  severity: "critical" | "info";
}

interface DashboardData {
  patients: DashboardPatient[];
  metrics: DashboardMetrics;
  clinicalUpdates: ClinicalUpdate[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LAB_TESTS = [
  "Full Blood Count",
  "Urinalysis",
  "Blood glucose",
  "Malaria RDT",
  "HIV screen",
  "Typhoid / Widal",
  "Liver Function Test",
  "Renal Function Test",
];

const ESI_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-400 text-slate-900",
  4: "bg-green-400 text-slate-900",
  5: "bg-blue-400 text-white",
};

const ESI_LABELS: Record<number, string> = {
  1: "Resuscitation",
  2: "Emergent",
  3: "Urgent",
  4: "Less Urgent",
  5: "Non-Urgent",
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  "Triage": Stethoscope,
  "Emergency": AlertTriangle,
  "Appointment": Calendar,
  "Lab Referral": Microscope,
  "Radiology Referral": Radio,
  "Follow-up": Users,
};

const SOURCE_COLORS: Record<string, string> = {
  "Triage": "bg-blue-100 text-blue-700",
  "Emergency": "bg-red-100 text-red-700",
  "Appointment": "bg-purple-100 text-purple-700",
  "Lab Referral": "bg-amber-100 text-amber-700",
  "Radiology Referral": "bg-cyan-100 text-cyan-700",
  "Follow-up": "bg-emerald-100 text-emerald-700",
};

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  doctorName,
  queueCount,
  admittedCount,
  activeSection,
  onQueue,
  onAdmitted,
  onRecords,
  onAppointments,
  onLogout,
  onClinicalUpdates,
}: {
  doctorName: string;
  queueCount: number;
  admittedCount: number;
  activeSection: string;
  onQueue: () => void;
  onAdmitted: () => void;
  onRecords: () => void;
  onAppointments: () => void;
  onLogout: () => void;
  onClinicalUpdates: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#0a2e1a] flex flex-col z-50">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10">
            <Image src="/images/LOGO.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="text-white text-sm font-medium">Main Street</div>
            <div className="text-[#5a9e78] text-[11px]">Medical Center</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 mb-2">Clinical</p>
        <button
          onClick={onQueue}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === "queue"
              ? "bg-[#1a5233] text-white"
              : "text-[#a0c8b0] hover:bg-white/5"
          }`}
        >
          <Users size={15} />
          Patient Queue
          {queueCount > 0 && (
            <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
              {queueCount}
            </span>
          )}
        </button>
        <button
          onClick={onAdmitted}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === "admitted"
              ? "bg-[#1a5233] text-white"
              : "text-[#a0c8b0] hover:bg-white/5"
          }`}
        >
          <Hospital size={15} />
          Admitted Patients
          {admittedCount > 0 && (
            <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
              {admittedCount}
            </span>
          )}
        </button>
        <button
          onClick={onRecords}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === "records"
              ? "bg-[#1a5233] text-white"
              : "text-[#a0c8b0] hover:bg-white/5"
          }`}
        >
          <ClipboardList size={15} />
          Doctor Records
        </button>
        <button
          onClick={onAppointments}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === "appointments"
              ? "bg-[#1a5233] text-white"
              : "text-[#a0c8b0] hover:bg-white/5"
          }`}
        >
          <Calendar size={15} />
          Appointments
        </button>
        <button
          onClick={onClinicalUpdates}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === "updates"
              ? "bg-[#1a5233] text-white"
              : "text-[#a0c8b0] hover:bg-white/5"
          }`}
        >
          <Bell size={15} />
          Clinical Updates
        </button>

        <div className="mt-1">
          <NotificationInbox department="Doctor" />
        </div>
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-4">
        <div className="px-2 mb-3">
          <div className="text-[#a0c8b0] text-sm font-medium">{doctorName}</div>
          <div className="text-[#3d7a55] text-xs">Doctor</div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 text-sm hover:bg-rose-900/30"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Metrics Bar ──────────────────────────────────────────────────────────────

function MetricsBar({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    { label: "Waiting Patients", value: metrics.awaitingDoctor, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Active Consultations", value: metrics.inConsultation, icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Completed Today", value: metrics.completedToday, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Pending Lab Results", value: metrics.pendingLabs, icon: Microscope, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Pending Radiology", value: metrics.pendingRadiology, icon: Radio, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
    { label: "Today's Appointments", value: metrics.todayAppointments, icon: Calendar, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  ];

  return (
    <div className="grid grid-cols-6 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${c.bg} ${c.border} border rounded-xl px-4 py-3 flex items-center gap-3`}
        >
          <div className={`${c.color} p-2 rounded-lg ${c.bg}`}>
            <c.icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {c.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({
  patient,
  onSelect,
}: {
  patient: DashboardPatient;
  onSelect: (p: DashboardPatient) => void;
}) {
  const SourceIcon = SOURCE_ICONS[patient.source] || User;

  return (
    <div
      onClick={() => onSelect(patient)}
      className={`relative bg-white rounded-xl border-2 transition-all cursor-pointer
        ${patient.isEmergency
          ? "border-red-300 hover:border-red-500 shadow-sm shadow-red-100"
          : patient.currentStatus === "IN_CONSULTATION"
          ? "border-amber-300 hover:border-amber-500"
          : "border-slate-100 hover:border-slate-300"
        } hover:shadow-md`}
    >
      {/* Emergency ribbon */}
      {patient.isEmergency && (
        <div className="absolute -top-px -right-px bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center gap-1 uppercase tracking-wider">
          <AlertTriangle size={10} /> Emergency
        </div>
      )}

      <div className="p-4">
        {/* Row 1: Identity & Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
              ${patient.isEmergency ? "bg-red-100 text-red-700" : "bg-[#0a2e1a]/10 text-[#0a2e1a]"}`}
            >
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 truncate">
                  {patient.lastName}, {patient.firstName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="font-mono font-medium text-[#0a2e1a]/60">{patient.patientNumber}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.gender === "MALE" ? "M" : "F"}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.age} yrs</span>
              </div>
            </div>
          </div>

          {/* ESI Badge */}
          {patient.esiLevel && (
            <div className="flex-shrink-0 ml-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  ESI_COLORS[patient.esiLevel] || "bg-slate-200 text-slate-600"
                }`}
                title={ESI_LABELS[patient.esiLevel] || ""}
              >
                {patient.esiLevel}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Chief Complaint */}
        {patient.chiefComplaint && (
          <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Chief Complaint
            </p>
            <p className="text-sm text-slate-700 line-clamp-2">{patient.chiefComplaint}</p>
          </div>
        )}

        {/* Row 3: Status Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Current Status */}
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            patient.currentStatus === "IN_CONSULTATION"
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {patient.currentStatus === "IN_CONSULTATION" ? "In Consultation" : "Awaiting Doctor"}
          </span>

          {/* Source */}
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
            SOURCE_COLORS[patient.source] || "bg-slate-100 text-slate-600"
          }`}>
            <SourceIcon size={10} />
            {patient.source}
          </span>

          {/* Waiting Time */}
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
            patient.waitingMinutes > 60
              ? "bg-red-50 text-red-600"
              : patient.waitingMinutes > 30
              ? "bg-amber-50 text-amber-600"
              : "bg-slate-100 text-slate-500"
          }`}>
            <Clock size={10} />
            {patient.waitingDisplay}
          </span>
        </div>

        {/* Row 4: Pending items indicator */}
        {(patient.pendingLabs > 0 || patient.pendingImaging > 0) && (
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100">
            {patient.pendingLabs > 0 && (
              <span className="text-[10px] text-amber-600 flex items-center gap-1">
                <Microscope size={10} />
                {patient.pendingLabs} pending lab{patient.pendingLabs > 1 ? "s" : ""}
              </span>
            )}
            {patient.pendingImaging > 0 && (
              <span className="text-[10px] text-cyan-600 flex items-center gap-1">
                <Radio size={10} />
                {patient.pendingImaging} pending imaging
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Clinical Updates Panel ────────────────────────────────────────────────────

function ClinicalUpdatesPanel({
  updates,
  onViewPatient,
}: {
  updates: ClinicalUpdate[];
  onViewPatient: (patientId: number) => void;
}) {
  const grouped = {
    critical: updates.filter((u) => u.severity === "critical"),
    info: updates.filter((u) => u.severity === "info"),
  };

  if (updates.length === 0) {
    return (
      <div className="text-center py-16">
        <Bell size={32} className="mx-auto text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-400">No recent updates</p>
        <p className="text-xs text-slate-300 mt-1">Clinical updates will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Critical Updates */}
      {grouped.critical.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Critical ({grouped.critical.length})
          </h4>
          <div className="space-y-2">
            {grouped.critical.map((u) => (
              <button
                key={u.id}
                onClick={() => u.patientId && onViewPatient(u.patientId)}
                className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-3 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-red-800">{u.title}</span>
                      {u.patientName && (
                        <span className="text-[10px] font-medium text-red-600">
                          {u.patientName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-red-700 mt-0.5 line-clamp-2">{u.message}</p>
                    <p className="text-[9px] text-red-400 mt-1">
                      {formatTimestamp(u.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Updates */}
      {grouped.info.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
            <Bell size={12} /> Recent Updates
          </h4>
          <div className="space-y-1.5">
            {grouped.info.slice(0, 15).map((u) => (
              <button
                key={u.id}
                onClick={() => u.patientId && onViewPatient(u.patientId)}
                className="w-full text-left bg-white border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  {u.type === "LAB_RESULT" && <Microscope size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />}
                  {u.type === "RADIOLOGY_REPORT" && <Radio size={14} className="text-cyan-500 mt-0.5 flex-shrink-0" />}
                  {u.type === "COMMUNICATION" && <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">{u.title}</span>
                      {u.patientName && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {u.patientName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{u.message}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {formatTimestamp(u.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Consultation Panel ────────────────────────────────────────────────────────

function ConsultationPanel({
  patient,
  onBack,
  onComplete,
}: {
  patient: DashboardPatient;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [tab, setTab] = useState<"history" | "exam" | "diagnosis" | "rx" | "notes">("history");
  const [symptoms, setSymptoms] = useState(patient.chiefComplaint || "");
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [reviewOfOtherSystems, setReviewOfOtherSystems] = useState("");
  const [physicalExamination, setPhysicalExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState("");
  const [assessment, setAssessment] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [doctorSignature, setDoctorSignature] = useState("");
  const [rxDrafts, setRxDrafts] = useState<RxDraft[]>([]);
  const [labChecked, setLabChecked] = useState<Set<string>>(new Set());
  const [showNewRx, setShowNewRx] = useState(false);
  const [newRx, setNewRx] = useState<RxDraft>({ medication: "", dosage: "", instructions: "" });
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState("");
  const [showReferralPicker, setShowReferralPicker] = useState(false);

  const addRx = () => {
    if (!newRx.medication) return;
    setRxDrafts([...rxDrafts, { ...newRx }]);
    setNewRx({ medication: "", dosage: "", instructions: "" });
    setShowNewRx(false);
  };

  const handleAction = async (action: string, referralDept?: string) => {
    const routeTo = action === "referral" && referralDept ? referralDept : action;
    setSaving(true);
    setSavingAction(action);
    setShowReferralPicker(false);
    try {
      const res = await fetch("/api/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          staffId: 1,
          symptoms,
          historyOfPresentIllness,
          pastMedicalHistory,
          reviewOfOtherSystems,
          physicalExamination,
          diagnosis,
          differentialDiagnosis,
          assessment,
          treatmentPlan,
          notes,
          doctorSignature,
          prescriptions: rxDrafts.map((r) => ({
            medication: r.medication,
            dosage: r.dosage,
            instructions: r.instructions,
          })),
          labRequests: Array.from(labChecked).map((t) => ({ testName: t })),
          routeTo,
        }),
      });
      if (res.ok) {
        onComplete();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert("Network error completing consultation.");
    } finally {
      setSaving(false);
      setSavingAction("");
    }
  };

  const handleStartConsultation = async () => {
    if (patient.currentStatus !== "IN_CONSULTATION") {
      await fetch("/api/doctor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id }),
      });
    }
  };

  useEffect(() => {
    if (patient.currentStatus !== "IN_CONSULTATION") {
      handleStartConsultation();
    }
	  }, [patient.id]);

	  const isBusy = saving;

  const REFERRAL_DEPARTMENTS = [
    { value: "LAB", label: "Laboratory", icon: Microscope },
    { value: "SONOGRAPHY", label: "Sonography", icon: Waves },
    { value: "RADIOLOGY", label: "Radiology", icon: Radio },
    { value: "DENTIST", label: "Dentist", icon: Stethoscope },
    { value: "PHARMACY", label: "Pharmacy", icon: Pill },
    { value: "NURSE", label: "Nurse / Midwife", icon: Activity },
    { value: "CASHIER", label: "Cashier", icon: CreditCard },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Queue
        </button>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            patient.isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          }`}>
            {patient.patientNumber}
          </div>
        </div>
      </div>

      {/* Patient Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
              patient.isEmergency ? "bg-red-100 text-red-700" : "bg-[#0a2e1a]/10 text-[#0a2e1a]"
            }`}>
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {patient.lastName}, {patient.firstName}
              </h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="font-mono text-xs text-[#0a2e1a]/60">{patient.patientNumber}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.gender === "MALE" ? "Male" : "Female"}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.age} years</span>
                {patient.phoneNumber && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>{patient.phoneNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {patient.esiLevel && (
            <div className="text-right">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto ${
                ESI_COLORS[patient.esiLevel] || "bg-slate-200 text-slate-600"
              }`}>
                {patient.esiLevel}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {ESI_LABELS[patient.esiLevel] || "ESI Level"}
              </div>
            </div>
          )}
        </div>

        {patient.chiefComplaint && (
          <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Chief Complaint
            </p>
            <p className="text-sm text-slate-700">{patient.chiefComplaint}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {([
            { key: "history" as const, label: "History", icon: FileText },
            { key: "exam" as const, label: "Examination", icon: Stethoscope },
            { key: "diagnosis" as const, label: "Diagnosis & Plan", icon: AlertCircle },
            { key: "rx" as const, label: "Prescriptions", icon: Pill },
            { key: "notes" as const, label: "Notes & Orders", icon: ClipboardList },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-b-2 border-[#0a2e1a] text-[#0a2e1a] bg-[#0a2e1a]/5"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── History Tab ───────────────────────────────────────────── */}
          {tab === "history" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Presenting Complaint
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]"
                  placeholder="Patient's primary complaint..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  History of Presenting Complaint
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                  placeholder="Onset, duration, character, radiation, associated symptoms, aggravating/relieving factors, severity, timing..."
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Review of Other Systems
                  </label>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
                    placeholder="Constitutional, respiratory, cardiovascular, GI, GU, musculoskeletal, neurological, skin..."
                    value={reviewOfOtherSystems}
                    onChange={(e) => setReviewOfOtherSystems(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Past Medical / Surgical History
                  </label>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
                    placeholder="Chronic illnesses, hospitalizations, previous surgeries, complications, medications..."
                    value={pastMedicalHistory}
                    onChange={(e) => setPastMedicalHistory(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Examination Findings
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
                  placeholder="General, HEENT, Neck, Chest/Lungs, Cardiovascular, Abdomen, Extremities, Neurological, Skin..."
                  value={physicalExamination}
                  onChange={(e) => setPhysicalExamination(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Diagnosis
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                  placeholder="Primary diagnosis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Treatment Plan
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                  placeholder="Plan of care — medications, procedures, follow-up, lifestyle modifications..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      By Dr:
                    </label>
                    <input
                      type="text"
                      placeholder="Type your full name to sign..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20"
                      value={doctorSignature}
                      onChange={(e) => setDoctorSignature(e.target.value)}
                    />
                    {doctorSignature && (
                      <div className="mt-2 px-3 py-2 bg-white rounded-lg border border-slate-100">
                        <p className="text-lg font-['cursive,sans-serif'] italic text-slate-700" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>
                          {doctorSignature}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 bg-white"
                      value={new Date().toISOString().split("T")[0]}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              {/* ── Print Button ── */}
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <Printer size={16} /> PRINT
              </button>
            </div>
          )}

          {/* ── Examination Tab ────────────────────────────────────────── */}
          {tab === "exam" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Physical Examination Findings
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[200px]"
                  placeholder="Document your physical examination findings systematically:&#10;&#10;General:&#10;HEENT:&#10;Neck:&#10;Chest / Lungs:&#10;Cardiovascular:&#10;Abdomen:&#10;Extremities:&#10;Neurological:&#10;Skin:&#10;Other:"
                  value={physicalExamination}
                  onChange={(e) => setPhysicalExamination(e.target.value)}
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Triage Vitals (at presentation)
                </p>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400">Temp</span>
                    <p className="font-semibold text-slate-700">-- °C</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400">BP</span>
                    <p className="font-semibold text-slate-700">--/--</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400">HR</span>
                    <p className="font-semibold text-slate-700">-- bpm</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400">SpO₂</span>
                    <p className="font-semibold text-slate-700">--%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Diagnosis & Plan Tab ──────────────────────────────────── */}
          {tab === "diagnosis" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Diagnosis
                  </label>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                    placeholder="Primary diagnosis..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Differential Diagnosis
                  </label>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                    placeholder="Other possible diagnoses to consider..."
                    value={differentialDiagnosis}
                    onChange={(e) => setDifferentialDiagnosis(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Assessment
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
                  placeholder="Clinical assessment summarizing history, exam findings, and reasoning..."
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Treatment Plan
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
                  placeholder="Plan of care — medications, procedures, follow-up, lifestyle modifications..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Prescriptions Tab ──────────────────────────────────────── */}
          {tab === "rx" && (
            <div className="space-y-4">
              {rxDrafts.length > 0 && (
                <div className="space-y-2">
                  {rxDrafts.map((rx, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{rx.medication}</p>
                        <p className="text-xs text-slate-500">{rx.dosage} — {rx.instructions}</p>
                      </div>
                      <button
                        onClick={() => setRxDrafts(rxDrafts.filter((_, j) => j !== i))}
                        className="text-rose-400 hover:text-rose-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showNewRx ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <input
                    type="text"
                    placeholder="Medication name"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                    value={newRx.medication}
                    onChange={(e) => setNewRx({ ...newRx, medication: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      className="p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                      value={newRx.dosage}
                      onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Instructions"
                      className="p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"
                      value={newRx.instructions}
                      onChange={(e) => setNewRx({ ...newRx, instructions: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addRx}
                      className="bg-[#0a2e1a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0d3d24] transition-colors"
                    >
                      Add Prescription
                    </button>
                    <button
                      onClick={() => { setShowNewRx(false); setNewRx({ medication: "", dosage: "", instructions: "" }); }}
                      className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewRx(true)}
                  className="flex items-center gap-2 text-[#0a2e1a] text-sm font-medium hover:text-[#0d3d24]"
                >
                  <Plus size={15} /> Add Prescription
                </button>
              )}
            </div>
          )}

          {/* ── Notes & Orders Tab ────────────────────────────────────── */}
          {tab === "notes" && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Clinical Notes
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[120px]"
                  placeholder="Additional clinical notes, observations, or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Microscope size={13} /> Laboratory Orders
                  {labChecked.size > 0 && (
                    <span className="text-[10px] bg-[#0a2e1a] text-white px-2 py-0.5 rounded-full">
                      {labChecked.size}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LAB_TESTS.map((t) => (
                    <label
                      key={t}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        labChecked.has(t)
                          ? "border-[#0a2e1a] bg-[#0a2e1a]/5"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#0a2e1a]"
                        checked={labChecked.has(t)}
                        onChange={(e) => {
                          const n = new Set(labChecked);
                          e.target.checked ? n.add(t) : n.delete(t);
                          setLabChecked(n);
                        }}
                      />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Signature ── */}
              <div className="border-t border-slate-100 pt-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      By Dr:
                    </label>
                    <input
                      type="text"
                      placeholder="Type your full name to sign..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20"
                      value={doctorSignature}
                      onChange={(e) => setDoctorSignature(e.target.value)}
                    />
                    {doctorSignature && (
                      <div className="mt-2 px-3 py-2 bg-white rounded-lg border border-slate-100">
                        <p className="text-lg italic text-slate-700" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>
                          {doctorSignature}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 bg-white"
                      value={new Date().toISOString().split("T")[0]}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* ── Print Button ── */}
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} /> PRINT
              </button>

              {/* ── Print Area (hidden on screen, shown in print) ── */}
              <div className="print-area hidden print:block">
                <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
                  <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid #0a2e1a", paddingBottom: "20px" }}>
                    <h1 style={{ fontSize: "22px", color: "#0a2e1a", margin: 0, fontWeight: "bold" }}>MAIN STREET MEDICAL CENTER</h1>
                    <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0 0" }}>Consultation Clinical Record</p>
                  </div>

                  <table style={{ width: "100%", fontSize: "13px", marginBottom: "20px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: "bold", color: "#0a2e1a", width: "150px", padding: "4px 8px" }}>Patient Name:</td>
                        <td style={{ borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{patient.lastName}, {patient.firstName}</td>
                        <td style={{ fontWeight: "bold", color: "#0a2e1a", width: "100px", padding: "4px 8px" }}>Patient ID:</td>
                        <td style={{ borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{patient.patientNumber}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", color: "#0a2e1a", padding: "4px 8px" }}>Gender / Age:</td>
                        <td style={{ borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{patient.gender === "MALE" ? "Male" : "Female"} / {patient.age} yrs</td>
                        <td style={{ fontWeight: "bold", color: "#0a2e1a", padding: "4px 8px" }}>Date:</td>
                        <td style={{ borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</td>
                      </tr>
                    </tbody>
                  </table>

                  {[
                    { label: "Presenting Complaint", value: symptoms },
                    { label: "History of Presenting Complaint", value: historyOfPresentIllness },
                    { label: "Review of Other Systems", value: reviewOfOtherSystems },
                    { label: "Past Medical / Surgical History", value: pastMedicalHistory },
                    { label: "Examination Findings", value: physicalExamination },
                    { label: "Diagnosis", value: diagnosis },
                    { label: "Differential Diagnosis", value: differentialDiagnosis },
                    { label: "Assessment", value: assessment },
                    { label: "Treatment Plan", value: treatmentPlan },
                    { label: "Clinical Notes", value: notes },
                  ].filter((s) => s.value).map((s, i) => (
                    <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                      <h3 style={{ fontSize: "12px", color: "#0a2e1a", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
                        {s.label}
                      </h3>
                      <p style={{ fontSize: "13px", color: "#333", margin: 0, whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                        {s.value}
                      </p>
                    </div>
                  ))}

                  {rxDrafts.length > 0 && (
                    <div style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                      <h3 style={{ fontSize: "12px", color: "#0a2e1a", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Prescriptions
                      </h3>
                      {rxDrafts.map((rx, i) => (
                        <p key={i} style={{ fontSize: "13px", color: "#333", margin: "2px 0" }}>
                          {i + 1}. {rx.medication} — {rx.dosage} — {rx.instructions}
                        </p>
                      ))}
                    </div>
                  )}

                  {Array.from(labChecked).length > 0 && (
                    <div style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                      <h3 style={{ fontSize: "12px", color: "#0a2e1a", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Laboratory Orders
                      </h3>
                      <p style={{ fontSize: "13px", color: "#333", margin: 0 }}>
                        {Array.from(labChecked).join(", ")}
                      </p>
                    </div>
                  )}

                  <div style={{ marginTop: "40px", borderTop: "1px solid #ccc", paddingTop: "20px", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: "13px", color: "#0a2e1a", fontWeight: "bold", marginBottom: "4px" }}>By Dr:</p>
                      {doctorSignature ? (
                        <p style={{ fontSize: "20px", color: "#333", fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif", borderBottom: "1px solid #000", display: "inline-block", minWidth: "250px", padding: "4px 8px" }}>
                          {doctorSignature}
                        </p>
                      ) : (
                        <p style={{ fontSize: "14px", color: "#333", borderBottom: "1px solid #000", display: "inline-block", minWidth: "250px", padding: "4px 8px" }}>
                          _______________________
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "13px", color: "#0a2e1a", fontWeight: "bold", marginBottom: "4px" }}>Date</p>
                      <p style={{ fontSize: "13px", color: "#333" }}>
                        {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {/* Admit */}
        <button
          onClick={() => handleAction("ADMIT")}
          disabled={isBusy}
          className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isBusy && savingAction === "ADMIT"
              ? "bg-teal-100 text-teal-700"
              : "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800"
          }`}
        >
          {isBusy && savingAction === "ADMIT" ? (
            <><Loader2 size={16} className="animate-spin" /> Admitting...</>
          ) : (
            <><DoorOpen size={16} /> Admit Patient</>
          )}
        </button>

        {/* Finish Consultation → routes to Cashier for billing */}
        <button
          onClick={() => handleAction("CASHIER")}
          disabled={isBusy}
          className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isBusy && savingAction === "CASHIER"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
          }`}
        >
          {isBusy && savingAction === "CASHIER" ? (
            <><Loader2 size={16} className="animate-spin" /> Finishing...</>
          ) : (
            <><CheckCircle size={16} /> Finish Consultation</>
          )}
        </button>

        {/* Referral */}
        <button
          onClick={() => { if (!isBusy) setShowReferralPicker(true); }}
          disabled={isBusy}
          className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isBusy && savingAction === "referral"
              ? "bg-blue-100 text-blue-700"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {isBusy && savingAction === "referral" ? (
            <><Loader2 size={16} className="animate-spin" /> Referring...</>
          ) : (
            <><ArrowRight size={16} /> Referral</>
          )}
        </button>
      </div>

      {/* ── Referral Department Picker Modal ── */}
      {showReferralPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowReferralPicker(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Refer Patient To</h3>
              <button
                onClick={() => setShowReferralPicker(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {REFERRAL_DEPARTMENTS.map((dept) => (
                <button
                  key={dept.value}
                  onClick={() => handleAction("referral", dept.value)}
                  disabled={isBusy}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <dept.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{dept.label}</p>
                    <p className="text-[10px] text-slate-400">Send referral</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appointments View ─────────────────────────────────────────────────────────

function AppointmentsView({
  onBack,
}: {
  onBack: () => void;
}) {
  const [appts, setAppts] = useState<any[]>([]);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [apptFilter, setApptFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ department: "Doctor", date: apptDate });
      if (apptFilter !== "all") params.set("status", apptFilter.toUpperCase());
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppts(data.appointments ?? []);
    } catch {
      setAppts([]);
    } finally {
      setLoading(false);
    }
  }, [apptDate, apptFilter]);

  useEffect(() => {
    fetchAppts();
    const i = setInterval(fetchAppts, 15_000);
    return () => clearInterval(i);
  }, [fetchAppts]);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <input
          type="date"
          value={apptDate}
          onChange={(e) => setApptDate(e.target.value)}
          className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0a2e1a]"
        />
        <select
          value={apptFilter}
          onChange={(e) => setApptFilter(e.target.value)}
          className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0a2e1a]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{appts.length} appointment(s)</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            {new Date(apptDate + "T12:00:00").toLocaleDateString("en-UG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading appointments...
          </div>
        ) : appts.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No appointments for this date</p>
            <p className="text-xs text-slate-300 mt-1">Appointments can be scheduled from Reception</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {appts.map((a: any) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    a.status === "CANCELLED"
                      ? "bg-red-100 text-red-500"
                      : a.status === "COMPLETED"
                      ? "bg-green-100 text-green-600"
                      : a.status === "CONFIRMED"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {a.Patient?.firstName?.[0]}{a.Patient?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      {a.Patient?.lastName}, {a.Patient?.firstName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        a.status === "CANCELLED"
                          ? "bg-red-50 text-red-600"
                          : a.status === "COMPLETED"
                          ? "bg-green-50 text-green-600"
                          : a.status === "CONFIRMED"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {a.Patient?.patientNumber} ·{" "}
                    {new Date(a.appointmentDate).toLocaleTimeString("en-UG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.Patient?.phoneNumber && ` · ${a.Patient.phoneNumber}`}
                  </div>
                  {a.reason && <div className="text-xs text-slate-500 mt-1">{a.reason}</div>}
                  {a.notes && <div className="text-[11px] text-slate-400 mt-0.5 italic">{a.notes}</div>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {a.status === "PENDING" && (
                    <button
                      onClick={async () => {
                        await fetch("/api/appointments", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: a.id, status: "CONFIRMED" }),
                        });
                        setAppts((prev: any[]) =>
                          prev.map((x) => (x.id === a.id ? { ...x, status: "CONFIRMED" } : x))
                        );
                      }}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                    >
                      Confirm
                    </button>
                  )}
                  {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
                        setAppts((prev: any[]) =>
                          prev.map((x) => (x.id === a.id ? { ...x, status: "CANCELLED" } : x))
                        );
                      }}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                    >
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
  );
}

// ─── Admitted Patients View ───────────────────────────────────────────────────

interface AdmittedPatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  phoneNumber: string | null;
  isEmergency: boolean;
  currentStatus: string;
  admittedAt: string;
  lengthOfStay: string;
  diagnosis: string;
  assessment: string;
  treatmentPlan: string;
  chiefComplaint: string;
}

function AdmittedPatientsView({ onBack }: { onBack: () => void }) {
  const [patients, setPatients] = useState<AdmittedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAdmitted = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/admitted");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPatients(data.patients ?? []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmitted();
    const i = setInterval(fetchAdmitted, 15_000);
    return () => clearInterval(i);
  }, [fetchAdmitted]);

  const filtered = search
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.patientNumber.toLowerCase().includes(q)
        );
      })
    : patients;

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search admitted patients..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0a2e1a]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} admitted patient{filtered.length !== 1 ? "s" : ""}</span>
        <button
          onClick={fetchAdmitted}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <Loader2 size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={24} className="animate-spin mx-auto text-[#0a2e1a] mb-3" />
          <p className="text-sm font-medium text-slate-400">Loading admitted patients...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Hospital size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-base font-semibold text-slate-400">No admitted patients</p>
          <p className="text-sm text-slate-300 mt-1">Admitted patients will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Chief Complaint</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Length of Stay</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Treatment Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"
                        }`}>
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>
                          <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} · {p.age} yrs</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-[#0a2e1a]/60">{p.patientNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-sm text-slate-700 line-clamp-2">{p.diagnosis || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-sm text-slate-600 line-clamp-2">{p.chiefComplaint || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                        {p.lengthOfStay}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-sm text-slate-600 line-clamp-2">{p.treatmentPlan || "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Doctor Records View ─────────────────────────────────────────────────────

interface DoctorRecordPatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  phoneNumber: string | null;
  isEmergency: boolean;
  currentStatus: string;
  lastVisitDate: string;
  diagnosis: string;
  visitCount: number;
}

function DoctorRecordsView({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<DoctorRecordPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/records");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data.patients ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-700">Doctor Records</h2>
        <span className="text-xs text-slate-400">{records.length} patient{records.length !== 1 ? "s" : ""} seen</span>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={24} className="animate-spin mx-auto text-[#0a2e1a] mb-3" />
          <p className="text-sm font-medium text-slate-400">Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-base font-semibold text-slate-400">No records yet</p>
          <p className="text-sm text-slate-300 mt-1">Patient records will appear after consultations</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Visit</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Visits</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((p) => {
                  const statusLabel: Record<string, string> = {
                    ADMITTED: "Admitted",
                    DISCHARGED: "Discharged",
                    AWAITING_PHARMACY: "At Pharmacy",
                    AWAITING_LAB: "At Lab",
                    AWAITING_RADIOLOGY: "At Radiology",
                    AWAITING_CASHIER: "At Cashier",
                    AWAITING_DOCTOR: "Awaiting Doctor",
                    IN_CONSULTATION: "In Consultation",
                  };
                  const statusColor: Record<string, string> = {
                    ADMITTED: "bg-teal-100 text-teal-700",
                    DISCHARGED: "bg-slate-100 text-slate-600",
                    AWAITING_PHARMACY: "bg-blue-100 text-blue-600",
                    AWAITING_LAB: "bg-amber-100 text-amber-600",
                    AWAITING_RADIOLOGY: "bg-cyan-100 text-cyan-600",
                  };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#0a2e1a]/10 text-[#0a2e1a]">
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>
                            <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} · {p.age} yrs</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#0a2e1a]/60">{p.patientNumber}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-sm text-slate-700 line-clamp-2">{p.diagnosis || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {new Date(p.lastVisitDate).toLocaleDateString("en-UG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {p.visitCount}x
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                          statusColor[p.currentStatus] || "bg-slate-100 text-slate-500"
                        }`}>
                          {statusLabel[p.currentStatus] || p.currentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-UG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DoctorsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activePatient, setActivePatient] = useState<DashboardPatient | null>(null);
  const [activeSection, setActiveSection] = useState<"queue" | "admitted" | "records" | "appointments" | "updates">("queue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/doctor/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || "Could not reach server");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Poll every 15 seconds
  useEffect(() => {
    pollingRef.current = setInterval(fetchDashboard, 15_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchDashboard]);

  const metrics = dashboard?.metrics;
  const patients = dashboard?.patients || [];
  const clinicalUpdates = dashboard?.clinicalUpdates || [];

  // ── Determine filtered patients for sidebar count ──
  const waitingCount = metrics?.awaitingDoctor ?? 0;

  const handleSelectPatient = (patient: DashboardPatient) => {
    setActivePatient(patient);
  };

  const handleBackToQueue = () => {
    setActivePatient(null);
    fetchDashboard(); // refresh on return
  };

  const handleCompleteConsultation = () => {
    setActivePatient(null);
    fetchDashboard(); // refresh on return
  };

  const handleViewPatientFromUpdate = (patientId: number) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setActivePatient(patient);
    } else {
      // Patient may not be in queue anymore (e.g. discharged) — still load dashboard
      fetchDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        doctorName="Doctor"
        queueCount={waitingCount}
        admittedCount={metrics?.admittedPatients ?? 0}
        activeSection={activeSection}
        onQueue={() => {
          setActivePatient(null);
          setActiveSection("queue");
        }}
        onAdmitted={() => {
          setActivePatient(null);
          setActiveSection("admitted");
        }}
        onRecords={() => {
          setActivePatient(null);
          setActiveSection("records");
        }}
        onAppointments={() => {
          setActivePatient(null);
          setActiveSection("appointments");
        }}
        onClinicalUpdates={() => {
          setActivePatient(null);
          setActiveSection("updates");
        }}
        onLogout={() => {}}
      />

      <main className="ml-56 flex-1 p-6">
        {activePatient ? (
          <ConsultationPanel
            patient={activePatient}
            onBack={handleBackToQueue}
            onComplete={handleCompleteConsultation}
          />
        ) : activeSection === "records" ? (
          <DoctorRecordsView onBack={() => setActiveSection("queue")} />
        ) : activeSection === "appointments" ? (
          <AppointmentsView onBack={() => setActiveSection("queue")} />
        ) : activeSection === "admitted" ? (
          <AdmittedPatientsView onBack={() => setActiveSection("queue")} />
        ) : (
          <div className="flex gap-6">
            {/* ── Left Column: Metrics + Queue ── */}
            <div className="flex-1 min-w-0">
              {/* Metrics Bar */}
              {metrics && <MetricsBar metrics={metrics} />}

	              {/* Queue count */}
	              <div className="flex items-center justify-between mb-5">
	                <h2 className="text-lg font-bold text-slate-700">Patient Queue</h2>
	                <span className="text-xs text-slate-400">
	                  {patients.length} patient{patients.length !== 1 ? "s" : ""} waiting
	                </span>
	              </div>

              {/* Loading */}
              {loading && (
                <div className="text-center py-20">
                  <Loader2 size={24} className="animate-spin mx-auto text-[#0a2e1a] mb-3" />
                  <p className="text-sm font-medium text-slate-400">Loading patient queue...</p>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-sm text-red-700 flex-1">{error}</span>
                  <button
                    onClick={fetchDashboard}
                    className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && patients.length === 0 && (
                <div className="text-center py-20">
                  <Users size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-base font-semibold text-slate-400">No patients in queue</p>
                  <p className="text-sm text-slate-300 mt-1">
                    Patients will appear here after triage or when referred from other departments
                  </p>
                </div>
              )}

              {/* Patient Queue */}
              {!loading && patients.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {patients.map((p) => (
                    <PatientCard
                      key={p.id}
                      patient={p}
                      onSelect={handleSelectPatient}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Right Column: Clinical Updates ── */}
            <div className="w-80 flex-shrink-0 hidden xl:block">
              <div className="sticky top-6">
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Bell size={13} />
                      Clinical Updates
                      {clinicalUpdates.length > 0 && (
                        <span className="ml-auto bg-[#0a2e1a] text-white text-[9px] px-2 py-0.5 rounded-full">
                          {clinicalUpdates.length}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <ClinicalUpdatesPanel
                      updates={clinicalUpdates}
                      onViewPatient={handleViewPatientFromUpdate}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
