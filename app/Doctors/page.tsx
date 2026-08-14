"use client";



import Image from "next/image";


import { useState, useEffect, useCallback, useRef, useMemo } from "react";


import { useRouter } from "next/navigation";


import NotificationInbox from "../components/NotificationInbox";


import StaffMessaging from "../components/StaffMessaging";

import LabResultDetail from "../components/LabResultDetail";


import ImagingResultDetail from "../components/ImagingResultDetail";
import { LabOrderModal } from "../components/LabOrderModal";
import DischargeSummaryForm from "../components/DischargeSummaryForm";
import { LAB_TEST_CATALOG, DOCTOR_LAB_TESTS, DOCTOR_SONOGRAPHY_TESTS, DOCTOR_RADIOLOGY_TESTS, type LabTestCatalogItem } from "../lib/labTestCatalog";



import {
			  Users, Pill, ArrowLeft, ArrowRight, Baby, CheckCircle,

			  LogOut, AlertTriangle, Stethoscope, DoorOpen, Hospital,

			  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Calendar, ClipboardList, Printer,

					  Clock, Activity, AlertCircle, FileText, Bell, Search, User, Pencil, Syringe, RefreshCw, Menu, Send, Receipt, Share2, Paperclip, MessageSquareText, ChevronDown, FlaskConical, Save, UserPlus,

		} from "lucide-react";



// ─── Types ─────────────────────────────────────────────────────────────────



type RxDraft = { medication: string; dosage: string; instructions: string; route: string; frequency: string; givenAt: string; nextDose: string };



interface DashboardPatient {

  id: number;
  encounterId: number;

  patientNumber: string;

  firstName: string;

  lastName: string;

  gender: "MALE" | "FEMALE" | "OTHER";

  age: number;

  phoneNumber: string | null;

  isEmergency: boolean;

  currentStatus: string;
  lastSharedFromDept: string | null;

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
  appointmentTime: string | null;
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

// ─── Constants ────────────────────────────────────────────────────────────

const ESI_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-400 text-slate-900",
  4: "bg-green-400 text-slate-900",
  5: "bg-blue-400 text-white",
};

/** Generate signature blocks for admitting / reviewing / attending doctors */
const buildSignatureHtml = (
    priorDoctors: { doctorName: string; createdAt: string }[],
    currentDoctorName: string,
    sigName: string,
    today: string,
  ): string => {
    const all = priorDoctors.map((d) => ({ doctorName: d.doctorName || currentDoctorName, createdAt: d.createdAt }));
    if (!all.some((d) => d.doctorName === currentDoctorName)) {
      all.push({ doctorName: currentDoctorName, createdAt: new Date().toISOString() });
    }
    const seen = new Map<string, string>();
    for (const d of all) {
      if (!seen.has(d.doctorName) || d.createdAt < seen.get(d.doctorName)!) {
        seen.set(d.doctorName, d.createdAt);
      }
    }
    const unique = Array.from(seen.entries())
      .map(([doctorName, createdAt]) => ({ doctorName, createdAt }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

    if (unique.length === 0) {
      return `<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;justify-content:space-between">
        <div>
          <p style="font-size:13px;color:#0a2e1a;font-weight:bold;margin-bottom:4px">Attending Doctor</p>
          <p class="sig-line">${sigName || "&nbsp;"}</p>
          <p style="font-size:11px;color:#666;margin-top:2px">Dr. ${currentDoctorName}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:13px;color:#0a2e1a;font-weight:bold;margin-bottom:4px">Date</p>
          <p style="font-size:13px;color:#333">${today}</p>
        </div>
      </div>`;
    }

    const blocks = unique.map((d, i) => {
      const isLast = i === unique.length - 1;
      const roleLabel = unique.length === 1
        ? "Attending Doctor"
        : i === 0
          ? "Admitting Doctor"
          : isLast
            ? "Attending Doctor"
            : "Reviewing Doctor";
      const labelFontWeight = i === 0 && unique.length > 1 ? "700" : isLast ? "700" : "600";
      return `<div style="min-width:180px;flex:1">
        <p style="font-size:12px;color:#0a2e1a;font-weight:${labelFontWeight};margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px">${roleLabel}</p>
        <p class="sig-line" style="margin:4px 0 2px 0">${isLast && sigName ? sigName : d.doctorName}</p>
        <p style="font-size:11px;color:#555;margin:1px 0">Dr. ${d.doctorName}</p>
        <p style="font-size:10px;color:#888">${d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" }) : today}</p>
      </div>`;
    }).join("");

    return `<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;flex-wrap:wrap;gap:20px">${blocks}</div>`;
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
  "Follow-up": Users,
  "Doctor Registration": UserPlus,
};

const SOURCE_COLORS: Record<string, string> = {
  "Triage": "bg-blue-100 text-blue-700",
  "Emergency": "bg-red-100 text-red-700",
  "Appointment": "bg-purple-100 text-purple-700",
  "Follow-up": "bg-emerald-100 text-emerald-700",
  "Doctor Registration": "bg-green-100 text-green-700",
};
const formatTimestamp = (ts: string) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-UG", { day: "numeric", month: "short" });
};

// ─── Sidebar ──────────────────────────────────────────────────────────────

function Sidebar({
  doctorName,
  queueCount,
  admittedCount,
  appointmentsCount,
  activeSection,
  onQueue,
  onAdmitted,
  onRecords,
  onHistory,
  onAppointments,
  onAntenatal,
  onLogout,
  onNotifClick,
  mobileOpen,
  onMobileClose,
}: {
  doctorName: string;
  queueCount: number;
  admittedCount: number;
  appointmentsCount: number;
  activeSection: string;
  onQueue: () => void;
  onAdmitted: () => void;
  onRecords: () => void;
  onHistory: () => void;
  onAppointments: () => void;
  onAntenatal: () => void;
  onLogout: () => void;
  onNotifClick?: (notification: any) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const navItems = [
    { label: "Patient Queue", count: queueCount, section: "queue" as const, icon: Users, onClick: onQueue },
    { label: "Admitted Patients", count: admittedCount, section: "admitted" as const, icon: Hospital, onClick: onAdmitted },
    { label: "Antenatal Patients", count: null, section: "antenatal" as const, icon: Baby, onClick: onAntenatal },
    { label: "Doctor Records", count: null, section: "records" as const, icon: ClipboardList, onClick: onRecords },
    { label: "History", count: null, section: "history" as const, icon: Clock, onClick: onHistory },
    { label: "Appointments", count: appointmentsCount, section: "appointments" as const, icon: Calendar, onClick: onAppointments },
  ];

  const handleNav = (fn: () => void) => {
    fn();
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10">
            <Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="text-white text-sm font-medium">Main Street</div>
            <div className="text-[#5a9e78] text-[11px]">Medical Center</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 mb-2">Clinical</p>
        {navItems.map((item) => (
          <button
            key={item.section}
            onClick={() => handleNav(item.onClick)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === item.section
                ? "bg-[#1a5233] text-white"
                : "text-[#a0c8b0] hover:bg-white/5"
            }`}
          >
            <item.icon size={15} />
            {item.label}
            {item.count != null && item.count > 0 && (
              <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}

        <div className="mt-1">
          <NotificationInbox sidebar={true} department="Doctor" onNotificationClick={onNotifClick} />
          <div className="mt-1"><StaffMessaging sidebar={true} /></div>
        </div>
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-4">
        <div className="px-2 mb-3">
          <div className="text-[#a0c8b0] text-sm font-medium">{doctorName}</div>
          <div className="text-[#3d7a55] text-xs">Doctor</div>
        </div>
        <button
          onClick={() => handleNav(onLogout)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 text-sm hover:bg-rose-900/30"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-[#0a2e1a] flex-col z-50">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`md:hidden fixed inset-y-0 w-64 bg-[#0a2e1a] flex flex-col z-50 transition-all duration-300 ease-in-out ${
        mobileOpen ? "left-0" : "-left-64"
      }`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10">
              <Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="text-white text-sm font-medium">Main Street</div>
              <div className="text-[#5a9e78] text-[11px]">Medical Center</div>
            </div>
          </div>
          <button onClick={onMobileClose} className="text-white/60 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 mb-2">Clinical</p>
          {navItems.map((item) => (
            <button
              key={item.section}
              onClick={() => handleNav(item.onClick)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === item.section
                  ? "bg-[#1a5233] text-white"
                  : "text-[#a0c8b0] hover:bg-white/5"
              }`}
            >
              <item.icon size={15} />
              {item.label}
              {item.count != null && item.count > 0 && (
                <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}

          <div className="mt-1">
            <NotificationInbox sidebar={true} department="Doctor" onNotificationClick={onNotifClick} />
            <div className="mt-1"><StaffMessaging sidebar={true} /></div>
          </div>
        </nav>

        <div className="px-3 pb-5 border-t border-white/10 pt-4">
          <div className="px-2 mb-3">
            <div className="text-[#a0c8b0] text-sm font-medium">{doctorName}</div>
            <div className="text-[#3d7a55] text-xs">Doctor</div>
          </div>
          <button
            onClick={() => handleNav(onLogout)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 text-sm hover:bg-rose-900/30"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Metrics Bar ──────────────────────────────────────────────────────────

type FilterKey = "AWAITING_DOCTOR" | "IN_CONSULTATION" | "pendingLabs" | "pendingImaging" | "appointments" | null;

function MetricsBar({ metrics, onCardClick }: { metrics: DashboardMetrics; onCardClick?: (filter: FilterKey) => void }) {
  const cards: { label: string; value: number; icon: React.ElementType; color: string; bg: string; border: string; filter?: FilterKey }[] = [
    { label: "Waiting", value: metrics.awaitingDoctor, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", filter: "AWAITING_DOCTOR" },
    { label: "In Consultation", value: metrics.inConsultation, icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", filter: "IN_CONSULTATION" },
    { label: "Completed Today", value: metrics.completedToday, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Pending Labs", value: metrics.pendingLabs, icon: Microscope, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", filter: "pendingLabs" },
    { label: "Pending Radiology", value: metrics.pendingRadiology, icon: Radio, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200", filter: "pendingImaging" },
    { label: "Appointments", value: metrics.todayAppointments, icon: Calendar, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", filter: "appointments" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          onClick={c.filter && onCardClick ? () => onCardClick(c.filter!) : undefined}
          className={`${c.bg} ${c.border} border rounded-lg px-2 py-2 flex items-center gap-2 ${c.filter ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all' : ''}`}
        >
          <div className={`${c.color} p-1.5 rounded-md ${c.bg} flex-shrink-0`}>
            <c.icon size={15} />
          </div>
          <div className="min-w-0 leading-none">
            <div className="text-lg font-bold text-slate-800">{c.value}</div>
            <div className="text-[9px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap overflow-visible">
              {c.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────

function PatientCard({
  patient,
  onSelect,
  onStartConsultation,
  onEdit,
}: {
  patient: DashboardPatient;
  onSelect: (p: DashboardPatient) => void;
  onStartConsultation: (p: DashboardPatient) => void;
  onEdit?: (p: DashboardPatient) => void;
}) {
  const SourceIcon = SOURCE_ICONS[patient.source] || User;

  return (
    <div
      onClick={() => {
        console.log("[PatientCard] clicked patient:", patient.id, patient.firstName, patient.lastName, "onSelect type:", typeof onSelect);
        onSelect(patient);
      }}
      className={`relative bg-white rounded-xl border-2 transition-all cursor-pointer
        ${patient.isEmergency
          ? "border-red-300 hover:border-red-500 shadow-sm shadow-red-100"
          : patient.currentStatus === "IN_CONSULTATION"
          ? "border-amber-300 hover:border-amber-500"
          : "border-slate-100 hover:border-slate-300"
        } hover:shadow-md`}
    >
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
                {patient.source === "Doctor Registration" && onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(patient); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-green-700 hover:bg-green-50 transition-colors flex-shrink-0"
                    title="Edit patient details"
                  >
                    <Pencil size={12} />
                  </button>
                )}
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

        {patient.source !== "Doctor Registration" && patient.chiefComplaint && (
          <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Chief Complaint
            </p>
            <p className="text-sm text-slate-700 line-clamp-2">{patient.chiefComplaint}</p>
          </div>
        )}

        {/* Row 3: Status Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            patient.currentStatus === "IN_CONSULTATION"
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {patient.currentStatus === "IN_CONSULTATION" ? "In Consultation" : "Awaiting Doctor"}
          </span>

          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
            SOURCE_COLORS[patient.source] || "bg-slate-100 text-slate-600"
          }`}>
            <SourceIcon size={10} />
            {patient.source}
          </span>

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

        {patient.source === "Appointment" && patient.appointmentTime && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Calendar size={11} />
            <span>Scheduled at {new Date(patient.appointmentTime).toLocaleTimeString("en-UG", {
              hour: "2-digit", minute: "2-digit",
            })}</span>
          </div>
        )}

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

        {patient.currentStatus === "AWAITING_DOCTOR" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStartConsultation(patient); }}
            className="mt-3 w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <Activity size={13} /> Start Consultation
          </button>
        ) : (
          <button
            onClick={() => onSelect(patient)}
            className="mt-3 w-full bg-amber-100 text-amber-700 py-2.5 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Stethoscope size={13} /> Open Consultation
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Clinical Updates Panel ───────────────────────────────────────────────

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
                    <p className="text-[9px] text-red-400 mt-1">{formatTimestamp(u.timestamp)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
                        <span className="text-[10px] text-slate-500 font-medium">{u.patientName}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{u.message}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{formatTimestamp(u.timestamp)}</p>
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



// ─── Consultation Panel ───────────────────────────────────────────────────



function ConsultationPanel({

  patient,

  onBack,

  onComplete,

  onReferral,

  staffId,

  staffName,

  initialTab,

}: {

  patient: DashboardPatient;

  onBack: () => void;

  onComplete: () => void;

  onReferral?: (patient: DashboardPatient, referredTo: string) => void;

  staffId: number;

  staffName: string;

  initialTab?: "history" | "exam" | "diagnosis" | "rx" | "procedures" | "notes";

}) {

  const [tab, setTab] = useState<"history" | "exam" | "diagnosis" | "rx" | "procedures" | "notes">(initialTab || "diagnosis");

  const [symptoms, setSymptoms] = useState(patient.source === "Doctor Registration" ? "" : (patient.chiefComplaint || ""));

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
  const [sonographyChecked, setSonographyChecked] = useState<Set<string>>(new Set());

  const [showNewRx, setShowNewRx] = useState(false);

  const [newRx, setNewRx] = useState<RxDraft>({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" });

  const [saving, setSaving] = useState(false);

  const [savingAction, setSavingAction] = useState("");

  const [showReferralPicker, setShowReferralPicker] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);

  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);

  const [shareLabData, setShareLabData] = useState<any[] | null>(null);

  const [shareDataLoading, setShareDataLoading] = useState(false);
  const [encounterId, setEncounterId] = useState<number | null>(patient.encounterId ?? null);

  const [priorDoctors, setPriorDoctors] = useState<{ doctorName: string; createdAt: string }[]>([]);

  const [consultationStarted, setConsultationStarted] = useState(patient.currentStatus === "IN_CONSULTATION" || patient.currentStatus === "AWAITING_DOCTOR");

  const [procedureName, setProcedureName] = useState("");

  const [procedureNotes, setProcedureNotes] = useState("");

  const [procedureTreatment, setProcedureTreatment] = useState("");

  const [procedurePerformedBy, setProcedurePerformedBy] = useState("");

  const [savedProcedures, setSavedProcedures] = useState<any[]>([]);

  const [proceduresLoading, setProceduresLoading] = useState(false);

  const [savingProcedure, setSavingProcedure] = useState(false);

  const [showProcedureForm, setShowProcedureForm] = useState(false);



  const addRx = () => {

    if (!newRx.medication) return;

    setRxDrafts([...rxDrafts, { ...newRx }]);

    setNewRx({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" });

    setShowNewRx(false);

  };



  const fetchProcedures = useCallback(async () => {

    try {

      setProceduresLoading(true);

      const res = await fetch(`/api/doctor/procedures?patientId=${patient.id}`);

      if (res.ok) {

        const data = await res.json();

        setSavedProcedures(data.procedures ?? []);

      }

    } catch { /* ignore */ }

    finally { setProceduresLoading(false); }

  }, [patient.id]);



  useEffect(() => {

    if (tab === "procedures") fetchProcedures();

  }, [tab, fetchProcedures]);



  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [imagingResults, setImagingResults] = useState<any[]>([]);

  // Fetch active encounter + hydrate SOAP fields from doctor's existing ClinicalNote
  useEffect(() => {

    (async () => {

      try {

        const res = await fetch(`/api/encounters/active?patientId=${patient.id}&staffId=${staffId}`);

        if (!res.ok) return;

        const data = await res.json();

        if (!data) return;

        setEncounterId(data.encounter.id);

        if (data.myNote) {
          const n = data.myNote;
          if (n.symptoms) setSymptoms(n.symptoms);
          if (n.historyOfPresentIllness) setHistoryOfPresentIllness(n.historyOfPresentIllness);
          if (n.reviewOfOtherSystems) setReviewOfOtherSystems(n.reviewOfOtherSystems);
          if (n.pastMedicalHistory) setPastMedicalHistory(n.pastMedicalHistory);
          if (n.physicalExamination) setPhysicalExamination(n.physicalExamination);
          if (n.diagnosis) setDiagnosis(n.diagnosis);
          if (n.differentialDiagnosis) setDifferentialDiagnosis(n.differentialDiagnosis);
          if (n.assessment) setAssessment(n.assessment);
          if (n.treatmentPlan) setTreatmentPlan(n.treatmentPlan);
          if (n.notes) setNotes(n.notes);
          if (n.signature) setDoctorSignature(n.signature);
        }

      } catch { /* ignore */ }

    })();

  }, [patient.id, staffId]);

  // Always fetch recent lab/imaging results for this patient
  useEffect(() => {

    (async () => {

      try {

        const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);

        if (!res.ok) return;

        const data = await res.json();

        if (data.labRequests) setLabResults(data.labRequests.filter((lr: any) => lr.status === "COMPLETED" && lr.results));

        if (data.imagingRequests) setImagingResults(data.imagingRequests.filter((ir: any) => ir.status === "REPORTED" && (ir.findings || ir.impression || ir.conclusion)));

      } catch { /* ignore */ }

    })();

  }, [patient.id]);



  useEffect(() => {

    (async () => {

      try {

        const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);

        if (!res.ok) return;

        const data = await res.json();

        const docs: { doctorName: string; createdAt: string }[] = (data.reviews ?? []).map((r: any) => ({ doctorName: r.doctorName || "Unknown", createdAt: r.createdAt || "" }));

        const seen = new Map<string, string>();

        for (const d of docs) { if (!seen.has(d.doctorName) || d.createdAt < seen.get(d.doctorName)!) seen.set(d.doctorName, d.createdAt); }

        setPriorDoctors(Array.from(seen.entries()).map(([doctorName, createdAt]) => ({ doctorName, createdAt })).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)));

      } catch { /* ignore */ }

    })();

  }, [patient.id]);



  const handleSaveProcedure = async () => {

    if (!procedureName.trim()) { alert("Please enter the procedure name."); return; }

    if (!procedureNotes.trim()) { alert("Please enter procedure notes."); return; }

    setSavingProcedure(true);

    try {

      const res = await fetch("/api/doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "SAVE_PROCEDURE", patientId: patient.id, procedureName: procedureName.trim(), procedureNotes: procedureNotes.trim(), treatmentFollowUp: procedureTreatment.trim(), performedBy: procedurePerformedBy.trim() || staffName }) });

      if (res.ok) { setProcedureName(""); setProcedureNotes(""); setProcedureTreatment(""); setProcedurePerformedBy(""); setShowProcedureForm(false); fetchProcedures(); } else { const err = await res.json(); alert(`Error: ${err.error}`); }

    } catch { alert("Network error saving procedure."); } finally { setSavingProcedure(false); }

  };



  const handleAction = async (action: string, referralDept?: string) => {

    // For lab/sonography/radiology, keep patient IN_CONSULTATION — just send orders
    const stayInConsultation = action === "referral" && referralDept && ["LAB", "SONOGRAPHY", "RADIOLOGY"].includes(referralDept);
    const routeTo = stayInConsultation ? "SEND_ORDERS" : (action === "referral" && referralDept ? referralDept : action);

    setSaving(true); setSavingAction(action); setShowReferralPicker(false);

    try {

      const body: Record<string, any> = { patientId: patient.id, encounterId, staffId, staffName, symptoms, historyOfPresentIllness, pastMedicalHistory, reviewOfOtherSystems, physicalExamination, diagnosis, differentialDiagnosis, assessment, treatmentPlan, notes, doctorSignature, prescriptions: rxDrafts.map((r) => ({ medication: r.medication, dosage: r.dosage, instructions: r.instructions, route: r.route, frequency: r.frequency, givenAt: r.givenAt, nextDose: r.nextDose })), labRequests: Array.from(labChecked).map((t) => ({ testName: t })), routeTo };

      // For sonography/radiology referrals, include imaging orders
      if (stayInConsultation && (referralDept === "SONOGRAPHY" || referralDept === "RADIOLOGY")) {
        body.imagingOrders = Array.from(sonographyChecked);
      }

      const res = await fetch("/api/doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (res.ok) {
        if (stayInConsultation) {
          const labelMap: Record<string, string> = { LAB: "Laboratory", SONOGRAPHY: "Sonography", RADIOLOGY: "Radiology" };
          alert(`Orders sent to ${labelMap[referralDept!] || referralDept}. Patient stays in consultation.`);
          setLabChecked(new Set());
          setSonographyChecked(new Set());
        } else {
          if (action === "referral" && referralDept && onReferral) {
            onReferral(patient, referralDept);
          }
          onComplete();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }

    } catch { alert("Network error completing consultation."); } finally { setSaving(false); setSavingAction(""); }

  };



  /** Order lab tests without routing the patient away — keeps consultation open. */
  const handleQuickLabOrder = async () => {
    if (labChecked.size === 0) return;
    setSaving(true); setSavingAction("ORDER_LAB");
    try {
      const res = await fetch("/api/doctor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id, encounterId, staffId, staffName,
          symptoms, historyOfPresentIllness, pastMedicalHistory,
          reviewOfOtherSystems, physicalExamination, diagnosis,
          differentialDiagnosis, assessment, treatmentPlan, notes, doctorSignature,
          prescriptions: [],
          labRequests: Array.from(labChecked).map((t) => ({ testName: t })),
          routeTo: "SEND_ORDERS",
        }),
      });
      if (res.ok) {
        alert(`${labChecked.size} test(s) ordered. Patient remains in consultation.`);
        setLabChecked(new Set());
        // NOTE: intentionally NOT calling onComplete() — doctor stays in the consultation
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch {
      alert("Network error ordering lab tests.");
    } finally {
      setSaving(false);
      setSavingAction("");
    }
  };

  /** Order lab tests via the full LabOrderModal — independent of prescriptions. */
  const handleLabOrderFromModal = async (selectedTests: LabTestCatalogItem[]) => {
    if (selectedTests.length === 0) return;
    setSaving(true); setSavingAction("ORDER_LAB");
    try {
      const res = await fetch("/api/doctor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id, encounterId, staffId, staffName,
          symptoms, historyOfPresentIllness, pastMedicalHistory,
          reviewOfOtherSystems, physicalExamination, diagnosis,
          differentialDiagnosis, assessment, treatmentPlan, notes, doctorSignature,
          prescriptions: [],
          labRequests: selectedTests.map((t) => ({ testName: t.name, testCode: t.code })),
          routeTo: "SEND_ORDERS",
        }),
      });
      if (res.ok) {
        alert(`${selectedTests.length} test(s) ordered. Patient remains in consultation.`);
        setShowLabOrderModal(false);
        // NOTE: intentionally NOT calling onComplete() — doctor stays in the consultation
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch {
      alert("Network error ordering lab tests.");
    } finally {
      setSaving(false);
      setSavingAction("");
    }
  };

  /** Order sonography scans without routing the patient away — keeps consultation open. */
  const handleQuickSonographyOrder = async () => {
    if (sonographyChecked.size === 0) return;
    setSaving(true); setSavingAction("ORDER_SONO");
    try {
      const res = await fetch("/api/doctor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id, encounterId, staffId, staffName,
          symptoms, historyOfPresentIllness, pastMedicalHistory,
          reviewOfOtherSystems, physicalExamination, diagnosis,
          differentialDiagnosis, assessment, treatmentPlan, notes, doctorSignature,
          prescriptions: [],
          labRequests: [],
          imagingOrders: Array.from(sonographyChecked),
          routeTo: "SEND_ORDERS",
        }),
      });
      if (res.ok) {
        alert(`${sonographyChecked.size} scan(s) ordered. Patient remains in consultation.`);
        setSonographyChecked(new Set());
        // NOTE: intentionally NOT calling onComplete() — doctor stays in the consultation
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch {
      alert("Network error ordering sonography.");
    } finally {
      setSaving(false);
      setSavingAction("");
    }
  };


  const handleShareResults = async () => {

    if (selectedShareTargets.length === 0) { alert("Select at least one recipient."); return; }

    setSaving(true); setSavingAction("SHARE");

    try {

      const res = await fetch("/api/doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, encounterId, staffId, staffName, symptoms, historyOfPresentIllness, pastMedicalHistory, reviewOfOtherSystems, physicalExamination, diagnosis, differentialDiagnosis, assessment, treatmentPlan, notes, doctorSignature, prescriptions: rxDrafts.map((r) => ({ medication: r.medication, dosage: r.dosage, instructions: r.instructions, route: r.route, frequency: r.frequency, givenAt: r.givenAt, nextDose: r.nextDose })), labRequests: Array.from(labChecked).map((t) => ({ testName: t })), routeTo: "SHARE", shareTargets: selectedShareTargets }) });

      if (res.ok) { alert("Results shared successfully."); setShowShareModal(false); } else { const err = await res.json(); alert(`Error: ${err.error}`); }

    } catch { alert("Network error sharing results."); } finally { setSaving(false); setSavingAction(""); }

  };



  const handlePrintWithLabs = async () => {

    let labRowsHtml = "";

    try {

      const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);

      if (res.ok) {

        const data = await res.json();

        const labs = data.labRequests ?? [];

        if (labs.length > 0) {

          const rows = labs.filter((lr: any) => lr.results && lr.status === "COMPLETED").map((lr: any) => {

            let parsed: any[] = [];

            try { const p = JSON.parse(lr.results); if (Array.isArray(p)) parsed = p; } catch {}

            if (parsed.length === 0) return `<tr><td colspan="6" style="padding:8px;font-size:12px;color:#666;text-align:center;font-style:italic">${lr.testName} — no detailed results</td></tr>`;

            return parsed.map((r: any) => {

              let flagColor = "";

              if (r.flag === "HIGH") flagColor = "color:#dc2626;font-weight:700;";

              else if (r.flag === "LOW") flagColor = "color:#d97706;font-weight:700;";

              else if (r.flag === "NORMAL") flagColor = "color:#16a34a;";

              return `<tr style="${r.flag === "HIGH" ? "background:#fef2f2;" : r.flag === "LOW" ? "background:#fffbeb;" : ""}">

                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb">${r.test || r.parameter || ""}</td>

                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${r.result || ""}</td>

                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;text-align:center">${r.unit || ""}</td>

                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;text-align:center">${r.referenceRange || r.range || ""}</td>

                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;text-align:center;${flagColor}">${r.flag || ""}</td>

              </tr>`;

            }).join("");

          }).join("");

          if (rows) labRowsHtml = `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px">Laboratory Results</h3><table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;font-size:11px"><thead><tr style="background:#0a2e1a;color:#fff"><th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px">Parameter</th><th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Result</th><th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Unit</th><th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Reference Range</th><th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Flag</th></tr></thead><tbody>${rows}</tbody></table></div>`;

        }

      }

    } catch { /* ignore */ }

    const baseHtml = buildPrintHtml(false);

    const finalHtml = labRowsHtml ? baseHtml.replace('<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;justify-content:space-between">', `${labRowsHtml}<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;justify-content:space-between">`) : baseHtml;

    const printWin = window.open("", "_blank", "width=800,height=600");

    if (!printWin) { alert("Please allow pop-ups to print."); return; }

    printWin.document.write(finalHtml); printWin.document.close();

  };



  const handleStartConsultation = async () => {

    if (patient.currentStatus !== "IN_CONSULTATION") {

      await fetch("/api/doctor", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, encounterId }) });

    }

    setConsultationStarted(true);

  };



  const handlePrint = () => buildPrintHtml(true);



  const handleDownload = () => {

    const fullHtml = buildPrintHtml(false);

    const pw = window.open("", "_blank", "width=800,height=600,scrollbars=yes");

    if (!pw) { alert("Please allow pop-ups to download."); return; }

    pw.document.write(fullHtml); pw.document.close();

    setTimeout(() => { pw.focus(); pw.print(); }, 800);

  };



  const buildPrintHtml = (doPrint: boolean): string => {

    const rxList = rxDrafts.map((r, i) => `${i + 1}. ${r.medication} — ${r.dosage} — ${r.instructions}`).join("<br>");

    const labList = Array.from(labChecked).join(", ");

    const fields = [

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

    ].filter((f) => f.value);

    const fieldsHtml = fields.map((f) => `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">${f.label}</h3><p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap;line-height:1.5">${f.value}</p></div>`).join("");

    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html><html><head><title>Main Street Medical Center - Consultation Record</title><style>@page{margin:15mm}body{font-family:Arial,sans-serif;margin:0;padding:0}body::before{content:'';position:fixed;inset:0;background-image:url('/Images/LOGO.jpg');background-size:55%;background-repeat:no-repeat;background-position:center;opacity:0.07;pointer-events:none;z-index:-1;print-color-adjust:exact;-webkit-print-color-adjust:exact}table{width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px}td{padding:4px 8px}.sig-line{border-bottom:1px solid #000;display:inline-block;min-width:250px;padding:4px 8px;font-size:20px;font-family:'Brush Script MT','Segoe Script',cursive,sans-serif}</style></head><body style="position:relative"><div style="padding:40px;max-width:800px;margin:0 auto"><div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #0a2e1a;padding-bottom:20px"><h1 style="font-size:22px;color:#0a2e1a;margin:0;font-weight:bold">MAIN STREET MEDICAL CENTER</h1><p style="font-size:13px;color:#555;margin:4px 0 0 0">Consultation Clinical Record</p></div><table><tr><td style="font-weight:bold;color:#0a2e1a;width:150px">Patient Name:</td><td style="border-bottom:1px solid #ccc">${patient.lastName}, ${patient.firstName}</td><td style="font-weight:bold;color:#0a2e1a;width:100px">Patient ID:</td><td style="border-bottom:1px solid #ccc">${patient.patientNumber}</td></tr><tr><td style="font-weight:bold;color:#0a2e1a">Gender / Age:</td><td style="border-bottom:1px solid #ccc">${patient.gender === "MALE" ? "Male" : "Female"} / ${patient.age} yrs</td><td style="font-weight:bold;color:#0a2e1a">Date:</td><td style="border-bottom:1px solid #ccc">${today}</td></tr></table>${fieldsHtml}${rxList ? `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">Prescriptions</h3><p style="font-size:13px;color:#333;margin:0">${rxList}</p></div>` : ""}${labList ? `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">Laboratory Orders</h3><p style="font-size:13px;color:#333;margin:0">${labList}</p></div>` : ""}${buildSignatureHtml(priorDoctors, staffName, doctorSignature, today)}</div>${doPrint ? '<script>window.onload = function() { window.print(); window.close(); };<\/script>' : ''}</body></html>`;

    if (doPrint) { const printWin = window.open("", "_blank", "width=800,height=600"); if (!printWin) { alert("Please allow pop-ups to print."); return html; } printWin.document.write(html); printWin.document.close(); }

    return html;

  };



  const isBusy = saving;



  const REFERRAL_DEPARTMENTS = [

    { value: "LAB", label: "Laboratory", icon: Microscope },

    { value: "SONOGRAPHY", label: "Sonography", icon: Waves },

    { value: "RADIOLOGY", label: "Radiology", icon: Radio },

    { value: "DENTIST", label: "Dentist", icon: Stethoscope },

    { value: "PHARMACY", label: "Pharmacy", icon: Pill },

    { value: "NURSE", label: "Nurse / Midwife", icon: Activity },

    { value: "TREATMENT", label: "Treatment Room", icon: Syringe },

    { value: "CASHIER", label: "Cashier", icon: CreditCard },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-800 text-white text-xs font-bold hover:bg-green-700 transition-colors">
          <ArrowLeft size={14} /> Back to Queue
        </button>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold ${patient.isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
            {patient.patientNumber}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold flex-shrink-0 ${patient.isEmergency ? "bg-red-100 text-red-700" : "bg-[#0a2e1a]/10 text-[#0a2e1a]"}`}>
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{patient.lastName}, {patient.firstName}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 mt-1">
                <span className="font-mono text-[11px] text-[#0a2e1a]/60">{patient.patientNumber}</span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span>{patient.gender === "MALE" ? "Male" : "Female"}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.age} years</span>
                {patient.phoneNumber && <><span className="text-slate-300">|</span><span className="truncate">{patient.phoneNumber}</span></>}
              </div>
            </div>
          </div>
          {patient.esiLevel && (
            <div className="text-right flex-shrink-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mx-auto ${ESI_COLORS[patient.esiLevel] || "bg-slate-200 text-slate-600"}`}>
                {patient.esiLevel}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1">{ESI_LABELS[patient.esiLevel] || "ESI Level"}</div>
            </div>
          )}
        </div>
        {patient.source !== "Doctor Registration" && patient.chiefComplaint && (
          <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint</p>
            <p className="text-sm text-slate-700">{patient.chiefComplaint}</p>
          </div>
        )}
      </div>

      {!consultationStarted ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Stethoscope size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to begin consultation</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Review the patient details above, then click below to start the consultation.</p>
          <button onClick={handleStartConsultation} className="bg-[#0a2e1a] text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-[#0d3d24] transition-colors flex items-center gap-2 mx-auto">
            <Activity size={16} /> Start Consultation
          </button>
        </div>
      ) : (
      <>
      {(() => {
        const from = patient.lastSharedFromDept;
        if (!from) return null;
        return (
          <div className="mb-3 text-xs text-slate-400 italic">
            Returned from {from} · {patient.waitingDisplay}
          </div>
        );
      })()}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {(["history","exam","diagnosis","rx","procedures","notes"] as const).map((key) => {
            const labels: Record<string, string> = { history: "History", exam: "Examination", diagnosis: "Diagnosis & Plan", rx: "Prescriptions & Plan", procedures: "Procedures", notes: "Notes & Orders" };
            const icons: Record<string, React.ElementType> = { history: FileText, exam: Stethoscope, diagnosis: AlertCircle, rx: Pill, procedures: Syringe, notes: ClipboardList };
            const Icon = icons[key];
            return (
              <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${tab === key ? "border-b-2 border-[#0a2e1a] text-[#0a2e1a] bg-[#0a2e1a]/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={15} /> {labels[key]}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {tab === "history" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Presenting Complaint</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]" placeholder="Patient's primary complaint..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">History of Presenting Complaint</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]" placeholder="Onset, duration, character..." value={historyOfPresentIllness} onChange={(e) => setHistoryOfPresentIllness(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Review of Other Systems</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]" placeholder="Constitutional, respiratory, CV, GI..." value={reviewOfOtherSystems} onChange={(e) => setReviewOfOtherSystems(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Past Medical / Surgical History</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]" placeholder="Chronic illnesses, surgeries..." value={pastMedicalHistory} onChange={(e) => setPastMedicalHistory(e.target.value)} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">By Dr:</label>
                    <input type="text" placeholder="Type your full name to sign..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a]" value={doctorSignature} onChange={(e) => setDoctorSignature(e.target.value)} />
                    {doctorSignature && <div className="mt-2 px-3 py-2 bg-white rounded-lg border border-slate-100"><p className="text-lg italic text-slate-700" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>{doctorSignature}</p></div>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date</label>
                    <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] bg-white" value={new Date().toISOString().split("T")[0]} readOnly />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button onClick={handlePrint} className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"><Printer size={16} /> PRINT</button>
                <button onClick={handleDownload} className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a2e1a] text-white hover:bg-[#0d3d24] transition-colors flex items-center justify-center gap-2"><FileText size={16} /> DOWNLOAD</button>
              </div>
            </div>
          )}

          {tab === "exam" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Physical Examination Findings</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[200px]" placeholder="Document your physical examination findings systematically..." value={physicalExamination} onChange={(e) => setPhysicalExamination(e.target.value)} />
              </div>
            </div>
          )}

          {tab === "diagnosis" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Diagnosis</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]" placeholder="Primary diagnosis..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Differential Diagnosis</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]" placeholder="Other possible diagnoses..." value={differentialDiagnosis} onChange={(e) => setDifferentialDiagnosis(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Assessment</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]" placeholder="Clinical assessment..." value={assessment} onChange={(e) => setAssessment(e.target.value)} />
              </div>
            </div>
          )}

          {tab === "rx" && (
            <div className="space-y-4">
              {/* Treatment Plan at the top */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Treatment Plan</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]" placeholder="Plan of care..." value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} />
              </div>

              {/* Prescription drafts */}
              {rxDrafts.length > 0 && (
                <div className="space-y-2">
                  {rxDrafts.map((rx, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{rx.medication}</p>
                        <p className="text-xs text-slate-500">{rx.dosage}{rx.route ? ` — ${rx.route}` : ""}{rx.frequency ? ` — ${rx.frequency}` : ""}</p>
                        <p className="text-xs text-slate-400">{rx.instructions || ""}{rx.givenAt ? ` | Given: ${rx.givenAt}` : ""}{rx.nextDose ? ` | Next: ${rx.nextDose}` : ""}</p>
                      </div>
                      <button onClick={() => setRxDrafts(rxDrafts.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 p-1"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Prescription form with new fields */}
              {showNewRx ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <input type="text" placeholder="Medication name" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.medication} onChange={(e) => setNewRx({ ...newRx, medication: e.target.value })} />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Dosage (e.g. 500mg)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.dosage} onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })} />
                    <input type="text" placeholder="Route (e.g. PO, IV, IM)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.route} onChange={(e) => setNewRx({ ...newRx, route: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Frequency (e.g. TID, BD)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.frequency} onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })} />
                    <input type="text" placeholder="Instructions" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.instructions} onChange={(e) => setNewRx({ ...newRx, instructions: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Given at (e.g. 8:00 AM)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.givenAt} onChange={(e) => setNewRx({ ...newRx, givenAt: e.target.value })} />
                    <input type="text" placeholder="Next dose (e.g. 2025-03-21 14:00)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.nextDose} onChange={(e) => setNewRx({ ...newRx, nextDose: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addRx} className="bg-[#0a2e1a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0d3d24] transition-colors">Add Prescription</button>
                    <button onClick={() => { setShowNewRx(false); setNewRx({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" }); }} className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewRx(true)} className="flex items-center gap-2 text-[#0a2e1a] text-sm font-medium hover:text-[#0d3d24]"><Plus size={15} /> Add Prescription</button>
              )}
            </div>
          )}

          {tab === "procedures" && (
            <div className="space-y-4">
              {showProcedureForm ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <input type="text" placeholder="e.g. Wound Dressing, Lumbar Puncture" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={procedureName} onChange={(e) => setProcedureName(e.target.value)} />
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Procedure Notes <span className="text-red-500">*</span></label>
                    <textarea placeholder="Detailed description of the procedure..." className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[150px]" value={procedureNotes} onChange={(e) => setProcedureNotes(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Treatment / Follow-Up</label>
                    <textarea placeholder="Post-procedure treatment, wound care..." className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px]" value={procedureTreatment} onChange={(e) => setProcedureTreatment(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Performed By</label>
                    <input type="text" placeholder="Doctor's name" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={procedurePerformedBy} onChange={(e) => setProcedurePerformedBy(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveProcedure} disabled={savingProcedure} className="bg-[#0a2e1a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d3d24] transition-colors flex items-center gap-2 disabled:opacity-50">
                      {savingProcedure ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <>Save Procedure</>}
                    </button>
                    <button onClick={() => { setShowProcedureForm(false); setProcedureName(""); setProcedureNotes(""); setProcedureTreatment(""); setProcedurePerformedBy(""); }} className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowProcedureForm(true)} className="flex items-center gap-2 text-[#0a2e1a] text-sm font-medium hover:text-[#0d3d24]"><Plus size={15} /> Add New Procedure</button>
              )}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Procedure History</h4>
                {proceduresLoading ? (
                  <div className="text-center py-8 text-sm text-slate-400"><Loader2 size={14} className="animate-spin inline mr-1" /> Loading procedures...</div>
                ) : savedProcedures.length === 0 ? (
                  <div className="text-center py-8"><Syringe size={24} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No procedures recorded for this patient</p></div>
                ) : (
                  <div className="space-y-2">{savedProcedures.map((proc: any, i: number) => (
                    <div key={proc.id || i} className="bg-white border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h5 className="text-sm font-semibold text-slate-700">{proc.procedureName}</h5>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(proc.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      {proc.procedureNotes && <p className="text-xs text-slate-600 line-clamp-3 mb-1">{proc.procedureNotes}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        {proc.performedBy && <span>By: <strong className="text-slate-500">{proc.performedBy}</strong></span>}
                        {proc.treatmentFollowUp && <span className="truncate">Rx: {proc.treatmentFollowUp}</span>}
                      </div>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-5">
              <div className="bg-[#faf9f5] rounded-xl p-4 border border-[#e8e3d5] space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-[#e8e3d5]">
                  <FileText size={14} className="text-green-700" />
                  <span className="text-xs font-bold text-green-800 uppercase tracking-wider">History of Presenting Complaint</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Presenting Complaint</label>
                  <textarea className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[60px]" placeholder="Patient's primary complaint..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">History of Presenting Complaint</label>
                  <textarea className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]" placeholder="Onset, duration, character..." value={historyOfPresentIllness} onChange={(e) => setHistoryOfPresentIllness(e.target.value)} />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Clinical Notes</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[120px]" placeholder="Additional clinical notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Microscope size={13} /> Laboratory Orders
                  {labChecked.size > 0 && <span className="text-[10px] bg-[#0a2e1a] text-white px-2 py-0.5 rounded-full">{labChecked.size}</span>}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCTOR_LAB_TESTS.map((t) => (
                    <label key={t} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${labChecked.has(t) ? "border-[#0a2e1a] bg-[#0a2e1a]/5" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                      <input type="checkbox" className="accent-[#0a2e1a]" checked={labChecked.has(t)} onChange={(e) => { const n = new Set(labChecked); e.target.checked ? n.add(t) : n.delete(t); setLabChecked(n); }} />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <button onClick={handleQuickLabOrder} disabled={isBusy || labChecked.size === 0} className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${isBusy && savingAction === "ORDER_LAB" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                    {isBusy && savingAction === "ORDER_LAB" ? <><Loader2 size={13} className="animate-spin" /> Ordering...</> : <><Send size={13} /> Order Lab Tests</>}
                  </button>
                </div>
              <div className="mt-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Waves size={13} /> Sonography Orders
                  {sonographyChecked.size > 0 && <span className="text-[10px] bg-teal-700 text-white px-2 py-0.5 rounded-full">{sonographyChecked.size}</span>}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCTOR_SONOGRAPHY_TESTS.map((t) => (
                    <label key={t} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${sonographyChecked.has(t) ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                      <input type="checkbox" className="accent-teal-600" checked={sonographyChecked.has(t)} onChange={(e) => { const n = new Set(sonographyChecked); e.target.checked ? n.add(t) : n.delete(t); setSonographyChecked(n); }} />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <button onClick={handleQuickSonographyOrder} disabled={isBusy || sonographyChecked.size === 0} className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${isBusy && savingAction === "ORDER_SONO" ? "bg-teal-100 text-teal-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
                    {isBusy && savingAction === "ORDER_SONO" ? <><Loader2 size={13} className="animate-spin" /> Ordering...</> : <><Waves size={13} /> Order Sonography</>}
                  </button>
                </div>
              </div>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">By Dr:</label>
                    <input type="text" placeholder="Type your full name to sign..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a]" value={doctorSignature} onChange={(e) => setDoctorSignature(e.target.value)} />
                    {doctorSignature && <div className="mt-2 px-3 py-2 bg-white rounded-lg border border-slate-100"><p className="text-lg italic text-slate-700" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>{doctorSignature}</p></div>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date</label>
                    <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] bg-white" value={new Date().toISOString().split("T")[0]} readOnly />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handlePrint} className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"><Printer size={16} /> PRINT</button>
                <button onClick={handleDownload} className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a2e1a] text-white hover:bg-[#0d3d24] transition-colors flex items-center justify-center gap-2"><FileText size={16} /> DOWNLOAD</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button onClick={() => handleAction("ADMIT")} disabled={isBusy} className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isBusy && savingAction === "ADMIT" ? "bg-teal-100 text-teal-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
          {isBusy && savingAction === "ADMIT" ? <><Loader2 size={16} className="animate-spin" /> Admitting...</> : <><DoorOpen size={16} /> Admit Patient</>}
        </button>
        <button onClick={() => handleAction("CASHIER")} disabled={isBusy} className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isBusy && savingAction === "CASHIER" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
          {isBusy && savingAction === "CASHIER" ? <><Loader2 size={16} className="animate-spin" /> Finishing...</> : <><CheckCircle size={16} /> Finish Consultation</>}
        </button>
        <button onClick={() => { if (!isBusy) setShowLabOrderModal(true); }} disabled={isBusy} className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isBusy && savingAction === "ORDER_LAB" ? "bg-purple-100 text-purple-700" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
          {isBusy && savingAction === "ORDER_LAB" ? <><Loader2 size={16} className="animate-spin" /> Ordering...</> : <><Microscope size={16} /> Lab Tests</>}
        </button>
        <button onClick={() => { if (!isBusy) setShowReferralPicker(true); }} disabled={isBusy} className={`py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isBusy && savingAction === "referral" ? "bg-blue-100 text-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {isBusy && savingAction === "referral" ? <><Loader2 size={16} className="animate-spin" /> Referring...</> : <><ArrowRight size={16} /> Referral</>}
        </button>
        <button onClick={() => { if (!isBusy) { setShowShareModal(true); setSelectedShareTargets([]); }}} disabled={isBusy} className="py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-purple-600 text-white hover:bg-purple-700">
          <Share2 size={16} /> Share &amp; Print
        </button>
      </div>

      {showReferralPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowReferralPicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Refer Patient To</h3>
              <button onClick={() => setShowReferralPicker(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REFERRAL_DEPARTMENTS.map((dept) => (
                <button
                  key={dept.value}
                  onClick={() => {
                    if (dept.value === "LAB") {
                      setShowReferralPicker(false);
                      setShowLabOrderModal(true);
                    } else {
                      handleAction("referral", dept.value);
                    }
                  }}
                  disabled={isBusy}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><dept.icon size={18} /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{dept.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {dept.value === "LAB" ? "Select lab tests" : "Send referral"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-700">Share Results — {patient.lastName}, {patient.firstName}</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Summary</h4>
                <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                  {diagnosis && <div className="px-4 py-3"><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Diagnosis</span><p className="text-sm text-slate-700 mt-0.5">{diagnosis}</p></div>}
                  {treatmentPlan && <div className="px-4 py-3"><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Treatment Plan</span><p className="text-sm text-slate-700 mt-0.5">{treatmentPlan}</p></div>}
                  {Array.from(labChecked).length > 0 && (
                    <div className="px-4 py-3">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lab Tests Ordered</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Array.from(labChecked).map((t) => <span key={t} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{t}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Send To</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([{ value: "RECEPTION", label: "Receptionist", icon: Receipt }, { value: "NURSE", label: "Nurse / Midwife", icon: Activity }, { value: "SONOGRAPHY", label: "Sonographer", icon: Waves }] as const).map((target) => {
                    const isSelected = selectedShareTargets.includes(target.value);
                    return (
                      <button key={target.value} onClick={() => { setSelectedShareTargets((prev) => prev.includes(target.value) ? prev.filter((v) => v !== target.value) : [...prev, target.value]); }} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left min-h-[60px] ${isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"}`}>
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"}`}><target.icon size={18} /></div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">{target.label}</p></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={handlePrintWithLabs} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"><Printer size={15} /> Print Full Record</button>
              <div className="flex-1" />
              <button onClick={() => setShowShareModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleShareResults} disabled={isBusy || selectedShareTargets.length === 0} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isBusy && savingAction === "SHARE" ? "bg-purple-100 text-purple-700" : "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"}`}>
                {isBusy && savingAction === "SHARE" ? <><Loader2 size={16} className="animate-spin" /> Sharing...</> : <><Share2 size={15} /> Share Results</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLabOrderModal && (
        <LabOrderModal
          patientName={`${patient.lastName}, ${patient.firstName}`}
          onClose={() => setShowLabOrderModal(false)}
          onConfirm={handleLabOrderFromModal}
        />
      )}
      </>
      )}
    </div>
  );
}

// ─── Appointments View ────────────────────────────────────────────────────

function AppointmentsView({ onBack, onSelectPatient }: { onBack: () => void; onSelectPatient?: (patient: DashboardPatient) => void }) {
  const [appts, setAppts] = useState<any[]>([]);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [apptFilter, setApptFilter] = useState("all");
  const [loading, setLoading] = useState(true); // start true: never flash "No appointments" before the first fetch resolves
  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try { const params = new URLSearchParams({ department: "Doctor", date: apptDate }); if (apptFilter !== "all") params.set("status", apptFilter.toUpperCase()); const res = await fetch(`/api/appointments?${params}`); const data = await res.json(); setAppts(data.appointments ?? []); } catch { setAppts([]); } finally { setLoading(false); }
  }, [apptDate, apptFilter]);
  useEffect(() => { fetchAppts(); const i = setInterval(fetchAppts, 15_000); return () => clearInterval(i); }, [fetchAppts]);
  return (
    <div>
      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"><ArrowLeft size={15} /> Back to Dashboard</button>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0a2e1a]" />
        <select value={apptFilter} onChange={(e) => setApptFilter(e.target.value)} className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0a2e1a]">
          <option value="all">All</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{appts.length} appointment(s)</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50"><span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{new Date(apptDate + "T12:00:00").toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
        {loading ? <div className="py-16 flex items-center justify-center text-slate-400 text-sm"><Loader2 size={16} className="animate-spin mr-2" /> Loading...</div>
        : appts.length === 0 ? <div className="py-16 text-center"><Calendar size={36} className="mx-auto text-slate-200 mb-3" /><p className="text-sm font-medium text-slate-400">No appointments</p></div>
        : <ul className="divide-y divide-slate-50">{appts.map((a: any) => (
            <li key={a.id} onClick={async () => { if (!onSelectPatient || !a.Patient) return; let encId = 0; try { const er = await fetch(`/api/encounters/active?patientId=${a.Patient.id}`); if (er.ok) { const ed = await er.json(); if (ed) encId = ed.encounter.id; } } catch {} onSelectPatient({ id: a.Patient.id, encounterId: encId, patientNumber: a.Patient.patientNumber ?? "", firstName: a.Patient.firstName ?? "", lastName: a.Patient.lastName ?? "", gender: a.Patient.gender ?? "OTHER", age: a.Patient.age ?? 0, phoneNumber: a.Patient.phoneNumber ?? null, isEmergency: false, currentStatus: "AWAITING_DOCTOR", lastSharedFromDept: null, updatedAt: new Date().toISOString(), waitingMinutes: 0, waitingDisplay: "Appointment", chiefComplaint: a.reason || "", esiLevel: null, triageCompletedAt: null, source: "Appointment", pendingLabs: 0, pendingImaging: 0, hasAppointment: true, appointmentTime: a.appointmentDate }); }}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${a.status === "CANCELLED" ? "bg-red-100 text-red-500" : a.status === "COMPLETED" ? "bg-green-100 text-green-600" : a.status === "CONFIRMED" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                {a.Patient?.firstName?.[0]}{a.Patient?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-slate-800">{a.Patient?.lastName}, {a.Patient?.firstName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.status === "CANCELLED" ? "bg-red-50 text-red-600" : a.status === "COMPLETED" ? "bg-green-50 text-green-600" : a.status === "CONFIRMED" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>{a.status}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">{a.Patient?.patientNumber}{a.Patient?.phoneNumber && <><span className="text-slate-300">·</span> {a.Patient.phoneNumber}</>}</div>
              </div>
            </li>
          ))}</ul>}
      </div>
    </div>
  );
}

// ─── Visit History Timeline ──────────────────────────────────────────────

function VisitHistoryTimeline({ visitHistory }: { visitHistory: any[] }) {
  if (!visitHistory || visitHistory.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock size={12} /> Previous Visits ({visitHistory.length})</span>
      </div>
      <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
        {visitHistory.map((v, i) => (
          <div key={v.id || i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={11} className="text-[#0a2e1a]/40 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600">{new Date(v.date).toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {v.doctorName && <span className="text-[10px] text-slate-400 ml-auto">Dr. {v.doctorName}</span>}
            </div>
            {v.symptoms && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Complaint:</span><span className="text-[12px] text-slate-600">{v.symptoms}</span></div>}
            {v.diagnosis && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Diagnosis:</span><span className="text-[12px] text-slate-700 font-medium">{v.diagnosis}</span></div>}
            {v.treatmentPlan && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Plan:</span><span className="text-[12px] text-slate-600">{v.treatmentPlan}</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admitted Patient Interface ──────────────────────────────────────────

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

// ─── Admitted Patients View ──────────────────────────────────────────────

function AdmittedPatientsView({ onBack, staffId, staffName }: { onBack: () => void; staffId: number; staffName: string }) {
  const [patients, setPatients] = useState<AdmittedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<AdmittedPatient | null>(null);
  const [discharging, setDischarging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dischargedPatientName, setDischargedPatientName] = useState("");
  const [dischargeSummaryNotes, setDischargeSummaryNotes] = useState("");
  const [updatedTreatmentPlan, setUpdatedTreatmentPlan] = useState("");
  const [dischargeForm, setDischargeForm] = useState({ address: "", examAtAdmission: "", vitals: "", investigations: "", condition: "", conditionOther: "", medication: "", followUpNum: "", followUpUnit: "days", followUpInstr: "", nextOfKin: "" });
  const [showDischargeForm, setShowDischargeForm] = useState(false);
  const [dischargedSummaryId, setDischargedSummaryId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [nurseActions, setNurseActions] = useState<any[]>([]);
  const [patientLabRequests, setPatientLabRequests] = useState<any[]>([]);
  const [patientImagingRequests, setPatientImagingRequests] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ followUpNotes: "", examinationFindings: "", historyOfPresentIllness: "", diagnosis: "", treatmentPlan: "", labOrders: [] as string[], imagingOrders: [] as string[] });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ complaintHistory: true, examFindings: true, investigations: true, treatmentPlan: true, diagnosisPlan: true, clinicalNotes: false, activityLog: false });
  const toggleSection = (key: string) => { setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] })); };
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [savingReview, setSavingReview] = useState(false);
  const [sendingToNurse, setSendingToNurse] = useState(false);
  const [sendingRxToPharmacy, setSendingRxToPharmacy] = useState(false);

  // Prescription drafting state (same as ConsultationPanel's rx tab)
  const [rxDrafts, setRxDrafts] = useState<RxDraft[]>([]);
  const [showNewRx, setShowNewRx] = useState(false);
  const [newRx, setNewRx] = useState<RxDraft>({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" });
  const [admittedTreatmentPlan, setAdmittedTreatmentPlan] = useState("");
  const [savingTreatmentPlan, setSavingTreatmentPlan] = useState(false);

  const addRx = () => {
    if (!newRx.medication) return;
    setRxDrafts([...rxDrafts, { ...newRx }]);
    setNewRx({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" });
    setShowNewRx(false);
  };

  // Track seen result IDs for "New" badge on Investigations
  const [lastSeenResultIds, setLastSeenResultIds] = useState<Set<number>>(new Set());

  // NEW STATE for Lab, Imaging, Dentist
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [labOrderSending, setLabOrderSending] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState<any | null>(null);
  const [showImagingPicker, setShowImagingPicker] = useState(false);
  const [imagingSending, setImagingSending] = useState(false);
  const [imagingChecked, setImagingChecked] = useState<Set<string>>(new Set());
  const [dentistSending, setDentistSending] = useState(false);
  const [showSonographyPicker, setShowSonographyPicker] = useState(false);
  const [sonographyChecked, setSonographyChecked] = useState<Set<string>>(new Set());
  const [sonographySending, setSonographySending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const IMAGING_TYPES = [
    { label: "X-ray", value: "X_RAY" },
    { label: "CT Scan", value: "CT_SCAN" },
    { label: "MRI", value: "MRI" },
    { label: "Mammography", value: "MAMMOGRAPHY" },
  ];

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSendToNurse = async () => {
    if (!selectedPatient) return;
    setSendingToNurse(true);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: dischargeSummaryNotes || updatedTreatmentPlan, treatmentPlan: updatedTreatmentPlan, examinationFindings: "Sent to Nurse/Midwife", notifyDepartment: "NURSE", isStaffId: true }) });
      if (!res.ok) throw new Error("Failed");
      showToast(`✓ ${selectedPatient.firstName} ${selectedPatient.lastName} sent to Nurse/Midwife`, "success");
    } catch { showToast("Failed to send to nurse.", "error"); } finally { setSendingToNurse(false); }
  };

		  const handleSendRxToPharmacy = async () => {
		    if (!selectedPatient || (!selectedPatient.prescriptions?.length && rxDrafts.length === 0)) return;
		    setSendingRxToPharmacy(true);
		    const allPrescriptions = [
		      ...(selectedPatient.prescriptions || []).map((r) => ({ medication: r.medication, dosage: r.dosage, instructions: r.instructions, route: r.route, frequency: r.frequency })),
		      ...rxDrafts.map((r) => ({ medication: r.medication, dosage: r.dosage, instructions: r.instructions, route: r.route, frequency: r.frequency, givenAt: r.givenAt, nextDose: r.nextDose })),
		    ];
		    try {
		      const res = await fetch("/api/pharmacy/prescriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, prescriptions: allPrescriptions, prescriberName: staffName, prescriberRole: "Doctor", source: "ADMITTED" }) });
		      if (res.ok) {
		        const data = await res.json();
		        if (data.createdPrescriptions?.length) {
		          const newRxRecords = data.createdPrescriptions.map((rx: any) => ({ id: rx.id, medication: rx.medication, dosage: rx.dosage, instructions: rx.instructions, route: rx.route, frequency: rx.frequency }));
		          setSelectedPatient((prev) => prev ? { ...prev, prescriptions: [...prev.prescriptions, ...newRxRecords] } : prev);
		        }
		        setRxDrafts([]);
		        showToast(`✓ ${allPrescriptions.length} prescription(s) sent to Pharmacy.`, "success");
		      } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed to send"}`, "error"); }
		    } catch { showToast("Network error sending prescriptions to pharmacy.", "error"); } finally { setSendingRxToPharmacy(false); }
		  };

  const handleOrderLabTests = async (selectedTests: LabTestCatalogItem[]) => {
    if (!selectedPatient || selectedTests.length === 0) return;
    setLabOrderSending(true);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: "Lab tests ordered", labOrders: selectedTests.map(t => t.name), testCode: selectedTests.map(t => t.code), notifyDepartment: "LAB", isStaffId: true }) });
	      if (res.ok) { const data = await res.json(); if (data.createdLabRequests?.length) { setPatientLabRequests(prev => [...data.createdLabRequests, ...prev]); } showToast(`✓ ${selectedTests.length} test(s) ordered`, "success"); setShowLabOrderModal(false); } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed"}`, "error"); }
	    } catch { showToast("Network error.", "error"); } finally { setLabOrderSending(false); }
  };

  const handleSendToImaging = async () => {
    if (!selectedPatient || imagingChecked.size === 0) return;
    setImagingSending(true);
    const studyTypes = Array.from(imagingChecked);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: `Imaging: ${studyTypes.join(", ")}`, imagingOrders: studyTypes, notifyDepartment: "RADIOLOGY", isStaffId: true }) });
      if (res.ok) { const data = await res.json(); if (data.createdImagingRequests?.length) { setPatientImagingRequests(prev => [...data.createdImagingRequests, ...prev]); } showToast(`✓ ${imagingChecked.size} imaging order(s) sent to Radiology`, "success"); setShowImagingPicker(false); setImagingChecked(new Set()); } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed"}`, "error"); }
    } catch { showToast("Network error.", "error"); } finally { setImagingSending(false); }
  };

  const handleSendToSonography = async () => {
    if (!selectedPatient || sonographyChecked.size === 0) return;
    setSonographySending(true);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: "Sonography: " + Array.from(sonographyChecked).join(", "), imagingOrders: Array.from(sonographyChecked), notifyDepartment: "SONOGRAPHY", isStaffId: true }) });
	      if (res.ok) { const data = await res.json(); if (data.createdImagingRequests?.length) { setPatientImagingRequests(prev => [...data.createdImagingRequests, ...prev]); } showToast(`✓ ${sonographyChecked.size} scan(s) ordered`, "success"); setShowSonographyPicker(false); setSonographyChecked(new Set()); } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed"}`, "error"); }
	    } catch { showToast("Network error.", "error"); } finally { setSonographySending(false); }
	  };

  const handleSendToDentist = async () => {
    if (!selectedPatient) return;
    setDentistSending(true);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: "Dental referral", dentistReferral: true, notifyDepartment: "DENTIST", isStaffId: true }) });
	      if (res.ok) { showToast(`✓ Referred to Dentist`, "success"); } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed"}`, "error"); }
		    } catch { showToast("Network error.", "error"); } finally { setDentistSending(false); }
		  };

		  const handleSaveTreatmentPlan = async () => {
		    if (!selectedPatient) return;
		    setSavingTreatmentPlan(true);
		    try {
		      const res = await fetch("/api/doctor/admitted", {
		        method: "PATCH",
		        headers: { "Content-Type": "application/json" },
		        body: JSON.stringify({ patientId: selectedPatient.id, treatmentPlan: admittedTreatmentPlan, staffName, staffId }),
		      });
		      if (res.ok) {
		        setSelectedPatient((prev) => prev ? { ...prev, treatmentPlan: admittedTreatmentPlan } : prev);
		        showToast("Treatment plan saved", "success");
		      } else { const err = await res.json(); showToast(`Error: ${err.error || "Failed to save"}`, "error"); }
			    } catch { showToast("Network error.", "error"); } finally { setSavingTreatmentPlan(false); }
			  };

			  const handleCancelRequest = async (id: number, type: "LAB" | "IMAGING") => {
			    try {
			      const res = await fetch(`/api/doctor/requests?id=${id}&type=${type}`, { method: "DELETE" });
			      if (res.ok) {
			        if (type === "LAB") {
			          setPatientLabRequests((prev) => prev.map((r: any) => r.id === id ? { ...r, status: "CANCELLED" } : r));
			        } else {
			          setPatientImagingRequests((prev) => prev.map((r: any) => r.id === id ? { ...r, status: "CANCELLED" } : r));
			        }
			        showToast("Request cancelled", "success");
			      } else {
			        const err = await res.json();
			        showToast(`Error: ${err.error || "Failed to cancel"}`, "error");
			      }
			    } catch { showToast("Network error.", "error"); }
			  };

			  const fetchAdmitted = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/doctor/admitted");
      if (!res.ok) { const errBody = await res.json().catch(() => ({})); throw new Error(`${errBody.error || `Server error (${res.status})`}`); }
      const data = await res.json();
      setPatients(data.patients ?? []);
      setLoadError(null);
    } catch (err: any) { console.error("[AdmittedPatientsView] fetch error:", err.message); if (patients.length === 0) setLoadError(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmitted(); const i = setInterval(fetchAdmitted, 30_000); return () => clearInterval(i); }, [fetchAdmitted]);

  useEffect(() => {
    if (selectedPatient) {
      setUpdatedTreatmentPlan(selectedPatient.treatmentPlan || "");
      setAdmittedTreatmentPlan(selectedPatient.treatmentPlan || "");
      setDischargeForm({ address: (selectedPatient as any).address || "", examAtAdmission: "", vitals: "", investigations: "", condition: "", conditionOther: "", medication: "", followUpNum: "", followUpUnit: "days", followUpInstr: "", nextOfKin: "" });
      fetchReviews(selectedPatient.id);
    }
  }, [selectedPatient]);

  useEffect(() => { if (!selectedPatient) return; const id = selectedPatient.id; fetchReviews(id); const i = setInterval(() => fetchReviews(id), 30_000); return () => clearInterval(i); }, [selectedPatient?.id]);

  const fetchReviews = async (patientId: number) => {
    setReviewsLoading(true);
    try {
      const [reviewsRes, nurseRes] = await Promise.all([fetch(`/api/doctor/reviews?patientId=${patientId}`), fetch(`/api/nurse-actions?patientId=${patientId}`)]);
      if (reviewsRes.ok) { const d = await reviewsRes.json(); setReviews(d.reviews ?? []); setPatientLabRequests(d.labRequests ?? []); setPatientImagingRequests(d.imagingRequests ?? []); }
      if (nurseRes.ok) { const nd = await nurseRes.json(); setNurseActions(nd.actions ?? []); }
    } catch (err) { console.error("[AdmittedPatientsView] fetchReviews error:", err); } finally { setReviewsLoading(false); }
  };

  // Collect result IDs for "New" badge tracking
  const completedLabIds = patientLabRequests.filter((lr: any) => lr.status === "COMPLETED" || lr.status === "REPORTED").map((lr: any) => lr.id);
  const completedImagingIds = patientImagingRequests.filter((ir: any) => ir.status === "REPORTED").map((ir: any) => ir.id);
  const allResultIds = [...completedLabIds, ...completedImagingIds];
  const hasNewResults = allResultIds.some((id) => !lastSeenResultIds.has(id));

  const markResultsSeen = () => {
    setLastSeenResultIds((prev) => {
      const n = new Set(prev);
      allResultIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const handleAddReview = async () => {
    if (!selectedPatient) return;
    setSavingReview(true);
    try {
      const res = await fetch("/api/doctor/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: staffId, doctorName: staffName, followUpNotes: reviewForm.followUpNotes, examinationFindings: reviewForm.examinationFindings, historyOfPresentIllness: reviewForm.historyOfPresentIllness, diagnosis: reviewForm.diagnosis, treatmentPlan: reviewForm.treatmentPlan, labOrders: reviewForm.labOrders, imagingOrders: reviewForm.imagingOrders }) });
	      if (res.ok) { setReviewForm({ followUpNotes: "", examinationFindings: "", historyOfPresentIllness: "", diagnosis: "", treatmentPlan: "", labOrders: [], imagingOrders: [] }); setShowReviewForm(false); fetchReviews(selectedPatient.id); } else { showToast("Failed to save.", "error"); }
	    } catch { showToast("Network error.", "error"); } finally { setSavingReview(false); }
  };

  const handleDischarge = async () => {
    if (!selectedPatient) return;
    setDischarging(true);
    try {
      const res = await fetch("/api/doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: selectedPatient.id, staffId, staffName, treatmentPlan: updatedTreatmentPlan, notes: dischargeSummaryNotes || selectedPatient.chiefComplaint, routeTo: "DISCHARGE" }) });
      if (!res.ok) throw new Error("Discharge failed");
      setDischargedPatientName(`${selectedPatient.lastName}, ${selectedPatient.firstName}`);
      setShowSuccess(true);
      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
      setTimeout(() => { setShowSuccess(false); setSelectedPatient(null); setDischargeSummaryNotes(""); setDischargeForm({ address: "", examAtAdmission: "", vitals: "", investigations: "", condition: "", conditionOther: "", medication: "", followUpNum: "", followUpUnit: "days", followUpInstr: "", nextOfKin: "" }); }, 3000);
	    } catch { showToast("Failed to discharge patient.", "error"); } finally { setDischarging(false); }
  };

  const buildDischargeHtml = (): string => {
    const p = selectedPatient!;
    const df = dischargeForm;
    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
    const admitDate = new Date(p.admittedAt).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const g = p.gender === "MALE" ? "Male" : p.gender === "FEMALE" ? "Female" : p.gender;
    const c = df.condition;
    return `<!DOCTYPE html><html><head><title>Discharge Form</title><style>@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#222;position:relative}body::before{content:'';position:fixed;inset:0;background-image:url('/Images/LOGO.jpg');background-repeat:no-repeat;background-position:center;background-size:60%;opacity:0.07;pointer-events:none;z-index:-1;print-color-adjust:exact}table{width:100%;border-collapse:collapse;margin-bottom:10px}td{padding:3px 6px;border:1px solid #ccc}th{padding:4px 8px;background:#0a2e1a;color:#fff;font-size:11px;text-align:left}.title{text-align:center;font-size:16px;font-weight:bold;color:#0a2e1a;margin:10px 0 14px}.section-hdr{font-size:11px;font-weight:bold;color:#0a2e1a;margin:12px 0 4px;text-decoration:underline}.sig-line{border-bottom:1px solid #000;display:inline-block;min-width:200px;padding:2px 8px;font-size:18px;font-family:'Brush Script MT','Segoe Script',cursive}</style></head><body><div class="title">MAIN STREET MEDICAL CENTER<br/><span style="font-size:12px;font-weight:normal">DISCHARGE FORM</span></div>
    <table><tr><th colspan="4">PATIENT INFORMATION</th></tr>
    <tr><td><b>Name:</b></td><td>${p.lastName}, ${p.firstName}</td><td><b>ID:</b></td><td>${p.patientNumber}</td></tr>
    <tr><td><b>Age/Sex:</b></td><td>${p.age} / ${g}</td><td><b>Contact:</b></td><td>${p.phoneNumber || "N/A"}</td></tr>
    <tr><td><b>Admitted:</b></td><td>${admitDate}</td><td><b>Discharged:</b></td><td>${today}</td></tr></table>
    <div class="section-hdr">Chief Complaint</div><p style="margin:2px 0">${p.chiefComplaint || "N/A"}</p>
    <div class="section-hdr">Diagnosis</div><p style="margin:2px 0">${p.diagnosis || "N/A"}</p>
    <div class="section-hdr">Treatment Given</div><p style="margin:2px 0">${p.treatmentPlan || dischargeSummaryNotes || "See records"}</p>
	    <div class="section-hdr">Condition at Discharge</div><p style="margin:2px 0">${c || "N/A"}${df.conditionOther ? " - "+df.conditionOther : ""}</p>
	    <div class="section-hdr">Discharge Medication</div><p style="margin:2px 0">${df.medication || dischargeSummaryNotes || "N/A"}</p>
    <div class="section-hdr">Follow-Up</div><p style="margin:2px 0">Review in ${df.followUpNum || "___"} ${df.followUpUnit}. ${df.followUpInstr || ""}</p>
    <div style="display:flex;justify-content:space-between;margin-top:30px;border-top:1px solid #ccc;padding-top:16px">
      <div><p style="font-weight:bold;font-size:11px">Next of Kin</p><div class="sig-line">${df.nextOfKin || ""}</div></div>
      <div><p style="font-weight:bold;font-size:11px">Doctor</p><div class="sig-line">${staffName}</div><p style="font-size:10px;color:#666">${today}</p></div>
    </div>
    <p style="text-align:center;font-size:9px;color:#999;margin-top:20px">Main Street Medical Center EMR</p>
    <script>window.onload=function(){window.print();window.close();};<\/script></body></html>`;
  };

  const handlePrintDischarge = () => {
    const html = buildDischargeHtml();
    const pw = window.open("", "_blank", "width=800,height=600");
    if (!pw) { alert("Please allow pop-ups."); return; }
    pw.document.write(html); pw.document.close();
  };

  const filtered = search ? patients.filter((p) => { const q = search.toLowerCase(); return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q) || p.patientNumber.toLowerCase().includes(q); }) : patients;

  // ── Detail View ──
  if (selectedPatient) {
    const p = selectedPatient;
    const ChartSection = ({ title, icon, expanded, onToggle, children }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode }) => (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-3">
        <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">{icon}{title}</div><ChevronDown size={14} className={"text-slate-400 transition-transform " + (expanded ? "rotate-180" : "")} /></button>
        {expanded && <div className="p-4">{children}</div>}
      </div>
    );

    return (
      <div>
        <button onClick={() => { setSelectedPatient(null); setDischargeSummaryNotes(""); }} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"><ArrowLeft size={15} /> Back</button>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold flex-shrink-0 ${p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}`}>{p.firstName[0]}{p.lastName[0]}</div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{p.lastName}, {p.firstName}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 mt-1">
                  <span className="font-mono text-[11px] text-[#0a2e1a]/60">{p.patientNumber}</span><span className="text-slate-300">|</span><span>{p.gender === "MALE" ? "Male" : "Female"}</span><span className="text-slate-300">|</span><span>{p.age} years</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="bg-teal-100 text-teal-700 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">{p.lengthOfStay}</div>
              {p.admittingDoctor && <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1.5"><span className="font-semibold">Dr.</span> {p.admittingDoctor}</div>}
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1">{new Date(p.admittedAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        </div>

        <ChartSection title="Complaint & History" icon={<FileText size={12} />} expanded={expandedSections.complaintHistory} onToggle={() => toggleSection("complaintHistory")}>
          <div className="space-y-4">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint / Presenting Complaint</p><p className="text-sm text-slate-700">{p.chiefComplaint || "Not recorded"}</p></div>
            {p.historyOfPresentIllness && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">History of Presenting Illness</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.historyOfPresentIllness}</p></div>}
            {p.symptoms && p.symptoms !== p.chiefComplaint && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor's Presenting Complaint</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.symptoms}</p></div>}
            {p.assessment && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assessment</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.assessment}</p></div>}
          </div>
          <VisitHistoryTimeline visitHistory={visitHistory} />
        </ChartSection>

        <ChartSection title="Exam Findings" icon={<Activity size={12} />} expanded={expandedSections.examFindings} onToggle={() => toggleSection("examFindings")}>
          <div className="space-y-4">
            {p.physicalExamination ? <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Physical Examination</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.physicalExamination}</p></div> : <p className="text-sm text-slate-400">No examination findings recorded</p>}
            {p.reviewOfOtherSystems && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Review of Other Systems</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.reviewOfOtherSystems}</p></div>}
            {p.pastMedicalHistory && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Past Medical History</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.pastMedicalHistory}</p></div>}
            {p.notes && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Notes</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p></div>}
          </div>
        </ChartSection>

        {(p.prescriptions?.length > 0 || rxDrafts.length > 0) && (
          <ChartSection title={"Prescriptions (" + ((p.prescriptions?.length || 0) + rxDrafts.length) + ")"} icon={<Pill size={12} />} expanded={true} onToggle={() => {}}>
            <div className="space-y-3">
              {/* Draft prescriptions */}
              {rxDrafts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">New Drafts</p>
                  {rxDrafts.map((rx, i) => (
                    <div key={i} className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{rx.medication}</p>
                        <p className="text-xs text-slate-500">{rx.dosage}{rx.route ? ` — ${rx.route}` : ""}{rx.frequency ? ` — ${rx.frequency}` : ""}</p>
                        <p className="text-xs text-slate-400">{rx.instructions || ""}{rx.givenAt ? ` | Given: ${rx.givenAt}` : ""}{rx.nextDose ? ` | Next: ${rx.nextDose}` : ""}</p>
                      </div>
                      <button onClick={() => setRxDrafts(rxDrafts.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 p-1"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Existing prescriptions (from DB) */}
              {p.prescriptions && p.prescriptions.length > 0 && (
                <div className="space-y-2">
                  {p.prescriptions.map((rx) => (
                    <div key={rx.id} className="flex items-start gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <Pill size={14} className="text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{rx.medication}</p>
                        <p className="text-[11px] text-slate-500"><span className="font-medium text-slate-600">Dosage:</span> {rx.dosage}</p>
                        {rx.route && <p className="text-[11px] text-slate-500"><span className="font-medium text-slate-600">Route:</span> {rx.route}</p>}
                        {rx.frequency && <p className="text-[11px] text-slate-500"><span className="font-medium text-slate-600">Frequency:</span> {rx.frequency}</p>}
                        <p className="text-[11px] text-slate-500"><span className="font-medium text-slate-600">Instructions:</span> {rx.instructions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Add Prescription form (mirrors ConsultationPanel's rx tab) */}
              {showNewRx ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <input type="text" placeholder="Medication name" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.medication} onChange={(e) => setNewRx({ ...newRx, medication: e.target.value })} />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Dosage (e.g. 500mg)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.dosage} onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })} />
                    <input type="text" placeholder="Route (e.g. PO, IV, IM)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.route} onChange={(e) => setNewRx({ ...newRx, route: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Frequency (e.g. TID, BD)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.frequency} onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })} />
                    <input type="text" placeholder="Instructions" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.instructions} onChange={(e) => setNewRx({ ...newRx, instructions: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Given at (e.g. 8:00 AM)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.givenAt} onChange={(e) => setNewRx({ ...newRx, givenAt: e.target.value })} />
                    <input type="text" placeholder="Next dose (e.g. 2025-03-21 14:00)" className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]" value={newRx.nextDose} onChange={(e) => setNewRx({ ...newRx, nextDose: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addRx} className="bg-[#0a2e1a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0d3d24] transition-colors">Add Prescription</button>
                    <button onClick={() => { setShowNewRx(false); setNewRx({ medication: "", dosage: "", instructions: "", route: "", frequency: "", givenAt: "", nextDose: "" }); }} className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewRx(true)} className="flex items-center gap-2 text-[#0a2e1a] text-sm font-medium hover:text-[#0d3d24]"><Plus size={15} /> Add Prescription</button>
              )}
              <button onClick={handleSendRxToPharmacy} disabled={sendingRxToPharmacy} className="w-full py-2.5 rounded-xl font-semibold text-xs bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                {sendingRxToPharmacy ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send {(p.prescriptions?.length || 0) + rxDrafts.length} Prescription(s) to Pharmacy</>}
              </button>
            </div>
          </ChartSection>
        )}

			        <ChartSection title={"Investigations" + (hasNewResults && !expandedSections.investigations ? " \u2713 New" : "")} icon={<Microscope size={12} />} expanded={expandedSections.investigations} onToggle={() => { toggleSection("investigations"); if (!expandedSections.investigations) markResultsSeen(); }}>

		          <div className="space-y-4">
            {patientLabRequests.filter((lr: any) => lr.status !== "CANCELLED").length > 0 && (
              <div><p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2"><Microscope size={11} /> Lab Requests ({patientLabRequests.filter((lr: any) => lr.status !== "CANCELLED").length})</p>
                <div className="space-y-2">{(patientLabRequests as any[]).map((lr: any) => {
                  const hasResults = lr.status === "COMPLETED" || lr.status === "REPORTED";
                  const isExpanded = selectedLabResult?.id === lr.id;
                  return (
                    <div key={`lab-${lr.id}`}>
                      <div
                        onClick={() => {
                          if (hasResults) setSelectedLabResult(isExpanded ? null : lr);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          hasResults
                            ? "bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200"
                            : "bg-slate-50 border border-slate-100"
                        } ${isExpanded ? "border-purple-300 bg-purple-50" : ""}`}
                      >
                        <Microscope size={14} className="text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{lr.testName}</p>
                          <p className="text-[10px] text-slate-400">{new Date(lr.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</p>
                        </div>
                        {hasResults ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">View Results</span>
                        ) : lr.status === "PENDING" ? (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                        ) : lr.status === "CANCELLED" ? (
                          <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full line-through">Cancelled</span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{lr.status}</span>
                        )}
                        {lr.status === "PENDING" && (
                          <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(lr.id, "LAB"); }} className="text-rose-300 hover:text-rose-600 p-1 ml-1 flex-shrink-0" title="Cancel this request"><X size={14} /></button>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-2 mb-3">
                          <LabResultDetail lr={lr} />
                        </div>
                      )}
                    </div>
                  );
                })}</div>
              </div>
            )}
            {patientImagingRequests.filter((ir: any) => ir.status !== "CANCELLED").length > 0 && (
              <div><p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-2"><Radio size={11} /> Imaging ({patientImagingRequests.filter((ir: any) => ir.status !== "CANCELLED").length})</p>
                <div className="space-y-2">{(patientImagingRequests as any[]).map((ir: any) => (
                  <div key={`img-${ir.id}`} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                    <Radio size={14} className="text-cyan-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700">{ir.studyType}</p></div>
                    {ir.status === "REPORTED" ? <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Reported</span> : ir.status === "ORDERED" ? <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Ordered</span> : ir.status === "CANCELLED" ? <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full line-through">Cancelled</span> : <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ir.status}</span>}
                    {ir.status === "ORDERED" && (
                      <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(ir.id, "IMAGING"); }} className="text-rose-300 hover:text-rose-600 p-1 ml-1 flex-shrink-0" title="Cancel this request"><X size={14} /></button>
                    )}
                  </div>
                ))}</div>
              </div>
            )}
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
            ) : patientLabRequests.filter((lr: any) => lr.status !== "CANCELLED").length === 0 && patientImagingRequests.filter((ir: any) => ir.status !== "CANCELLED").length === 0 ? (
              <p className="text-sm text-slate-400">No orders yet</p>
            ) : null}
          </div>
        </ChartSection>

        {/* Treatment Plan (editable) */}
        <ChartSection title="Treatment Plan" icon={<ClipboardList size={12} />} expanded={expandedSections.treatmentPlan} onToggle={() => toggleSection("treatmentPlan")}>
          <div className="space-y-3">
            <textarea
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"
              placeholder="Plan of care, management plan, follow-up schedule..."
              value={admittedTreatmentPlan}
              onChange={(e) => setAdmittedTreatmentPlan(e.target.value)}
            />
            <button
              onClick={handleSaveTreatmentPlan}
              disabled={savingTreatmentPlan}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0a2e1a] hover:bg-[#0d3d24] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingTreatmentPlan ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> Save Treatment Plan</>}
            </button>
          </div>
        </ChartSection>

        <ChartSection title="Diagnosis & Plan" icon={<ClipboardList size={12} />} expanded={expandedSections.diagnosisPlan} onToggle={() => toggleSection("diagnosisPlan")}>
          <div className="space-y-4">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</p><p className="text-sm text-slate-700">{p.diagnosis || "Not yet diagnosed"}</p></div>
            {p.differentialDiagnosis && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Differential Diagnosis</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{p.differentialDiagnosis}</p></div>}
            {p.doctorSignature && <div className="border-t border-slate-100 pt-3 mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor's Signature</p><p className="text-sm text-slate-700 italic" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>{p.doctorSignature}</p></div>}
          </div>
        </ChartSection>

        {/* Clinical Notes (was Follow-Up Reviews) */}
        <ChartSection title="Clinical Notes" icon={<FileText size={12} />} expanded={expandedSections.clinicalNotes} onToggle={() => toggleSection("clinicalNotes")}>
          <div className="space-y-4">
            {reviews.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Notes</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviews.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-500">{r.doctorName || "Doctor"}</span>
                        <span className="text-[9px] text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {r.followUpNotes && <p className="text-xs text-slate-700 mb-1">{r.followUpNotes}</p>}
                      {r.examinationFindings && <p className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Exam:</span> {r.examinationFindings}</p>}
                      {r.diagnosis && <p className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Dx:</span> {r.diagnosis}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3">
              <textarea
                placeholder="Clinical notes (follow-up findings, observations...)"
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[80px]"
                value={reviewForm.followUpNotes}
                onChange={(e) => setReviewForm({ ...reviewForm, followUpNotes: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <textarea
                  placeholder="Examination findings"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px]"
                  value={reviewForm.examinationFindings}
                  onChange={(e) => setReviewForm({ ...reviewForm, examinationFindings: e.target.value })}
                />
                <textarea
                  placeholder="Diagnosis"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px]"
                  value={reviewForm.diagnosis}
                  onChange={(e) => setReviewForm({ ...reviewForm, diagnosis: e.target.value })}
                />
              </div>
              <textarea
                placeholder="Treatment plan"
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px] mt-3"
                value={reviewForm.treatmentPlan}
                onChange={(e) => setReviewForm({ ...reviewForm, treatmentPlan: e.target.value })}
              />
              {/* Lab orders */}
              <div className="mt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Microscope size={11} /> Lab Orders {reviewForm.labOrders.length > 0 && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{reviewForm.labOrders.length}</span>}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {DOCTOR_LAB_TESTS.map((t) => (
                    <label key={t} className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer text-xs transition-all ${reviewForm.labOrders.includes(t) ? "border-[#0a2e1a] bg-[#0a2e1a]/5" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                      <input type="checkbox" className="accent-[#0a2e1a] scale-75" checked={reviewForm.labOrders.includes(t)}
                        onChange={(e) => { setReviewForm({ ...reviewForm, labOrders: e.target.checked ? [...reviewForm.labOrders, t] : reviewForm.labOrders.filter((x) => x !== t) }); }} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Imaging orders */}
              <div className="mt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Radio size={11} /> Imaging Orders {reviewForm.imagingOrders.length > 0 && <span className="text-[9px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">{reviewForm.imagingOrders.length}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {DOCTOR_RADIOLOGY_TESTS.map((t) => (
                    <label key={t} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${reviewForm.imagingOrders.includes(t) ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                      <input type="checkbox" className="accent-cyan-600 scale-75" checked={reviewForm.imagingOrders.includes(t)}
                        onChange={(e) => { setReviewForm({ ...reviewForm, imagingOrders: e.target.checked ? [...reviewForm.imagingOrders, t] : reviewForm.imagingOrders.filter((x) => x !== t) }); }} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleAddReview} disabled={savingReview} className="mt-4 w-full py-2.5 rounded-xl font-semibold text-xs bg-[#0a2e1a] text-white hover:bg-[#0d3d24] active:bg-[#0f4f2d] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                {savingReview ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> Save Clinical Note</>}
              </button>
            </div>
          </div>
	        </ChartSection>

		        {/* Unified Activity Log */}
		        <ChartSection title="Activity Log" icon={<Clock size={12} />} expanded={expandedSections.activityLog} onToggle={() => toggleSection("activityLog")}>
		          <div className="max-h-80 overflow-y-auto space-y-1">
		            {(() => {
		              const safeParse = (v: any): any[] => { try { if (typeof v === "string") return JSON.parse(v); if (Array.isArray(v)) return v; return []; } catch { return []; } };
		              const activities: { ts: string; actor: string; desc: string; type: string; status?: string }[] = [];
		              // Reviews / clinical notes
		              (reviews || []).forEach((r: any) => {
		                if (r.followUpNotes || r.examinationFindings || r.diagnosis) {
		                  const parts: string[] = [];
		                  if (r.followUpNotes) parts.push(`Notes: ${r.followUpNotes}`);
		                  if (r.examinationFindings) parts.push(`Exam: ${r.examinationFindings}`);
		                  if (r.diagnosis) parts.push(`Dx: ${r.diagnosis}`);
		                  activities.push({ ts: r.createdAt, actor: `Dr. ${r.doctorName || "Unknown"}`, desc: `Clinical review — ${parts.join("; ")}`, type: "review" });
		                }
		                const labOrdersArr = safeParse(r.labOrders);
		                if (labOrdersArr.length > 0) {
		                  activities.push({ ts: r.createdAt, actor: `Dr. ${r.doctorName || "Unknown"}`, desc: `Ordered ${labOrdersArr.length} lab test(s)`, type: "lab_order" });
		                }
		                const imgOrdersArr = safeParse(r.imagingOrders);
		                if (imgOrdersArr.length > 0) {
		                  activities.push({ ts: r.createdAt, actor: `Dr. ${r.doctorName || "Unknown"}`, desc: `Ordered ${imgOrdersArr.length} imaging study/studies`, type: "imaging_order" });
		                }
		              });
	              // Lab requests
	              (patientLabRequests || []).forEach((lr: any) => {
	                activities.push({ ts: lr.createdAt, actor: "System", desc: `Lab: ${lr.testName}`, type: "lab", status: lr.status });
	              });
	              // Imaging requests
	              (patientImagingRequests || []).forEach((ir: any) => {
	                activities.push({ ts: ir.createdAt, actor: "System", desc: `Imaging: ${ir.studyType}`, type: "imaging", status: ir.status });
	              });
	              // Nurse actions
	              (nurseActions || []).forEach((na: any) => {
	                activities.push({ ts: na.createdAt, actor: na.performedBy || "Nurse", desc: na.action || na.notes || "Nurse action", type: "nurse" });
	              });
	              activities.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
	              if (activities.length === 0) {
	                return <p className="text-sm text-slate-400 text-center py-4">No activity recorded yet</p>;
	              }
	              return activities.slice(0, 50).map((a, i) => {
	                const statusColor = a.status === "COMPLETED" || a.status === "REPORTED" ? "text-emerald-600" : a.status === "PENDING" || a.status === "ORDERED" ? "text-amber-600" : "";
	                return (
	                  <div key={`act-${i}`} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
	                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.type === "review" ? "bg-[#0a2e1a]" : a.type === "lab_order" || a.type === "lab" ? "bg-purple-400" : a.type === "imaging_order" || a.type === "imaging" ? "bg-cyan-400" : "bg-blue-400"}`} />
	                    <div className="flex-1 min-w-0">
	                      <div className="flex items-center gap-2 flex-wrap">
	                        <span className="text-[11px] font-semibold text-slate-700">{a.actor}</span>
	                        {a.status && <span className={`text-[9px] font-medium ${statusColor || "text-slate-400"}`}>{a.status}</span>}
	                      </div>
	                      <p className="text-[10px] text-slate-500 leading-snug">{a.desc}</p>
	                      <p className="text-[8px] text-slate-400 mt-0.5">{new Date(a.ts).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
	                    </div>
	                  </div>
	                );
	              });
	            })()}
	          </div>
	        </ChartSection>

	        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          <button onClick={() => setShowLabOrderModal(true)} disabled={labOrderSending} className="py-2.5 rounded-xl font-semibold text-xs bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            {labOrderSending ? <><Loader2 size={13} className="animate-spin" />...</> : <><FlaskConical size={13} /> Lab Tests</>}
          </button>
          <button onClick={() => setShowImagingPicker(true)} disabled={imagingSending} className="py-2.5 rounded-xl font-semibold text-xs bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            <Radio size={13} /> Imaging
          </button>
          <button onClick={() => setShowSonographyPicker(true)} disabled={sonographySending} className="py-2.5 rounded-xl font-semibold text-xs bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            {sonographySending ? <><Loader2 size={13} className="animate-spin" />...</> : <><Waves size={13} /> Sonography</>}
          </button>
          <button onClick={handleSendToDentist} disabled={dentistSending} className="py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            {dentistSending ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Stethoscope size={13} /> Dentist</>}
          </button>
          <button onClick={handleSendToNurse} disabled={sendingToNurse} className="py-2.5 rounded-xl font-semibold text-xs bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            {sendingToNurse ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Activity size={13} /> Nurse</>}
          </button>
          <button onClick={handlePrintDischarge} className="py-2.5 rounded-xl font-semibold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-all flex items-center justify-center gap-1.5">
            <Printer size={13} /> Print
          </button>
          <button onClick={() => setShowDischargeForm(true)} disabled={discharging} className="py-2.5 rounded-xl font-semibold text-xs bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
            {discharging ? <><Loader2 size={13} className="animate-spin" /> Processing...</> : <><LogOut size={13} /> Discharge</>}
          </button>
        </div>

        {/* Lab Order Modal */}
        {showLabOrderModal && selectedPatient && (
          <LabOrderModal
            patientName={`${selectedPatient.lastName}, ${selectedPatient.firstName}`}
            onClose={() => setShowLabOrderModal(false)}
            onConfirm={handleOrderLabTests}
          />
        )}

        {/* Imaging Picker Modal — checkbox grid for X-ray, CT, MRI, Mammography */}
        {showImagingPicker && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowImagingPicker(false); setImagingChecked(new Set()); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-700">Order Imaging</h3><button onClick={() => { setShowImagingPicker(false); setImagingChecked(new Set()); }} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button></div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {IMAGING_TYPES.map((t) => (
                    <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${imagingChecked.has(t.value) ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-cyan-300 bg-white"}`}>
                      <input type="checkbox" className="accent-cyan-600" checked={imagingChecked.has(t.value)}
                        onChange={(e) => { const n = new Set(imagingChecked); e.target.checked ? n.add(t.value) : n.delete(t.value); setImagingChecked(n); }} />
                      <span className="text-sm text-slate-700">{t.label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleSendToImaging} disabled={imagingSending || imagingChecked.size === 0} className="w-full py-3 rounded-xl font-semibold text-sm bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {imagingSending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send {imagingChecked.size > 0 ? `(${imagingChecked.size})` : ""} to Radiology</>}
                </button>
              </div>
            </div>
          </div>
        )}

	        {/* Sonography Picker Modal with checkbox grid */}
	        {showSonographyPicker && (
	          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowSonographyPicker(false); setSonographyChecked(new Set()); }}>
	            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
	              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-700">Order Sonography Scans</h3><button onClick={() => { setShowSonographyPicker(false); setSonographyChecked(new Set()); }} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button></div>
	              <div className="p-5">
	                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
	                  {DOCTOR_SONOGRAPHY_TESTS.map((t) => (
	                    <label key={t} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sonographyChecked.has(t) ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-300 bg-white"}`}>
	                      <input type="checkbox" className="accent-teal-600" checked={sonographyChecked.has(t)}
	                        onChange={(e) => { const n = new Set(sonographyChecked); e.target.checked ? n.add(t) : n.delete(t); setSonographyChecked(n); }} />
	                      <span className="text-sm text-slate-700">{t}</span>
	                    </label>
	                  ))}
	                </div>
	                <button onClick={handleSendToSonography} disabled={sonographySending || sonographyChecked.size === 0} className="w-full py-3 rounded-xl font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
	                  {sonographySending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send {sonographyChecked.size > 0 ? `(${sonographyChecked.size})` : ""} to Sonography</>}
	                </button>
	              </div>
	            </div>
	          </div>
        )}

        {/* Discharge Summary Form */}
        {showDischargeForm && selectedPatient && (
          <DischargeSummaryForm
            patient={selectedPatient}
            labRequests={patientLabRequests}
            imagingRequests={patientImagingRequests}
            staffId={staffId}
            staffName={staffName}
            onClose={() => setShowDischargeForm(false)}
            onDischarged={(name, summaryId) => {
              setShowDischargeForm(false);
              setDischargedPatientName(name);
              setDischargedSummaryId(summaryId);
              setShowSuccess(true);
              setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
            }}
          />
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowSuccess(false); setSelectedPatient(null); setDischargedSummaryId(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-emerald-600" /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Patient Discharged</h3>
              <p className="text-sm text-slate-600 mb-1"><span className="font-semibold">{dischargedPatientName}</span></p>
              <p className="text-xs text-slate-400 mb-5">Discharge summary has been saved and the PDF has been downloaded.</p>
              <button onClick={() => { setShowSuccess(false); setSelectedPatient(null); setDischargedSummaryId(null); }} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0a2e1a] hover:bg-[#0d3d24] transition-all">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

	  // ── List View ──
	  return (
	    <div>
	      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"><ArrowLeft size={15} /> Back to Dashboard</button>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search admitted patients..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0a2e1a]" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</span>
        <button onClick={fetchAdmitted} className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>
      {loading ? (
        <div className="py-16 text-center text-slate-400"><Loader2 size={16} className="animate-spin mr-2" /> Loading...</div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-sm font-medium text-red-700">{loadError}</p><button onClick={fetchAdmitted} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Retry</button></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Hospital size={48} className="mx-auto text-slate-200 mb-3" /><p className="text-sm font-medium text-slate-400">{search ? "No matches" : "No admitted patients"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((pt) => (
            <div key={pt.id} onClick={() => setSelectedPatient(pt)} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${pt.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}`}>{pt.firstName[0]}{pt.lastName[0]}</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 truncate">{pt.lastName}, {pt.firstName}</p><p className="text-[11px] text-slate-400 font-mono">{pt.patientNumber}</p></div>
                <div className="bg-teal-100 text-teal-700 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{pt.lengthOfStay}</div>
              </div>
              {pt.chiefComplaint && <p className="text-xs text-slate-500 line-clamp-2 mb-1"><span className="font-semibold">CC:</span> {pt.chiefComplaint}</p>}
              {pt.diagnosis && <p className="text-xs text-slate-600 truncate"><span className="font-semibold">Dx:</span> {pt.diagnosis}</p>}
	              {pt.admittingDoctor && <p className="text-[10px] text-slate-400 mt-1.5 truncate"><span className="font-semibold">Admitted by:</span> Dr. {pt.admittingDoctor}</p>}
	            </div>
	          ))}

	        </div>

		      )}

	      {/* ── Branded Toast ── */}
	      {(() => {
	        const t = toast;
	        if (!t) return null;
	        return (
	          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-[fadeIn_0.2s_ease-out]">
	            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${
	              t.type === "success"
	                ? "bg-green-800 text-white border-green-700"
	                : "bg-red-600 text-white border-red-500"
	            }`}>
	              {t.type === "success" ? (
	                <CheckCircle size={18} className="flex-shrink-0" />
	              ) : (
	                <AlertTriangle size={18} className="flex-shrink-0" />
	              )}
	              <span className="text-sm font-semibold">{t.message}</span>
	              <button onClick={() => setToast(null)} className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0">
	                <X size={14} />
	              </button>
	            </div>
	          </div>
	        );
	      })()}

		    </div>

		  );

	}



// ─── Doctor Records View ──────────────────────────────────────────────────

function DoctorRecordsView({ onBack, staffName }: { onBack: () => void; staffName: string }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPatientRecords, setSelectedPatientRecords] = useState<any | null>(null);
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/doctor/records");
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setPatients(data.patients ?? []);
      setLoadError(null);
    } catch (err: any) {
      console.error("[DoctorRecordsView] fetch error:", err.message);
      if (patients.length === 0) setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = search
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.firstName?.toLowerCase().includes(q) ||
          p.lastName?.toLowerCase().includes(q) ||
          p.patientNumber?.toLowerCase().includes(q) ||
          p.diagnosis?.toLowerCase().includes(q)
        );
      })
    : patients;

  // Detail view when a patient is selected
  if (selectedPatientRecords) {
    const pr = selectedPatientRecords;
    return (
      <div>
        <button onClick={() => setSelectedPatientRecords(null)} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"><ArrowLeft size={15} /> Back to Records</button>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#0a2e1a]/10 flex items-center justify-center text-base font-bold text-[#0a2e1a] flex-shrink-0">
                {pr.firstName?.[0]}{pr.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{pr.lastName}, {pr.firstName}</h2>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono text-[11px] text-[#0a2e1a]/60">{pr.patientNumber}</span>
                  <span className="text-slate-300">|</span>
                  <span>{pr.gender === "MALE" ? "Male" : "Female"}</span>
                  <span className="text-slate-300">|</span>
                  <span>{pr.age} years</span>
                  <span className="text-slate-300">|</span>
                  <span>{pr.visitCount} visit{pr.visitCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${pr.currentStatus === "ADMITTED" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                {pr.currentStatus === "ADMITTED" ? "Admitted" : pr.currentStatus === "DISCHARGED" ? "Discharged" : pr.currentStatus}
              </div>
            </div>
          </div>
        </div>

        {pr.visitHistory && pr.visitHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock size={13} /> Visit History ({pr.visitHistory.length})
            </h3>
            {pr.visitHistory.map((v: any) => {
              const isExpanded = expandedVisit === v.id;
              return (
                <div key={v.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedVisit(isExpanded ? null : v.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={13} className="text-[#0a2e1a]/40 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-700">
                          {new Date(v.date).toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {v.diagnosis && <p className="text-[11px] text-slate-500 mt-0.5">{v.diagnosis}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.doctorName && <span className="text-[10px] text-slate-400">Dr. {v.doctorName}</span>}
                      <ChevronDown size={14} className={"text-slate-400 transition-transform " + (isExpanded ? "rotate-180" : "")} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      {v.symptoms && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Presenting Complaint</p><p className="text-sm text-slate-700">{v.symptoms}</p></div>}
                      {v.historyOfPresentIllness && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">History of Presenting Illness</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.historyOfPresentIllness}</p></div>}
                      {v.diagnosis && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnosis</p><p className="text-sm font-medium text-slate-700">{v.diagnosis}</p></div>}
                      {v.differentialDiagnosis && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Differential Diagnosis</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.differentialDiagnosis}</p></div>}
                      {v.assessment && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assessment</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.assessment}</p></div>}
                      {v.treatmentPlan && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Treatment Plan</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.treatmentPlan}</p></div>}
                      {v.physicalExamination && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Physical Examination</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.physicalExamination}</p></div>}
                      {v.pastMedicalHistory && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Past Medical History</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.pastMedicalHistory}</p></div>}
                      {v.reviewOfOtherSystems && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Review of Other Systems</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.reviewOfOtherSystems}</p></div>}
                      {v.notes && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Clinical Notes</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{v.notes}</p></div>}
                      {v.doctorSignature && <div className="border-t border-slate-50 pt-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Doctor's Signature</p><p className="text-sm italic text-slate-600" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, sans-serif" }}>{v.doctorSignature}</p></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(!pr.visitHistory || pr.visitHistory.length === 0) && (
          <div className="py-16 text-center">
            <ClipboardList size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No visit records found</p>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Doctor Records ({filtered.length})</h2>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient name, number, or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      )}

      {loadError && !loading && (
        <div className="py-16 text-center">
          <AlertCircle size={36} className="mx-auto text-red-300 mb-3" />
          <p className="text-sm font-medium text-red-500">Failed to load records</p>
          <p className="text-xs text-slate-400 mt-1">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div className="py-16 text-center">
          <ClipboardList size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-400">{search ? "No patients match your search" : "No records found"}</p>
          <p className="text-xs text-slate-300 mt-1">{search ? "Try a different name or number" : "Patient records will appear after consultations"}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((p: any) => (
            <div
              key={p.id}
              onClick={() => setSelectedPatientRecords(p)}
              className="bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0a2e1a]/10 flex items-center justify-center text-sm font-bold text-[#0a2e1a] flex-shrink-0">
                  {p.firstName?.[0]}{p.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{p.lastName}, {p.firstName}</span>
                    <span className="text-[10px] font-mono text-[#0a2e1a]/60">{p.patientNumber}</span>
                    {p.wasAdmitted && <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">Admitted</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{p.gender === "MALE" ? "Male" : "Female"}</span>
                    <span>{p.age} yrs</span>
                    <span>{p.visitCount} visit{p.visitCount !== 1 ? "s" : ""}</span>
                    <span>{p.wasAdmitted ? "| Admitted" : ""}</span>
                    <span className={p.wasAdmitted ? "" : ""}>{p.wasAdmitted ? "" : "|"} Last: {new Date(p.lastVisitDate).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  {p.diagnosis && (
                    <p className="text-xs text-slate-600 mt-1.5 truncate">
                      <span className="font-semibold text-slate-500">Diagnosis:</span> {p.diagnosis}
                    </p>
                  )}
                  {p.chiefComplaint && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      <span className="font-semibold text-slate-400">Complaint:</span> {p.chiefComplaint}
                    </p>
                  )}
                </div>
                <ChevronDown size={14} className="text-slate-300 -rotate-90 flex-shrink-0 mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Register Patient Modal ────────────────────────────────────────────────

function RegisterPatientModal({
  show,
  onClose,
  onSubmit,
  formData,
  setFormData,
  submitting,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    firstName: string;
    lastName: string;
    age: string;
    ageUnit: string;
    gender: string;
    phone: string;
    address: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    firstName: string;
    lastName: string;
    age: string;
    ageUnit: string;
    gender: string;
    phone: string;
    address: string;
  }>>;
  submitting: boolean;
}) {
  if (!show) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fields = [
    { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "e.g., John" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Okello" },
    { id: "age", label: "Age", type: "number", required: true, placeholder: "", hasAgeToggle: true },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"] },
    { id: "phone", label: "Phone Number", type: "tel", required: false, placeholder: "e.g., 0770000000" },
    { id: "address", label: "Residential Address", type: "textarea", required: false, colSpan: "md:col-span-2", placeholder: "Village, District details..." },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Register New Patient</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2">
          {fields.map((field: any) => (
            <div key={field.id} className={field.colSpan || ""}>
              <label className="mb-1 block text-xs font-bold text-slate-600 tracking-wide">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>
              {field.hasAgeToggle ? (
                <div className="flex gap-2">
                  <input type="number" name="age" required min={0}
                    max={formData.ageUnit === "years" ? 150 : 60}
                    placeholder={formData.ageUnit === "years" ? "e.g., 25" : "e.g., 8"}
                    value={formData.age} onChange={handleInputChange}
                    className="flex-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-green-800" />
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
                    <button type="button"
                      onClick={() => setFormData((p) => ({ ...p, ageUnit: "years", age: p.ageUnit === "months" ? "" : p.age }))}
                      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        formData.ageUnit === "years"
                          ? "bg-green-800 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      Years
                    </button>
                    <button type="button"
                      onClick={() => setFormData((p) => ({ ...p, ageUnit: "months", age: p.ageUnit === "years" ? "" : p.age }))}
                      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        formData.ageUnit === "months"
                          ? "bg-green-800 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      Months
                    </button>
                  </div>
                </div>
              ) : field.type === "select" ? (
                <select name={field.id} required={field.required} value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white transition focus:border-green-800">
                  <option value="">Select Option</option>
                  {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea name={field.id} rows={3} required={field.required} placeholder={field.placeholder}
                  value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none transition focus:border-green-800" />
              ) : (
                <input type={field.type} name={field.id} required={field.required} placeholder={field.placeholder}
                  value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-green-800" />
              )}
            </div>
          ))}
          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider bg-green-800 hover:bg-green-700 transition-all disabled:opacity-50">
              {submitting ? "Saving..." : "Register Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Patient Modal ────────────────────────────────────────────────────

function EditPatientModal({
  show,
  onClose,
  onSubmit,
  formData,
  setFormData,
  submitting,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    firstName: string;
    lastName: string;
    age: string;
    ageUnit: string;
    gender: string;
    phone: string;
    address: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    firstName: string;
    lastName: string;
    age: string;
    ageUnit: string;
    gender: string;
    phone: string;
    address: string;
  }>>;
  submitting: boolean;
}) {
  if (!show) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fields = [
    { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "e.g., John" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Okello" },
    { id: "age", label: "Age", type: "number", required: true, placeholder: "", hasAgeToggle: true },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"] },
    { id: "phone", label: "Phone Number", type: "tel", required: false, placeholder: "e.g., 0770000000" },
    { id: "address", label: "Residential Address", type: "textarea", required: false, colSpan: "md:col-span-2", placeholder: "Village, District details..." },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Edit Patient Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2">
          {fields.map((field: any) => (
            <div key={field.id} className={field.colSpan || ""}>
              <label className="mb-1 block text-xs font-bold text-slate-600 tracking-wide">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>
              {field.hasAgeToggle ? (
                <div className="flex gap-2">
                  <input type="number" name="age" required min={0}
                    max={formData.ageUnit === "years" ? 150 : 60}
                    placeholder={formData.ageUnit === "years" ? "e.g., 25" : "e.g., 8"}
                    value={formData.age} onChange={handleInputChange}
                    className="flex-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-green-800" />
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
                    <button type="button"
                      onClick={() => setFormData((p) => ({ ...p, ageUnit: "years", age: p.ageUnit === "months" ? "" : p.age }))}
                      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        formData.ageUnit === "years"
                          ? "bg-green-800 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      Years
                    </button>
                    <button type="button"
                      onClick={() => setFormData((p) => ({ ...p, ageUnit: "months", age: p.ageUnit === "years" ? "" : p.age }))}
                      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        formData.ageUnit === "months"
                          ? "bg-green-800 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      Months
                    </button>
                  </div>
                </div>
              ) : field.type === "select" ? (
                <select name={field.id} required={field.required} value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white transition focus:border-green-800">
                  <option value="">Select Option</option>
                  {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea name={field.id} rows={3} required={field.required} placeholder={field.placeholder}
                  value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none transition focus:border-green-800" />
              ) : (
                <input type={field.type} name={field.id} required={field.required} placeholder={field.placeholder}
                  value={(formData as any)[field.id]} onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-green-800" />
              )}
            </div>
          ))}
          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider bg-green-800 hover:bg-green-700 transition-all disabled:opacity-50">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────



export default function DoctorDashboard() {

  const router = useRouter();

  const [doctorName, setDoctorName] = useState("");

  const [staffId, setStaffId] = useState<number>(0);

  const [user, setUser] = useState<any>(null);

  const [activeSection, setActiveSection] = useState("queue");

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<DashboardPatient | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [showAntenatal, setShowAntenatal] = useState(false);
  const [queueSearch, setQueueSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Registration modal state ──────────────────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    firstName: "", lastName: "", age: "", ageUnit: "years",
    gender: "", phone: "", address: "",
  });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regToast, setRegToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Edit patient state ──────────────────────────────────────────────────────
  const [editPatient, setEditPatient] = useState<DashboardPatient | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", age: "", ageUnit: "years",
    gender: "", phone: "", address: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);



  // Auth check

  useEffect(() => {

    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!stored) { router.push("/login"); return; }

    try {

      const u = JSON.parse(stored);

      if (u.role !== "DOCTOR") { router.push("/login"); return; }

      setUser(u);

      setDoctorName(u.fullName || u.username || "Doctor");

      setStaffId(u.staffId || u.staff?.id || u.id);

    } catch { router.push("/login"); }

  }, [router]);



  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (staffId > 0) params.set("doctorId", String(staffId));
      const res = await fetch(`/api/doctor/dashboard?${params}`);
      if (res.ok) {
        const data: DashboardData = await res.json();
        setDashboardData(data);
        setFetchError(null);
      } else {
        const errBody = await res.json().catch(() => ({}));
        setFetchError(errBody?.error || `Server error (${res.status})`);
      }
    } catch (err: any) {
      setFetchError(err?.message || "Connection error");
    }
  }, [staffId]);


  useEffect(() => {
    if (staffId <= 0) return;

    fetchData();

    pollingRef.current = setInterval(fetchData, 15_000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };

  }, [fetchData, staffId]);

  // ── Auto-dismiss registration toast ─────────────────────────────────────
  useEffect(() => {
    if (regToast) {
      const t = setTimeout(() => setRegToast(null), regToast.type === "success" ? 3000 : 5000);
      return () => clearTimeout(t);
    }
  }, [regToast]);



  const handleLogout = async () => {

    localStorage.removeItem("user");

    sessionStorage.removeItem("user");

    await fetch("/api/logout", { method: "POST" }).catch(() => {});

    router.push("/login");

  };


  // ── Register patient directly from doctor page ──────────────────────────
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    try {
      const res = await fetch("/api/doctor/register-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setShowRegisterModal(false);
      setRegForm({ firstName: "", lastName: "", age: "", ageUnit: "years", gender: "", phone: "", address: "" });

      // Add the newly registered patient to the queue immediately without
      // waiting for the dashboard refresh (which can be blocked by pgBouncer
      // connection contention).
      const { patient, encounterId } = data;
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          patients: [
            {
              id: patient.id,
              encounterId,
              patientNumber: patient.patientNumber,
              firstName: patient.firstName,
              lastName: patient.lastName,
              gender: patient.gender,
              age: patient.age,
              phoneNumber: patient.phoneNumber ?? null,
              isEmergency: false,
              currentStatus: "AWAITING_DOCTOR",
              lastSharedFromDept: null,
              updatedAt: new Date().toISOString(),
              waitingMinutes: 0,
              waitingDisplay: "Just now",
	              chiefComplaint: "",
	              esiLevel: null,
	              triageCompletedAt: null,
	              source: "Doctor Registration",
              pendingLabs: 0,
              pendingImaging: 0,
              hasAppointment: false,
              appointmentTime: null,
            },
            ...prev.patients,
          ],
        };
      });

      // Fire dashboard refresh in the background for full metrics/updates sync
      fetchData();
      setRegToast({ message: "Patient registered successfully", type: "success" });
    } catch (err: any) {
      setRegToast({ message: err.message || "Registration failed", type: "error" });
    } finally {
      setRegSubmitting(false);
    }
  };





  // ── Edit patient ──────────────────────────────────────────────────────────
  const handleEditPatient = useCallback((patient: DashboardPatient) => {
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: String(patient.age),
      ageUnit: "years",
      gender: patient.gender,
      phone: patient.phoneNumber || "",
      address: "",
    });
    setEditPatient(patient);
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${editPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setEditPatient(null);
      setEditForm({ firstName: "", lastName: "", age: "", ageUnit: "years", gender: "", phone: "", address: "" });

      // Update local queue state with new details
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === editPatient.id
              ? {
                  ...p,
                  firstName: editForm.firstName,
                  lastName: editForm.lastName,
                  age: parseInt(editForm.age, 10),
                  gender: editForm.gender as "MALE" | "FEMALE" | "OTHER",
                  phoneNumber: editForm.phone || null,
                }
              : p
          ),
        };
      });

      setRegToast({ message: "Patient details updated", type: "success" });
    } catch (err: any) {
      setRegToast({ message: err.message || "Update failed", type: "error" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleStartConsultation = async (patient: DashboardPatient) => {

    setSelectedPatient(patient);

  };



  const handleSelectPatient = (patient: DashboardPatient) => { setSelectedPatient(patient); };

  const handleConsultationComplete = () => { setSelectedPatient(null); fetchData(); };

  // ── Recently referred (for undo-referral) ────────────────
  const [recentlyReferred, setRecentlyReferred] = useState<Array<{
    patient: DashboardPatient;
    referredTo: string;
    timestamp: number;
  }>>([]);

  const handlePatientReferred = (patient: DashboardPatient, referredTo: string) => {
    setRecentlyReferred(prev => [{ patient, referredTo, timestamp: Date.now() }, ...prev].slice(0, 10));
  };

  const handleRecallPatient = async (patientId: number, encounterId?: number) => {
    try {
      const res = await fetch("/api/doctor/recall", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, encounterId }),
      });
      if (res.ok) {
        setRecentlyReferred(prev => prev.filter(r => r.patient.id !== patientId));
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Recall failed");
      }
    } catch {
      alert("Network error recalling patient.");
    }
  };

  // Auto-expire recently-referred entries after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentlyReferred(prev => prev.filter(r => Date.now() - r.timestamp < 300000));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Map referral value to display label
  const deptLabel = (value: string) => {
    const map: Record<string, string> = {
      LAB: "Laboratory", SONOGRAPHY: "Sonography", RADIOLOGY: "Radiology",
      DENTIST: "Dentist", PHARMACY: "Pharmacy", NURSE: "Nurse / Midwife",
      TREATMENT: "Treatment Room",
    };
    return map[value] || value;
  };

  const allPatients = dashboardData?.patients ?? [];

  // ── Queue filter (from metric cards) ────────────────────────
  const [queueFilter, setQueueFilter] = useState<FilterKey>(null);

  const activeFilterLabel = queueFilter === "AWAITING_DOCTOR" ? "Waiting"
    : queueFilter === "IN_CONSULTATION" ? "In Consultation"
    : queueFilter === "pendingLabs" ? "Pending Labs"
    : queueFilter === "pendingImaging" ? "Pending Radiology"
    : queueFilter === "appointments" ? "Appointments"
    : null;

  const patients = useMemo(() => {
    let list = allPatients;
    if (queueFilter === "AWAITING_DOCTOR") {
      list = list.filter((p) => p.currentStatus === "AWAITING_DOCTOR");
    } else if (queueFilter === "IN_CONSULTATION") {
      list = list.filter((p) => p.currentStatus === "IN_CONSULTATION");
    } else if (queueFilter === "pendingLabs") {
      list = list.filter((p) => p.pendingLabs > 0);
    } else if (queueFilter === "pendingImaging") {
      list = list.filter((p) => p.pendingImaging > 0);
    } else if (queueFilter === "appointments") {
      list = list.filter((p) => p.hasAppointment);
    }
    if (!queueSearch.trim()) return list;
    const q = queueSearch.toLowerCase().trim();
    return list.filter((p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientNumber.toLowerCase().includes(q)
    );
  }, [allPatients, queueSearch, queueFilter]);

  const metrics = dashboardData?.metrics ?? { awaitingDoctor: 0, inConsultation: 0, completedToday: 0, pendingLabs: 0, pendingRadiology: 0, todayAppointments: 0, admittedPatients: 0 };

  const clinicalUpdates = dashboardData?.clinicalUpdates ?? [];

  if (!user) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#eaf5ee] to-white">

        <div className="text-center"><Loader2 size={32} className="animate-spin text-green-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">Loading...</p></div>

      </div>

    );

  }



  // Content area

  const renderContent = () => {

    if (selectedPatient) {

      return <ConsultationPanel patient={selectedPatient} onBack={() => setSelectedPatient(null)} onComplete={handleConsultationComplete} onReferral={handlePatientReferred} staffId={staffId} staffName={doctorName} />;

    }

    switch (activeSection) {

      case "admitted": return <AdmittedPatientsView onBack={() => setActiveSection("queue")} staffId={staffId} staffName={doctorName} />;

      case "appointments": return <AppointmentsView onBack={() => setActiveSection("queue")} onSelectPatient={handleSelectPatient} />;

      case "records": return <DoctorRecordsView onBack={() => setActiveSection("queue")} staffName={doctorName} />;

      case "history": return <div className="py-10 text-center text-slate-400"><Clock size={48} className="mx-auto text-slate-200 mb-3" /><p className="text-sm font-medium">History</p><p className="text-xs text-slate-300 mt-1">Coming soon</p></div>;

      case "antenatal": return <div className="py-10 text-center text-slate-400"><Baby size={48} className="mx-auto text-slate-200 mb-3" /><p className="text-sm font-medium">Antenatal Patients</p><p className="text-xs text-slate-300 mt-1">Coming soon</p></div>;

      default: return (

        <div>

          <MetricsBar metrics={metrics} onCardClick={(filter) => setQueueFilter(filter)} />

          {/* ── Branded fetch error notice ── */}
          {fetchError && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-600 text-white border border-red-500 shadow-lg">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <p className="text-xs font-semibold flex-1">{fetchError}</p>
              <button onClick={fetchData} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                Retry
              </button>
              <button onClick={() => setFetchError(null)} className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Recently Referred (Recall) Banner ── */}
          {recentlyReferred.length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowLeft size={13} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Recently Referred</span>
                <span className="text-[10px] text-amber-400 ml-auto">Click Recall to bring patient back</span>
              </div>
              <div className="space-y-1.5">
                {recentlyReferred.map((r) => {
                  const expired = Date.now() - r.timestamp > 300000;
                  return (
                    <div key={`rec-${r.patient.id}-${r.timestamp}`}
                      className={`flex items-center justify-between bg-white rounded-xl px-3 py-2 border ${expired ? 'border-slate-200 opacity-60' : 'border-amber-100'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.patient.lastName}, {r.patient.firstName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono">{r.patient.patientNumber}</span>
                          <ArrowRight size={10} className="text-amber-400" />
                          <span className="font-medium text-amber-600">{deptLabel(r.referredTo)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{Math.round((Date.now() - r.timestamp) / 1000)}s ago</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleRecallPatient(r.patient.id, r.patient.encounterId)}
                        disabled={expired}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${expired ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        <ArrowLeft size={12} /> Recall
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="lg:col-span-2">

              <div className="flex items-center justify-between mb-3">

                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {activeFilterLabel
                    ? `${activeFilterLabel} (${patients.length})`
                    : `Patient Queue (${patients.length})`}
                </h2>

                <div className="flex items-center gap-2">
                  {queueFilter && (
                    <button
                      onClick={() => setQueueFilter(null)}
                      className="text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <X size={12} /> Clear Filter
                    </button>
                  )}
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="text-xs px-3 py-2 rounded-xl bg-green-800 text-white font-bold hover:bg-green-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Register Patient
                  </button>
                  <button onClick={fetchData} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
                </div>

              </div>

              {/* ── Queue Search Bar ── */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Search patients by name or number…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-[12px] font-medium outline-none transition focus:border-green-500 focus:bg-white"
                />
                {queueSearch && (
                  <button
                    onClick={() => setQueueSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {dashboardData === null ? (

                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">

                  <Loader2 size={32} className="animate-spin text-green-700 mx-auto mb-3" />

                  <p className="text-sm font-medium text-slate-400">Loading patients...</p>

                </div>

              ) : patients.length === 0 ? (

                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">

                  <Users size={48} className="mx-auto text-slate-200 mb-3" />

                  <p className="text-sm font-medium text-slate-400">No patients in queue</p>

                  <p className="text-xs text-slate-300 mt-1">Patients will appear here after triage</p>

                </div>

              ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {patients.map((p) => (

                    <PatientCard key={p.id} patient={p} onSelect={handleSelectPatient} onStartConsultation={handleStartConsultation} onEdit={handleEditPatient} />

                  ))}

                </div>

              )}

            </div>

            <div>

              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Updates</h2>

              <ClinicalUpdatesPanel updates={clinicalUpdates} onViewPatient={(id) => { const found = patients.find((p) => p.id === id); if (found) setSelectedPatient(found); }} />

            </div>

          </div>

          {/* ── Register Patient Modal ──────────────────────────────── */}
          <RegisterPatientModal
            show={showRegisterModal}
            onClose={() => { setShowRegisterModal(false); setRegForm({ firstName: "", lastName: "", age: "", ageUnit: "years", gender: "", phone: "", address: "" }); }}
            onSubmit={handleRegisterPatient}
            formData={regForm}
            setFormData={setRegForm}
            submitting={regSubmitting}
          />

          {/* ── Edit Patient Modal ──────────────────────────────────── */}
          <EditPatientModal
            show={editPatient !== null}
            onClose={() => { setEditPatient(null); setEditForm({ firstName: "", lastName: "", age: "", ageUnit: "years", gender: "", phone: "", address: "" }); }}
            onSubmit={handleEditSubmit}
            formData={editForm}
            setFormData={setEditForm}
            submitting={editSubmitting}
          />

        </div>

      );

    }

  };



  return (

    <div className="min-h-screen bg-gradient-to-b from-[#eaf5ee] to-white">

      <Sidebar

        doctorName={doctorName}

        queueCount={allPatients.length}

        admittedCount={metrics.admittedPatients}

        appointmentsCount={metrics.todayAppointments}

        activeSection={activeSection}

        onQueue={() => { setActiveSection("queue"); setSelectedPatient(null); }}

        onAdmitted={() => { setActiveSection("admitted"); setSelectedPatient(null); }}

        onRecords={() => setActiveSection("records")}

        onHistory={() => setActiveSection("history")}

        onAppointments={() => { setActiveSection("appointments"); setSelectedPatient(null); }}

        onAntenatal={() => setActiveSection("antenatal")}

        onLogout={handleLogout}

        mobileOpen={mobileOpen}

        onMobileClose={() => setMobileOpen(false)}

      />

      <div className="md:pl-56">

        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between md:hidden">

          <button onClick={() => setMobileOpen(true)} className="p-1 text-slate-500"><Menu size={20} /></button>

          <div className="flex items-center gap-2"><div className="relative w-7 h-7 rounded-full overflow-hidden"><Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" /></div><span className="text-sm font-bold text-[#0a2e1a]">Main Street</span></div>

          <div className="w-8" />

        </div>

        <div className="p-4 sm:p-6 lg:p-8">

          {renderContent()}

        </div>

        {/* ── Registration Toast ────────────────────────────────────── */}
        {regToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-[fadeIn_0.2s_ease-out]">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${
              regToast.type === "success"
                ? "bg-green-800 text-white border-green-700"
                : "bg-red-600 text-white border-red-500"
            }`}>
              {regToast.type === "success" ? (
                <CheckCircle size={18} className="flex-shrink-0" />
              ) : (
                <AlertTriangle size={18} className="flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{regToast.message}</span>
              <button onClick={() => setRegToast(null)} className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>

  );

}
