"use client";

import Image from "next/image";
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import NotificationInbox from "../components/NotificationInbox";
import {
  Users, ClipboardList, Pill, ArrowLeft, CheckCircle,
  LogOut, ChevronRight, AlertTriangle, Stethoscope,
  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Printer,
  Activity, Calendar, Settings, FileText, Menu, Bell,
  Search, Eye, Clock, TrendingUp, Triangle, Heart,
  Syringe, Trash2, Upload, Download, ZoomIn,
  RotateCcw, ChevronLeft, Save, Zap, Award, BarChart3,
  LayoutDashboard, History, BookOpen,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════

type Patient = {
  id: number; patientNumber: string; firstName: string; lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER"; age: number; dateOfBirth: string | null;
  phoneNumber: string | null; address: string | null;
  isEmergency: boolean; currentStatus: string; updatedAt: string;
  Visit: Visit[];
  DentalRecord: DentalRecordSummary[];
};

type Visit = {
  id: number; symptoms: string | null; diagnosis: string | null;
  notes: string | null; createdAt: string;
};

type DentalRecordSummary = {
  id: number; reportNumber: string; chiefComplaint: string | null;
  diagnosis: string | null; treatmentPlan: string | null;
  createdAt: string; status: string;
  Staff: { fullName: string } | null;
  OdontogramFinding: OdontogramFinding[];
  DentalProcedure: DentalProcedureData[];
};

type OdontogramFinding = {
  id: number;
  toothNumber: number; quadrant: number; toothType: string;
  isPresent: boolean; isMissing: boolean; isExtracted: boolean;
  isImpacted: boolean; isUnerupted: boolean;
  cariesMesial: boolean; cariesDistal: boolean;
  cariesBuccal: boolean; cariesLingual: boolean;
  cariesOcclusal: boolean; cariesCervical: boolean;
  cariesExtensive: boolean;
  restorationMesial: boolean; restorationDistal: boolean;
  restorationBuccal: boolean; restorationLingual: boolean;
  restorationOcclusal: boolean; restorationType: string | null;
  hasCrown: boolean; crownType: string | null;
  isBridgeAbutment: boolean; bridgePONTIC: boolean;
  hasImplant: boolean; implantType: string | null;
  hasRootCanal: boolean; rootCanalCompleted: boolean;
  hasFracture: boolean; fractureType: string | null;
  hasMobility: boolean; mobilityGrade: number | null;
  bleedingOnProbing: boolean;
  furcationInvolvement: boolean;
  notes: string | null;
  [key: string]: any;
};

type DentalProcedureData = {
  id?: number;
  procedureType: string; procedureName: string;
  toothNumbers: string | null; arch: string | null;
  diagnosis: string | null; findings: string | null;
  technique: string | null; materials: string | null;
  complications: string | null; outcome: string | null;
  anaesthesiaType: string | null;
  fee: number | null; isCompleted: boolean;
  performedByName: string | null; notes: string | null;
};

type DashboardStats = {
  waitingPatients: number;
  inConsultation: number;
  todayCompleted: number;
  emergencyCount: number;
  todayProcedures: number;
  followUpCount: number;
  totalRecords: number;
  proceduresByType: { type: string; count: number }[];
};

type DentalRecordDetail = {
  id: number; reportNumber: string; patientId: number; visitId: number | null;
  staffId: number | null; chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  pastDentalHistory: string | null; medicalHistory: string | null;
  allergies: string | null;
  temperature: number | null; bpSystolic: number | null;
  bpDiastolic: number | null; heartRate: number | null;
  respiratoryRate: number | null; spo2: number | null;
  weight: number | null;
  clinicalExamination: string | null; extraoralExam: string | null;
  intraoralExam: string | null; periodontalFindings: string | null;
  oralHygieneAssessment: string | null;
  diagnosis: string | null; icdCodes: string | null;
  treatmentPlan: string | null; proceduresPerformed: string | null;
  prescribedMedications: string | null;
  followUpInstructions: string | null;
  reviewAppointment: string | null; reviewNotes: string | null;
  notes: string | null; status: string;
  createdAt: string; updatedAt: string;
  Patient: Patient;
  Staff: { fullName: string; id: number } | null;
  OdontogramFinding: OdontogramFinding[];
  DentalProcedure: DentalProcedureData[];
  DentalImage: DentalImageData[];
};

type DentalImageData = {
  id: number; imageType: string; imageSubType: string | null;
  fileName: string; fileSize: number | null; mimeType: string | null;
  findings: string | null; toothNumbers: string | null;
  isComparison: boolean; uploadedBy: string | null;
  uploadedAt: string; sortOrder: number; createdAt: string;
};

// ════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════

const ROUTES = [
  { id: "LAB",        label: "Laboratory",      sub: "Send for lab tests",          Icon: Microscope  },
  { id: "SONOGRAPHY", label: "Sonography",       sub: "Imaging & ultrasound",       Icon: Waves       },
  { id: "RADIOLOGY",  label: "Radiology",        sub: "X-ray & scans",              Icon: Radio       },
  { id: "DOCTOR",     label: "Doctor",           sub: "Refer to physician",         Icon: Stethoscope },
  { id: "SPECIALIST", label: "Specialist",       sub: "Refer to specialist",        Icon: Award       },
  { id: "NURSE",      label: "Nurse / Midwife",  sub: "Nursing or ANC care",        Icon: Activity    },
  { id: "PHARMACY",   label: "Pharmacy",         sub: "Collect prescription",       Icon: Pill        },
  { id: "CASHIER",    label: "Cashier",          sub: "Settle bill",                Icon: CreditCard  },
  { id: "DISCHARGE",  label: "Discharge",        sub: "Home with instructions",     Icon: Home        },
];

const TOOTH_NAMES: Record<number, string> = {
  1:"3rd Molar (Wisdom)",2:"2nd Molar",3:"1st Molar",4:"2nd Premolar",5:"1st Premolar",
  6:"Canine (Cuspid)",7:"Lateral Incisor",8:"Central Incisor",
  9:"Central Incisor",10:"Lateral Incisor",11:"Canine (Cuspid)",
  12:"1st Premolar",13:"2nd Premolar",14:"1st Molar",15:"2nd Molar",16:"3rd Molar (Wisdom)",
  17:"3rd Molar (Wisdom)",18:"2nd Molar",19:"1st Molar",20:"2nd Premolar",
  21:"1st Premolar",22:"Canine (Cuspid)",23:"Lateral Incisor",24:"Central Incisor",
  25:"Central Incisor",26:"Lateral Incisor",27:"Canine (Cuspid)",
  28:"1st Premolar",29:"2nd Premolar",30:"1st Molar",31:"2nd Molar",32:"3rd Molar (Wisdom)",
};

const QUADRANT_LABELS = ["UR (Upper Right)", "UL (Upper Left)", "LL (Lower Left)", "LR (Lower Right)"];

const PROCEDURE_TYPES = [
  { value: "EXTRACTION", label: "Extraction" },
  { value: "FILLING", label: "Filling / Restoration" },
  { value: "SCALING", label: "Scaling & Polishing" },
  { value: "RCT", label: "Root Canal Treatment" },
  { value: "CROWN", label: "Crown" },
  { value: "BRIDGE", label: "Bridge" },
  { value: "DENTURE", label: "Denture" },
  { value: "IMPLANT", label: "Implant" },
  { value: "PERIODONTAL", label: "Periodontal Treatment" },
  { value: "ORAL_SURGERY", label: "Oral Surgery" },
  { value: "PROPHYLAXIS", label: "Prophylaxis / Cleaning" },
  { value: "FLUORIDE", label: "Fluoride Treatment" },
  { value: "SEALANT", label: "Sealant" },
  { value: "BLEACHING", label: "Bleaching / Whitening" },
  { value: "VENEER", label: "Veneer" },
  { value: "OTHER", label: "Other" },
];

const IMAGE_TYPES = [
  { value: "INTRAORAL", label: "Intraoral Photograph" },
  { value: "PANORAMIC", label: "Panoramic X-Ray (OPG)" },
  { value: "BITEWING", label: "Bitewing X-Ray" },
  { value: "PERIAPICAL", label: "Periapical X-Ray" },
  { value: "CEPHALOMETRIC", label: "Cephalometric X-Ray" },
  { value: "CBCT", label: "CBCT Scan" },
  { value: "OCCLUSAL", label: "Occlusal X-Ray" },
  { value: "EXTRAORAL", label: "Extraoral Photograph" },
  { value: "OTHER", label: "Other" },
];

// ════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════

const initials  = (p: Patient) => `${p.firstName[0]}${p.lastName[0]}`.toUpperCase();
const fmtDate   = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-UG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const waitLabel = (upd: string) => {
  const m = Math.floor((Date.now() - new Date(upd).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const genderLabel = (g: string) => g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Other";
const genderIcon = (g: string) => g === "MALE" ? "♂" : g === "FEMALE" ? "♀" : "⚧";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800", "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",   "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];
const avatarCls = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const TOOTH_COLORS_BG: Record<string, string> = {
  normal: "bg-white hover:bg-slate-100",
  caries: "bg-amber-200 hover:bg-amber-300 border-amber-500",
  restoration: "bg-blue-200 hover:bg-blue-300 border-blue-500",
  crown: "bg-purple-200 hover:bg-purple-300 border-purple-500",
  missing: "bg-slate-100 text-slate-300 border-dashed",
  extracted: "bg-red-100 text-red-300 border-red-200 border-dashed",
  rootCanal: "bg-pink-200 hover:bg-pink-300 border-pink-500",
  implant: "bg-teal-200 hover:bg-teal-300 border-teal-500",
  fracture: "bg-orange-200 hover:bg-orange-300 border-orange-500",
  bridge: "bg-indigo-200 hover:bg-indigo-300 border-indigo-500",
};

function getToothDiagnosisClass(f: OdontogramFinding | undefined): string {
  if (!f) return "normal";
  if (f.isExtracted) return "extracted";
  if (f.isMissing) return "missing";
  if (f.hasImplant) return "implant";
  if (f.hasCrown || f.isBridgeAbutment || f.bridgePONTIC) return "bridge";
  if (f.hasRootCanal) return "rootCanal";
  if (f.hasFracture) return "fracture";
  if (f.cariesMesial || f.cariesDistal || f.cariesBuccal || f.cariesLingual || f.cariesOcclusal || f.cariesCervical || f.cariesExtensive) return "caries";
  if (f.restorationMesial || f.restorationDistal || f.restorationBuccal || f.restorationLingual || f.restorationOcclusal) return "restoration";
  return "normal";
}

// ════════════════════════════════════════════════════════════════════════
// ODONTOGRAM COMPONENT
// ════════════════════════════════════════════════════════════════════════

function OdontogramView({
  findings, onToggle, readOnly, activeFinding, setActiveFinding,
}: {
  findings: Record<number, OdontogramFinding>;
  onToggle?: (toothNum: number) => void;
  readOnly?: boolean;
  activeFinding?: number | null;
  setActiveFinding?: (n: number | null) => void;
}) {
  // 28-tooth odontogram (excludes wisdom teeth #1, #16, #17, #32)
  const upperRight = [2,3,4,5,6,7,8];
  const upperLeft  = [9,10,11,12,13,14,15];
  const lowerLeft  = [18,19,20,21,22,23,24];
  const lowerRight = [25,26,27,28,29,30,31];

  function renderTooth(n: number) {
    const f = findings[n];
    const diagClass = readOnly ? getToothDiagnosisClass(f) : (onToggle ? "cursor-pointer" : "normal");
    const isActive = activeFinding === n;
    const cls = readOnly
      ? TOOTH_COLORS_BG[diagClass] || TOOTH_COLORS_BG.normal
      : (isActive ? "bg-rose-500 text-white border-rose-600 shadow-md scale-110 z-10" : TOOTH_COLORS_BG.normal);

    return (
      <button
        key={n}
        onClick={() => {
          if (readOnly && setActiveFinding) {
            setActiveFinding(isActive ? null : n);
          } else if (onToggle) {
            onToggle(n);
          }
        }}
        title={`#${n} — ${TOOTH_NAMES[n] || ""}`}
        className={`w-8 h-10 rounded text-[10px] font-bold border transition-all duration-150 flex flex-col items-center justify-center ${cls}
          ${readOnly ? "" : "hover:border-slate-400"}
          ${diagClass !== "normal" && readOnly ? "border-2 shadow-sm" : "border-slate-200"}`}
      >
        <span>{n}</span>
        {f && readOnly && (
          <span className="text-[6px] leading-none mt-0.5">
            {f.isExtracted ? "✕" : f.isMissing ? "—" : f.hasCrown ? "C" : f.hasImplant ? "I" : f.hasRootCanal ? "R" : f.hasFracture ? "F" : ""}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="select-none">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">Upper Jaw — Right Side</div>
      <div className="flex justify-center gap-0.5 mb-0.5">{upperRight.map(renderTooth)}</div>
      <div className="flex justify-center gap-0.5 mb-2">{upperLeft.map(renderTooth)}</div>

      {/* Central divider */}
      <div className="border-t-2 border-slate-300 mx-4 mb-2"></div>

      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">Lower Jaw — Left Side</div>
      <div className="flex justify-center gap-0.5 mb-0.5">{lowerLeft.map(renderTooth)}</div>
      <div className="flex justify-center gap-0.5 mb-3">{lowerRight.map(renderTooth)}</div>

      {/* Legend (read-only) */}
      {readOnly && (
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[9px] text-slate-400 justify-center">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-300 inline-block"></span> Healthy</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 inline-block"></span> Caries</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-200 border border-blue-400 inline-block"></span> Restoration</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-200 border border-purple-400 inline-block"></span> Crown/Bridge</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-pink-200 border border-pink-400 inline-block"></span> Root Canal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-200 border border-teal-400 inline-block"></span> Implant</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-200 border border-orange-400 inline-block"></span> Fracture</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 border-dashed inline-block"></span> Extracted</span>
        </div>
      )}
    </div>
  );
}

// Odontogram editor — toggles surfaces
function OdontogramEditor({
  toothNumber, finding, onUpdate, onClose,
}: {
  toothNumber: number;
  finding: OdontogramFinding;
  onUpdate: (updates: Partial<OdontogramFinding>) => void;
  onClose: () => void;
}) {
  const quadrant = toothNumber <= 8 ? 1 : toothNumber <= 16 ? 2 : toothNumber <= 24 ? 3 : 4;
  const quadLabel = QUADRANT_LABELS[quadrant - 1];
  const isUpper = quadrant <= 2;

  const toggleGroup = (group: string, keys: string[]) => {
    // Toggle entire group off if all are true, otherwise set all to true
    const allTrue = keys.every(k => (finding as any)[k]);
    const update: any = {};
    keys.forEach(k => { update[k] = !allTrue; });
    onUpdate(update);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800">Tooth #{toothNumber}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{TOOTH_NAMES[toothNumber]} · {quadLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Tooth Presence */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Tooth Status</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "isMissing", label: "Missing" },
              { key: "isExtracted", label: "Extracted" },
              { key: "isImpacted", label: "Impacted" },
              { key: "isUnerupted", label: "Unerupted" },
              { key: "hasImplant", label: "Implant" },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                (finding as any)[key] ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}>
                <input type="checkbox" checked={(finding as any)[key] || false}
                  onChange={() => onUpdate({ [key]: !(finding as any)[key] })}
                  className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Caries */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Caries</p>
            <button onClick={() => toggleGroup("caries",
              ["cariesMesial","cariesDistal","cariesBuccal","cariesLingual","cariesOcclusal","cariesCervical"])}
              className="text-[10px] text-blue-600 hover:underline">Toggle all</button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: "cariesMesial", label: "Mesial", short: "M" },
              { key: "cariesDistal", label: "Distal", short: "D" },
              { key: "cariesBuccal", label: isUpper ? "Buccal" : "Buccal", short: "B" },
              { key: "cariesLingual", label: isUpper ? "Palatal" : "Lingual", short: isUpper ? "P" : "L" },
            ].map(({ key, label, short }) => (
              <button key={key} onClick={() => onUpdate({ [key]: !(finding as any)[key] })}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  (finding as any)[key] ? "bg-amber-400 text-amber-900 border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:border-amber-300"
                }`}>
                {short}<br /><span className="text-[8px] font-normal">{label}</span>
              </button>
            ))}
            <button onClick={() => onUpdate({ cariesOcclusal: !finding.cariesOcclusal })}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                finding.cariesOcclusal ? "bg-amber-400 text-amber-900 border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:border-amber-300"
              }`}>
              Occl<br /><span className="text-[8px] font-normal">Occlusal</span>
            </button>
            <button onClick={() => onUpdate({ cariesCervical: !finding.cariesCervical })}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                finding.cariesCervical ? "bg-amber-400 text-amber-900 border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:border-amber-300"
              }`}>
              Cerv<br /><span className="text-[8px] font-normal">Cervical</span>
            </button>
            <button onClick={() => onUpdate({ cariesExtensive: !finding.cariesExtensive })}
              className={`col-span-2 py-2 rounded-lg text-xs font-bold border transition-colors ${
                finding.cariesExtensive ? "bg-red-400 text-white border-red-500" : "bg-white text-slate-400 border-slate-200 hover:border-red-300"
              }`}>
              Extensive Caries
            </button>
          </div>
        </div>

        {/* Restorations */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Restorations</p>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { key: "restorationMesial", label: "Mesial", short: "M" },
              { key: "restorationDistal", label: "Distal", short: "D" },
              { key: "restorationBuccal", label: "Buccal", short: "B" },
              { key: "restorationLingual", label: isUpper ? "Palatal" : "Lingual", short: isUpper ? "P" : "L" },
            ].map(({ key, label, short }) => (
              <button key={key} onClick={() => onUpdate({ [key]: !(finding as any)[key] })}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  (finding as any)[key] ? "bg-blue-400 text-white border-blue-500" : "bg-white text-slate-400 border-slate-200 hover:border-blue-300"
                }`}>
                {short}<br /><span className="text-[8px] font-normal">{label}</span>
              </button>
            ))}
            <button onClick={() => onUpdate({ restorationOcclusal: !finding.restorationOcclusal })}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                finding.restorationOcclusal ? "bg-blue-400 text-white border-blue-500" : "bg-white text-slate-400 border-slate-200 hover:border-blue-300"
              }`}>
              Occl<br /><span className="text-[8px] font-normal">Occlusal</span>
            </button>
          </div>
          <select value={finding.restorationType || ""} onChange={e => onUpdate({ restorationType: e.target.value || null })}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200">
            <option value="">Restoration type...</option>
            <option value="AMALGAM">Amalgam</option>
            <option value="COMPOSITE">Composite</option>
            <option value="GLASS_IONOMER">Glass Ionomer</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Crown & Bridge */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Crown & Bridge</p>
          <div className="flex flex-wrap gap-2">
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.hasCrown ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.hasCrown} onChange={() => onUpdate({ hasCrown: !finding.hasCrown })} className="sr-only" />
              Has Crown
            </label>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.isBridgeAbutment ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.isBridgeAbutment} onChange={() => onUpdate({ isBridgeAbutment: !finding.isBridgeAbutment })} className="sr-only" />
              Bridge Abutment
            </label>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.bridgePONTIC ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.bridgePONTIC} onChange={() => onUpdate({ bridgePONTIC: !finding.bridgePONTIC })} className="sr-only" />
              Pontic (False Tooth)
            </label>
          </div>
          {finding.hasCrown && (
            <select value={finding.crownType || ""} onChange={e => onUpdate({ crownType: e.target.value || null })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 mt-2">
              <option value="">Crown type...</option>
              <option value="FULL_METAL">Full Metal</option>
              <option value="PFM">PFM (Porcelain fused to metal)</option>
              <option value="ALL_CERAMIC">All Ceramic</option>
              <option value="ZIRCONIA">Zirconia</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="OTHER">Other</option>
            </select>
          )}
        </div>

        {/* Endodontics */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Endodontics</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "hasRootCanal", label: "Root Canal Treatment" },
              { key: "rootCanalCompleted", label: "RCT Completed" },
              { key: "rootCanalTreated", label: "Previously Treated" },
              { key: "postAndCore", label: "Post & Core" },
              { key: "periapicalPathology", label: "Periapical Pathology" },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
                (finding as any)[key] ? "bg-pink-600 text-white border-pink-600" : "bg-white text-slate-500 border-slate-200"
              }`}>
                <input type="checkbox" checked={(finding as any)[key] || false}
                  onChange={() => onUpdate({ [key]: !(finding as any)[key] })}
                  className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Fracture & Trauma */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Fracture & Trauma</p>
          <div className="flex flex-wrap gap-2">
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.hasFracture ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.hasFracture} onChange={() => onUpdate({ hasFracture: !finding.hasFracture })} className="sr-only" />
              Fracture
            </label>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.isTraumatized ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.isTraumatized} onChange={() => onUpdate({ isTraumatized: !finding.isTraumatized })} className="sr-only" />
              Traumatized
            </label>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.hasMobility ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.hasMobility} onChange={() => onUpdate({ hasMobility: !finding.hasMobility })} className="sr-only" />
              Mobility
            </label>
          </div>
          {finding.hasFracture && (
            <select value={finding.fractureType || ""} onChange={e => onUpdate({ fractureType: e.target.value || null })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 mt-2">
              <option value="">Fracture type...</option>
              <option value="CRAZE_LINE">Craze Line</option>
              <option value="CUSP">Cusp Fracture</option>
              <option value="CRACKED_TOOTH">Cracked Tooth</option>
              <option value="SPLIT_TOOTH">Split Tooth</option>
              <option value="VERTICAL_ROOT">Vertical Root Fracture</option>
              <option value="CROWN_FRACTURE">Crown Fracture</option>
              <option value="ROOT_FRACTURE">Root Fracture</option>
            </select>
          )}
          {finding.hasMobility && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-slate-500">Mobility Grade:</span>
              {[0,1,2,3].map(g => (
                <button key={g} onClick={() => onUpdate({ mobilityGrade: finding.mobilityGrade === g ? null : g })}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border ${
                    finding.mobilityGrade === g ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-400 border-slate-200"
                  }`}>{g}</button>
              ))}
            </div>
          )}
        </div>

        {/* Periodontal */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Periodontal</p>
          <div className="flex flex-wrap gap-2">
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.bleedingOnProbing ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.bleedingOnProbing}
                onChange={() => onUpdate({ bleedingOnProbing: !finding.bleedingOnProbing })} className="sr-only" />
              Bleeding on Probing
            </label>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
              finding.furcationInvolvement ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-500 border-slate-200"
            }`}>
              <input type="checkbox" checked={finding.furcationInvolvement}
                onChange={() => onUpdate({ furcationInvolvement: !finding.furcationInvolvement })} className="sr-only" />
              Furcation Involvement
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-semibold">Notes</p>
          <textarea value={finding.notes || ""} onChange={e => onUpdate({ notes: e.target.value || null })}
            rows={2} placeholder="Notes about this tooth..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 resize-none" />
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════════════

function Sidebar({
  dentistName, queueCount, onNav, activeView, onLogout,
}: {
  dentistName: string; queueCount: number;
  onNav: (view: string) => void; activeView: string;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "queue", label: "Patient Queue", Icon: Users, badge: queueCount },
    { id: "records", label: "Dental Records", Icon: History },
    { id: "appointments", label: "Appointments", Icon: Calendar },
  ];

  const inner = (
    <>
      {/* Logo & Brand */}
      <div className="px-4 py-4 border-b border-white/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/15 flex-shrink-0 ring-2 ring-white/20">
            <Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="text-white text-sm font-bold leading-tight">Main Street</div>
            <div className="text-[#b8dfc8] text-[10px] font-medium tracking-wide">Dental Department</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, Icon, badge }) => (
          <button key={id} onClick={() => { onNav(id); setMobileOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeView === id
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}>
            <Icon size={16} />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-auto bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}

        {/* Notification Inbox — directly under Appointments */}
        <div className="pt-1">
to          <NotificationInbox department="Dentist" sidebar={true} />
        </div>
      </nav>

      {/* Bottom: User info + Logout */}
      <div className="px-3 pb-4 border-t border-white/15 pt-3">
        <div className="px-2 mb-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {dentistName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-medium truncate leading-tight">{dentistName}</div>
            <div className="text-white/50 text-[10px] font-medium">Dentist</div>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-300 text-sm font-medium hover:bg-white/10 hover:text-rose-200 transition-all duration-150">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger — visible below lg */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 bg-[#00803F] text-white p-2.5 rounded-xl shadow-lg hover:bg-[#006633] transition-colors">
        <Menu size={20} />
      </button>

      {/* Desktop sidebar — always visible lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 bg-[#00803F] flex-col z-50 shadow-xl">
        {inner}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-[#00803F] flex flex-col z-50 shadow-2xl animate-slide-in">
            {inner}
          </aside>
        </>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DENTAL RECORDS BROWSER
// ════════════════════════════════════════════════════════════════════════

function DentalRecordsView({
  onOpenRecord, onViewRecord,
}: {
  onOpenRecord: (patient: Patient) => void;
  onViewRecord: (recordId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/dental/patients-by-dentist?${params}`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const loadPatientRecords = async (patient: any) => {
    setSelectedPatient(patient);
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/dental/records?patientId=${patient.id}`);
      const data = await res.json();
      setPatientRecords(data.records || []);
    } catch {} finally {
      setRecordsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, patient number, phone, diagnosis..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 placeholder:text-slate-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* Patient list */}
        <div className="bg-white rounded-xl border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Patients with Dental History</span>
            <span className="text-xs text-slate-400">{patients.length} found</span>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading...
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <BookOpen size={32} className="mx-auto mb-2 text-slate-200" />
              <p>No dental records found</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
              {patients.map((p: any) => (
                <li key={p.id} onClick={() => loadPatientRecords(p)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedPatient?.id === p.id ? "bg-emerald-50" : ""
                  }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarCls(p.id)}`}>
                    {`${p.firstName[0]}${p.lastName[0]}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">{p._count.DentalRecord} visits</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {p.patientNumber} · {p.age} yrs · {genderLabel(p.gender)}
                    </div>
                    {p.DentalRecord[0] && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Last: {fmtDate(p.DentalRecord[0].createdAt)} — {p.DentalRecord[0].diagnosis || p.DentalRecord[0].treatmentPlan || "No diagnosis"}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Patient records detail */}
        <div className="bg-white rounded-xl border border-slate-100">
          {!selectedPatient ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <History size={32} className="mx-auto mb-2 text-slate-200" />
              <p>Select a patient to view their dental records</p>
            </div>
          ) : recordsLoading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading records...
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                    <span className="text-xs text-slate-400 ml-2">{selectedPatient.patientNumber}</span>
                  </div>
                  <button onClick={() => onOpenRecord(selectedPatient)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#00803F] text-white hover:bg-[#006633] transition-colors">
                    <Plus size={12} /> New consultation
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                {patientRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    <p>No dental records for this patient</p>
                  </div>
                ) : patientRecords.map((r: any) => (
                  <li key={r.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {r.reportNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">{fmtDate(r.createdAt)}</span>
                        </div>
                        {r.diagnosis && <p className="text-xs text-slate-700 mt-1.5 font-medium">{r.diagnosis}</p>}
                        {r.treatmentPlan && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{r.treatmentPlan}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                          <span>{r.DentalProcedure?.length || 0} procedures</span>
                          <span>{r._count?.DentalImage || 0} images</span>
                          {r.Staff && <span>by {r.Staff.fullName}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => onViewRecord(r.id)}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium">
                          View
                        </button>
                        <button onClick={() => window.open(`/api/dental/report/${r.id}`, '_blank')}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium">
                          <Printer size={11} className="inline mr-0.5" /> Print
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ════════════════════════════════════════════════════════════════════════

function DashboardView({ stats, dentistName }: { stats: DashboardStats | null; dentistName: string }) {
  const statCards = stats ? [
    { label: "Waiting Patients", value: stats.waitingPatients, color: "text-slate-800", icon: Users, sub: "Awaiting dental review" },
    { label: "In Consultation", value: stats.inConsultation, color: "text-amber-600", icon: Activity, sub: "Currently being seen" },
    { label: "Today Completed", value: stats.todayCompleted, color: "text-emerald-600", icon: CheckCircle, sub: "Consultations done" },
    { label: "Emergency", value: stats.emergencyCount, color: stats.emergencyCount > 0 ? "text-rose-600" : "text-slate-800", icon: AlertTriangle, sub: "Urgent cases" },
    { label: "Procedures Today", value: stats.todayProcedures, color: "text-blue-600", icon: Syringe, sub: "Procedures performed" },
    { label: "Follow-ups", value: stats.followUpCount, color: "text-violet-600", icon: Clock, sub: "Pending reviews" },
    { label: "Total Records", value: stats.totalRecords, color: "text-slate-800", icon: FileText, sub: "All-time dental records" },
  ] : [];

  const emptyFindings: Record<number, OdontogramFinding> = {};

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-[#00803F] to-[#00A651] rounded-2xl px-7 py-6 text-white shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {dentistName} <span className="text-[#00cc66]">👋</span></h1>
        <p className="text-[#8fbc9f] text-sm mt-1.5">
          {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="text-[#00cc66] text-xs mt-1">
          {stats?.waitingPatients ? `${stats.waitingPatients} patient(s) waiting for dental review.` : "No patients waiting."}
          {stats?.inConsultation ? ` ${stats.inConsultation} currently in consultation.` : ""}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">{label}</div>
              <Icon size={14} className="text-slate-300" />
            </div>
            <div className={`text-3xl font-semibold mt-1 ${color}`}>{value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Odontogram Reference (28-tooth) + Procedure breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* Odontogram Reference */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-3">Reference Odontogram (28 Teeth)</p>
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30">
            <OdontogramView findings={emptyFindings} readOnly={false} />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Tap any tooth to explore — full editable odontogram available during consultation
          </p>
        </div>

        {/* Procedure breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-3">Procedure Breakdown (Last 30 Days)</p>
          {stats && stats.proceduresByType.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {stats.proceduresByType.map((p: any) => {
                const proc = PROCEDURE_TYPES.find(pt => pt.value === p.type);
                return (
                  <div key={p.type} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-600">{proc?.label || p.type}</span>
                    <span className="text-xs font-bold text-slate-800">{p.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No procedures recorded this month</p>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-700 mb-2">Quick Actions</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Patients can be received from: <strong>Reception, Nurse/Midwife, Doctor, Emergency, Specialist</strong> — and any authorized department.
          Route patients to: <strong>Laboratory, Radiology, Sonography, Pharmacy, Cashier, Nurse/Midwife, Doctor, Specialist, or Discharge</strong>.
          All transfers automatically update patient status, department queue, notifications, and patient timeline.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN DENTIST PAGE
// ════════════════════════════════════════════════════════════════════════

export default function DentistPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dentistName, setDentistName] = useState("Dentist");
  const [staffId, setStaffId] = useState<number | null>(null);

  // View management
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [active, setActive] = useState<Patient | null>(null);
  const [tab, setTab] = useState<"exam" | "clinical" | "procedures" | "imaging" | "history">("exam");
  const [route, setRoute] = useState<string>("CASHIER");
  const [isPending, startTransition] = useTransition();

  // Clinical form state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [pastDentalHistory, setPastDentalHistory] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Vital signs
  const [temperature, setTemperature] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");

  // Clinical exam
  const [clinicalExamination, setClinicalExamination] = useState("");
  const [extraoralExam, setExtraoralExam] = useState("");
  const [intraoralExam, setIntraoralExam] = useState("");
  const [periodontalFindings, setPeriodontalFindings] = useState("");
  const [oralHygieneAssessment, setOralHygieneAssessment] = useState("");

  // Odontogram
  const [odontogramFindings, setOdontogramFindings] = useState<Record<number, OdontogramFinding>>({});
  const [activeTooth, setActiveTooth] = useState<number | null>(null);
  const [showOdontogramEditor, setShowOdontogramEditor] = useState(false);

  // Procedures
  const [procedures, setProcedures] = useState<DentalProcedureData[]>([]);
  const [showProcedureForm, setShowProcedureForm] = useState(false);

  // Images
  const [images, setImages] = useState<any[]>([]);
  const [viewingImage, setViewingImage] = useState<any>(null);

  // Records browsing
  const [viewingRecord, setViewingRecord] = useState<DentalRecordDetail | null>(null);

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [apptFilter, setApptFilter] = useState("all");

  // Misc
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prescribedMedications, setPrescribedMedications] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ══════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ══════════════════════════════════════════════════════════════════════

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dental/stats");
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch {}
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/dental");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (Array.isArray(data)) setPatients(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  // Mount effects
  useEffect(() => {
    fetchStats();
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setDentistName(user.username || "Dentist");
        fetch("/api/staffcreate").then(r => r.json()).then((data: any) => {
          const staffList = data?.staff;
          if (Array.isArray(staffList)) {
            const match = staffList.find((s: any) => s.userId === user.id);
            if (match) setStaffId(match.id);
          }
        }).catch(() => {});
      } catch {}
    }
    // Heartbeat
    try {
      const r = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } }
    } catch {}

    const statsInterval = setInterval(fetchStats, 60000);
    const heartbeat = setInterval(() => {
      try {
        const r = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } }
      } catch {}
    }, 120000);
    return () => { clearInterval(statsInterval); clearInterval(heartbeat); };
  }, [fetchStats]);

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 20000);
    return () => clearInterval(interval);
  }, [fetchPatients]);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    const params = new URLSearchParams({ department: "Dentist", date: apptDate });
    if (apptFilter !== "all") params.set("status", apptFilter.toUpperCase());
    try {
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch {} finally {
      setApptLoading(false);
    }
  }, [apptDate, apptFilter]);

  useEffect(() => {
    if (activeView === "appointments") fetchAppointments();
  }, [activeView, fetchAppointments]);

  // ══════════════════════════════════════════════════════════════════════
  // ODONTOGRAM
  // ══════════════════════════════════════════════════════════════════════

  const getDefaultFinding = (toothNum: number): OdontogramFinding => {
    const quadrant = toothNum <= 8 ? 1 : toothNum <= 16 ? 2 : toothNum <= 24 ? 3 : 4;
    const toothType = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].includes(toothNum)
      ? ([8,9,24,25].includes(toothNum) ? "INCISOR" :
         [7,10,23,26].includes(toothNum) ? "INCISOR" :
         [6,11,22,27].includes(toothNum) ? "CANINE" :
         [5,12,21,28].includes(toothNum) ? "PREMOLAR" : "MOLAR")
      : ([24,25].includes(toothNum) ? "INCISOR" :
         [23,26].includes(toothNum) ? "INCISOR" :
         [22,27].includes(toothNum) ? "CANINE" :
         [21,28].includes(toothNum) ? "PREMOLAR" : "MOLAR");
    return {
      id: 0, toothNumber: toothNum, quadrant, toothType,
      isPresent: true, isMissing: false, isExtracted: false,
      isImpacted: false, isUnerupted: false,
      cariesMesial: false, cariesDistal: false, cariesBuccal: false,
      cariesLingual: false, cariesOcclusal: false, cariesCervical: false,
      cariesExtensive: false,
      restorationMesial: false, restorationDistal: false,
      restorationBuccal: false, restorationLingual: false,
      restorationOcclusal: false, restorationType: null,
      hasCrown: false, crownType: null,
      isBridgeAbutment: false, bridgePONTIC: false,
      hasImplant: false, implantType: null,
      hasRootCanal: false, rootCanalCompleted: false,
      hasFracture: false, fractureType: null,
      hasMobility: false, mobilityGrade: null,
      bleedingOnProbing: false,
      furcationInvolvement: false,
      notes: null,
    };
  };

  const toggleOdontogramTooth = (n: number) => {
    if (activeTooth === n) {
      setActiveTooth(null);
      return;
    }
    setActiveTooth(n);
    if (!odontogramFindings[n]) {
      setOdontogramFindings(prev => ({ ...prev, [n]: getDefaultFinding(n) }));
    }
    setShowOdontogramEditor(true);
  };

  const updateOdontogramFinding = (toothNum: number, updates: Partial<OdontogramFinding>) => {
    setOdontogramFindings(prev => ({
      ...prev,
      [toothNum]: { ...prev[toothNum], ...updates },
    }));
  };

  const clearOdontogram = () => {
    setOdontogramFindings({});
    setActiveTooth(null);
    showToast("Odontogram cleared");
  };

  // ══════════════════════════════════════════════════════════════════════
  // PROCEDURES
  // ══════════════════════════════════════════════════════════════════════

  const addProcedure = (proc: DentalProcedureData) => {
    setProcedures(prev => [...prev, proc]);
    setShowProcedureForm(false);
  };

  const removeProcedure = (index: number) => {
    setProcedures(prev => prev.filter((_, i) => i !== index));
  };

  // ══════════════════════════════════════════════════════════════════════
  // IMAGES
  // ══════════════════════════════════════════════════════════════════════

  const uploadImage = async (file: File, imageType: string) => {
    if (!active) return;
    const formData = new FormData();
    formData.append("patientId", String(active.id));
    formData.append("dentalRecordId", "0"); // Will be set after record creation
    formData.append("imageType", imageType);
    formData.append("fileName", file.name);
    formData.append("uploadedBy", dentistName);
    formData.append("file", file);

    try {
      const res = await fetch("/api/dental/images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast("Image uploaded successfully");
        loadImages();
      }
    } catch {
      showToast("Failed to upload image");
    }
  };

  const loadImages = useCallback(async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/dental/images?patientId=${active.id}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch {}
  }, [active]);

  useEffect(() => {
    if (active && tab === "imaging") loadImages();
  }, [active, tab, loadImages]);

  // ══════════════════════════════════════════════════════════════════════
  // PATIENT ACTIONS
  // ══════════════════════════════════════════════════════════════════════

  function openPatient(p: Patient) {
    setActive(p);
    setTab("exam");
    setRoute("CASHIER");
    setActiveView("");

    // Pre-fill from existing data
    setChiefComplaint(p.Visit[0]?.symptoms || "");
    setHistoryOfPresentIllness("");
    setPastDentalHistory("");
    setMedicalHistory("");
    setAllergies("");
    setDiagnosis("");
    setTreatmentPlan("");
    setNotes("");
    setFollowUpInstructions("");
    setFollowUpDate("");
    setTemperature(""); setBpSystolic(""); setBpDiastolic("");
    setHeartRate(""); setRespiratoryRate(""); setSpo2(""); setWeight("");
    setClinicalExamination(""); setExtraoralExam(""); setIntraoralExam("");
    setPeriodontalFindings(""); setOralHygieneAssessment("");
    setOdontogramFindings({});
    setProcedures([]);
    setImages([]);
    setPrescribedMedications("");
    setError(null);

    setPatients(prev => prev.filter(x => x.id !== p.id));
  }

  function markBeingSeen() {
    if (!active) return;
    fetch("/api/dental", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: active.id, dentistName }),
    }).then(() => {
      showToast(`${active.firstName} ${active.lastName} — now marked as Being Seen`);
    }).catch(() => {});
  }

  function completeConsultation() {
    if (!active) return;
    if (!route) { setError("Select where to route this patient before completing."); return; }
    setError(null);

    startTransition(async () => {
      const payload: any = {
        patientId: active.id,
        staffId,
        dentistName,
        routeTo: route,
        chiefComplaint,
        historyOfPresentIllness,
        pastDentalHistory,
        medicalHistory,
        allergies,
        diagnosis,
        treatmentPlan,
        notes,
        followUpInstructions,
        reviewAppointment: followUpDate || null,
        prescribedMedications: prescribedMedications || null,

        // Vital signs
        temperature: temperature ? parseFloat(temperature) : null,
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
        heartRate: heartRate ? parseInt(heartRate) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
        spo2: spo2 ? parseInt(spo2) : null,
        weight: weight ? parseFloat(weight) : null,

        // Clinical exam
        clinicalExamination,
        extraoralExam,
        intraoralExam,
        periodontalFindings,
        oralHygieneAssessment,
      };

      // Add odontogram findings
      const findingsArray = Object.values(odontogramFindings);
      if (findingsArray.length > 0) {
        payload.odontogramFindings = findingsArray;
      }

      // Add procedures
      if (procedures.length > 0) {
        payload.procedures = procedures.map(p => ({
          ...p,
          performedByName: dentistName,
        }));
      }

      try {
        const res = await fetch("/api/dental", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }

        const routeLabel = ROUTES.find(r => r.id === route)?.label ?? route;
        setPatients(prev => prev.filter(p => p.id !== active.id));
        setActive(null);
        setActiveView("dashboard");
        fetchStats();
        showToast(`${active.firstName} ${active.lastName} — Consultation completed. Routed to ${routeLabel}. Report: ${data.reportNumber}`);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // VIEW RECORD (history)
  // ══════════════════════════════════════════════════════════════════════

  const viewRecord = async (recordId: number) => {
    try {
      const res = await fetch(`/api/dental/records?id=${recordId}`);
      const data = await res.json();
      if (data.record) {
        setViewingRecord(data.record);
        setActiveView("");
      }
    } catch {}
  };

  // ══════════════════════════════════════════════════════════════════════
  // PRINT
  // ══════════════════════════════════════════════════════════════════════

  function printReport() {
    window.print();
  }

  // ══════════════════════════════════════════════════════════════════════
  // OVERLAYS
  // ══════════════════════════════════════════════════════════════════════

  const Overlays = (
    <>
      {logoutModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800">Sign out?</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
              Your session will end. Any unsaved consultation data will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setLogoutModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Stay in session
              </button>
              <button onClick={async () => {
                try {
                  const r = sessionStorage.getItem("user") || localStorage.getItem("user");
                  if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id, username: u.username }) }); }
                } catch {}
                window.location.href = "/login";
              }}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#00803F] text-white text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg z-[300]">
          <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" /> {toast}
        </div>
      )}

      {/* Image viewer */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]"
          onClick={e => { if (e.target === e.currentTarget) setViewingImage(null); }}>
          <div className="bg-white rounded-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div>
                <span className="text-sm font-medium text-slate-800">{viewingImage.fileName}</span>
                <span className="text-xs text-slate-400 ml-2">
                  {IMAGE_TYPES.find(t => t.value === viewingImage.imageType)?.label || viewingImage.imageType}
                </span>
              </div>
              <button onClick={() => setViewingImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 flex items-center justify-center bg-slate-100">
              <img
                src={`/api/dental/images/${viewingImage.id}`}
                alt={viewingImage.fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            {viewingImage.findings && (
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">{viewingImage.findings}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════════════
  // RENDER BY VIEW
  // ══════════════════════════════════════════════════════════════════════

  // ── QUEUE VIEW ──
  if (activeView === "queue" && !active) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={setActiveView} activeView={activeView} onLogout={() => setLogoutModal(true)} />
        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Dental Patient Queue</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button onClick={() => setActiveView("dashboard")} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
              <LayoutDashboard size={14} /> Dashboard
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Waiting</div>
              <div className="text-3xl font-semibold text-slate-800 mt-1">{patients.filter(p => p.currentStatus === "AWAITING_DENTIST").length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">In Consultation</div>
              <div className="text-3xl font-semibold text-amber-600 mt-1">{patients.filter(p => p.currentStatus === "IN_CONSULTATION").length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Emergency</div>
              <div className={`text-3xl font-semibold mt-1 ${patients.filter(p => p.isEmergency).length > 0 ? "text-rose-600" : "text-slate-800"}`}>
                {patients.filter(p => p.isEmergency).length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Sources</div>
              <div className="text-base font-semibold text-slate-800 mt-1">All Departments</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Patients</span>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">● Live</span>
            </div>

            {loading ? (
              <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading patients…
              </div>
            ) : patients.length === 0 ? (
              <div className="py-20 text-center">
                <Activity size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">No patients currently in the dental queue.</p>
                <p className="text-xs text-slate-300 mt-1">Patients can be sent from Reception, Triage, Doctor, Emergency, Specialist, or any authorized department.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {patients.map(p => {
                  const isInConsultation = p.currentStatus === "IN_CONSULTATION";
                  const lastDental = p.DentalRecord?.[0];
                  const allRecords = p.DentalRecord || [];
                  return (
                    <li key={p.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => openPatient(p)}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarCls(p.id)}`}>
                        {initials(p)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</span>
                          {p.isEmergency && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-medium">
                              <AlertTriangle size={9} /> Emergency
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            isInConsultation
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            <Clock size={9} />
                            {isInConsultation ? "In Consultation" : "Awaiting Dental Review"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.patientNumber} · {p.age} yrs · {genderLabel(p.gender)}
                          {p.phoneNumber && ` · ${p.phoneNumber}`}
                        </div>
                        {p.Visit[0]?.symptoms && (
                          <div className="text-xs text-slate-400 mt-1 truncate italic">{p.Visit[0].symptoms}</div>
                        )}
                        {/* Show previous dental records */}
                        {allRecords.length > 0 && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {allRecords.slice(0, 3).map((rec, ri) => (
                              <span key={rec.id} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full truncate max-w-[180px]">
                                {fmtDate(rec.createdAt)}: {rec.diagnosis || rec.treatmentPlan || "Visit"}
                              </span>
                            ))}
                            {allRecords.length > 3 && (
                              <span className="text-[9px] text-slate-400">+{allRecords.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 mr-2">
                        <div className="text-xs text-slate-400">Waiting</div>
                        <div className="text-sm font-medium text-slate-700">{waitLabel(p.updatedAt)}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); openPatient(p); }}
                        className="flex items-center gap-1 text-xs px-4 py-2 rounded-lg bg-[#00803F] text-white hover:bg-[#006633] transition-colors flex-shrink-0">
                        Start Consultation <ChevronRight size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
        {Overlays}
      </div>
    );
  }

  // ── DENTAL RECORDS VIEW ──
  if (activeView === "records" && !active && !viewingRecord) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={setActiveView} activeView={activeView} onLogout={() => setLogoutModal(true)} />
        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Dental Records</h1>
              <p className="text-sm text-slate-400 mt-0.5">Search and review all patients managed by the Dental Department</p>
            </div>
            <button onClick={() => setActiveView("queue")}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-[#00803F] text-white hover:bg-[#006633] transition-colors">
              <Users size={14} /> Patient Queue
            </button>
          </div>
          <DentalRecordsView onOpenRecord={(p) => openPatient(p)} onViewRecord={viewRecord} />
        </main>
        {Overlays}
      </div>
    );
  }

  // ── APPOINTMENTS VIEW ──
  if (activeView === "appointments" && !active && !viewingRecord) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={setActiveView} activeView={activeView} onLogout={() => setLogoutModal(true)} />
        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Appointments</h1>
              <p className="text-sm text-slate-400 mt-0.5">Manage dental appointments</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="date" value={apptDate} onChange={e => { setApptDate(e.target.value); }} onBlur={fetchAppointments}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400" />
              <select value={apptFilter} onChange={e => { setApptFilter(e.target.value); }} onBlur={fetchAppointments}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {new Date(apptDate + "T12:00:00").toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="text-xs text-slate-400">{appointments.length} appointment(s)</span>
            </div>

            {apptLoading ? (
              <div className="py-20 flex items-center justify-center text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-20 text-center">
                <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">No appointments for this date</p>
                <p className="text-xs text-slate-300 mt-1">Appointments can be scheduled from Reception</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {appointments.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                      a.status === "CANCELLED" ? "bg-red-100 text-red-500" :
                      a.status === "COMPLETED" ? "bg-green-100 text-green-600" :
                      a.status === "CONFIRMED" ? "bg-blue-100 text-blue-600" :
                      "bg-amber-100 text-amber-600"
                    }`}>
                      {a.Patient?.firstName?.[0]}{a.Patient?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">
                          {a.Patient?.firstName} {a.Patient?.lastName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          a.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                          a.status === "COMPLETED" ? "bg-green-50 text-green-600" :
                          a.status === "CONFIRMED" ? "bg-blue-50 text-blue-600" :
                          "bg-amber-50 text-amber-600"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {a.Patient?.patientNumber} · {new Date(a.appointmentDate).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                        {a.Patient?.phoneNumber && ` · ${a.Patient.phoneNumber}`}
                      </div>
                      {a.reason && <div className="text-xs text-slate-500 mt-1">{a.reason}</div>}
                      {a.notes && <div className="text-[11px] text-slate-400 mt-0.5 italic">{a.notes}</div>}
                      {a.Staff && <div className="text-[10px] text-slate-400 mt-0.5">with {a.Staff.fullName}</div>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {a.status === "PENDING" && (
                        <button onClick={async () => {
                          await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status: "CONFIRMED" }) });
                          setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: "CONFIRMED" } : x));
                        }}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors">
                          Confirm
                        </button>
                      )}
                      {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                        <button onClick={async () => {
                          await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
                          setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: "CANCELLED" } : x));
                        }}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
        {Overlays}
      </div>
    );
  }

  // ── DASHBOARD VIEW ──
  if (activeView === "dashboard" && !active && !viewingRecord) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={setActiveView} activeView={activeView} onLogout={() => setLogoutModal(true)} />
        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
          <DashboardView stats={stats} dentistName={dentistName} />
          <div className="mt-6 text-center">
            <button onClick={() => setActiveView("queue")}
              className="inline-flex items-center gap-2 bg-[#00803F] text-white text-sm px-6 py-3 rounded-xl hover:bg-[#006633] transition-colors font-medium shadow-sm">
              <Users size={16} /> Open Patient Queue ({patients.length})
            </button>
          </div>
        </main>
        {Overlays}
      </div>
    );
  }

  // ── VIEW RECORD DETAIL ──
  if (viewingRecord && !active) {
    const r = viewingRecord;
    const displayFindings: Record<number, OdontogramFinding> = {};
    r.OdontogramFinding?.forEach(f => { displayFindings[f.toothNumber] = f; });

    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={0} onNav={(v) => { setViewingRecord(null); setActiveView(v); }} activeView="" onLogout={() => setLogoutModal(true)} />
        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewingRecord(null)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
                <ArrowLeft size={15} /> Records
              </button>
              <span className="text-slate-200">/</span>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  {r.Patient.firstName} {r.Patient.lastName}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.Patient.patientNumber} · Report: {r.reportNumber} · {fmtDateTime(r.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setViewingRecord(null); openPatient(r.Patient); }}
                className="flex items-center gap-1 text-xs px-4 py-2 rounded-lg bg-[#00803F] text-white hover:bg-[#006633]">
                <Plus size={12} /> New Consultation
              </button>
              <button onClick={printReport}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Patient Info */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-semibold">Patient Information</p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                {[
                  ["Name", `${r.Patient.firstName} ${r.Patient.lastName}`],
                  ["Patient #", r.Patient.patientNumber],
                  ["Age/Gender", `${r.Patient.age} yrs / ${genderLabel(r.Patient.gender)}`],
                  ["Phone", r.Patient.phoneNumber || "—"],
                  ["Report #", r.reportNumber],
                  ["Date", fmtDateTime(r.createdAt)],
                  ["Dentist", r.Staff?.fullName || "—"],
                  ["Status", r.status],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] text-slate-400 uppercase tracking-wider">{k}</dt>
                    <dd className="text-sm font-medium text-slate-700 mt-0.5">{v}</dd>
                  </div>
                ))}
              </div>
            </div>

            {/* Odontogram */}
            {r.OdontogramFinding && r.OdontogramFinding.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-semibold">Odontogram Findings</p>
                <OdontogramView findings={displayFindings} readOnly={true} />
              </div>
            )}

            {/* Chief Complaint & History */}
            {r.chiefComplaint && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Chief Complaint</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.chiefComplaint}</p>
              </div>
            )}
            {r.historyOfPresentIllness && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">History of Present Illness</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.historyOfPresentIllness}</p>
              </div>
            )}
            {r.pastDentalHistory && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Past Dental History</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.pastDentalHistory}</p>
              </div>
            )}

            {/* Diagnosis & Treatment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {r.diagnosis && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Diagnosis</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.diagnosis}</p>
                </div>
              )}
              {r.treatmentPlan && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Treatment Plan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.treatmentPlan}</p>
                </div>
              )}
            </div>

            {/* Procedures */}
            {r.DentalProcedure && r.DentalProcedure.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-semibold">Procedures Performed</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="text-left py-2 px-2">Procedure</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Teeth</th>
                      <th className="text-left py-2 px-2">Outcome</th>
                      <th className="text-left py-2 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.DentalProcedure.map((proc: any) => (
                      <tr key={proc.id} className="border-b border-slate-50">
                        <td className="py-2 px-2 font-medium">{proc.procedureName}</td>
                        <td className="py-2 px-2 text-slate-500">{PROCEDURE_TYPES.find(t => t.value === proc.procedureType)?.label || proc.procedureType}</td>
                        <td className="py-2 px-2 text-slate-500">{proc.toothNumbers ? JSON.parse(proc.toothNumbers).join(", ") : "—"}</td>
                        <td className="py-2 px-2">{proc.outcome || "—"}</td>
                        <td className="py-2 px-2 text-slate-400 max-w-[200px] truncate">{proc.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Follow-Up */}
            {r.followUpInstructions && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Follow-Up Instructions</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.followUpInstructions}</p>
                {r.reviewAppointment && (
                  <p className="text-xs text-slate-500 mt-2">Review: {fmtDateTime(r.reviewAppointment)}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {r.notes && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-semibold">Clinical Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.notes}</p>
              </div>
            )}
          </div>

          {/* Print area */}
          <div className="print-area" style={{ display: "none" }}>
            <div style={{ textAlign: "center", borderBottom: "3px double #00803F", paddingBottom: 16, marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#00803F" }}>MAIN STREET MEDICAL CENTER</h1>
              <p style={{ fontSize: 12, margin: "4px 0", color: "#475569" }}>Dental Consultation Report</p>
              <p style={{ fontSize: 11, color: "#64748b" }}>Report: {r.reportNumber} · {fmtDateTime(r.createdAt)}</p>
            </div>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 20 }}>
              <tbody>
                <tr><td style={{ padding: "4px 8px", fontWeight: "bold", width: 140 }}>Patient Name</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{r.Patient.firstName} {r.Patient.lastName}</td>
                    <td style={{ padding: "4px 8px", fontWeight: "bold", width: 100 }}>Care ID</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{r.Patient.patientNumber}</td></tr>
                <tr><td style={{ padding: "4px 8px", fontWeight: "bold" }}>Age / Gender</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{r.Patient.age} yrs / {genderLabel(r.Patient.gender)}</td>
                    <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Report #</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{r.reportNumber}</td></tr>
                <tr><td style={{ padding: "4px 8px", fontWeight: "bold" }}>Phone</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{r.Patient.phoneNumber || "—"}</td>
                    <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Department</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>Dental</td></tr>
              </tbody>
            </table>
            {r.chiefComplaint && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Chief Complaint</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.chiefComplaint}</p></div>}
            {r.diagnosis && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Diagnosis</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.diagnosis}</p></div>}
            {r.treatmentPlan && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Treatment Plan</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.treatmentPlan}</p></div>}
            {r.DentalProcedure && r.DentalProcedure.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Procedures Performed</h3>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "2px solid #00803F" }}><th style={{ padding: 4, textAlign: "left" }}>Procedure</th><th style={{ padding: 4, textAlign: "left" }}>Type</th><th style={{ padding: 4, textAlign: "left" }}>Teeth</th><th style={{ padding: 4, textAlign: "left" }}>Outcome</th></tr></thead>
                  <tbody>{r.DentalProcedure.map((proc: any) => (
                    <tr key={proc.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: 4 }}>{proc.procedureName}</td>
                      <td style={{ padding: 4 }}>{PROCEDURE_TYPES.find(t => t.value === proc.procedureType)?.label || proc.procedureType}</td>
                      <td style={{ padding: 4 }}>{proc.toothNumbers ? JSON.parse(proc.toothNumbers).join(", ") : "—"}</td>
                      <td style={{ padding: 4 }}>{proc.outcome || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {r.followUpInstructions && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Follow-Up Instructions</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.followUpInstructions}</p></div>}
            {r.notes && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Clinical Notes</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.notes}</p></div>}

            <div style={{ marginTop: 40, borderTop: "1px solid #cbd5e1", paddingTop: 20 }}>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ fontWeight: "bold", width: 160 }}>Attending Dentist</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px" }}>{r.Staff?.fullName || "_____________"}</td></tr>
                  <tr><td style={{ fontWeight: "bold", paddingTop: 10 }}>Signature</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}></td></tr>
                  <tr><td style={{ fontWeight: "bold", paddingTop: 10 }}>Date</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}>{fmtDate(new Date())}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 20, fontSize: 11, color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
              Main Street Medical Center · Dental Department · Report: {r.reportNumber}
            </div>
          </div>
        </main>
        {Overlays}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONSULTATION VIEW (active patient)
  // ════════════════════════════════════════════════════════════════════════════
  if (active) {
    const p = active;
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={(v) => { if (v !== "queue") setActiveView(v); else setActive(null); }} activeView="" onLogout={() => setLogoutModal(true)} />

        <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setActive(null)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
                <ArrowLeft size={15} /> Queue
              </button>
              <span className="text-slate-200">/</span>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">
                  {p.firstName} {p.lastName}
                  {p.isEmergency && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-medium align-middle">
                      <AlertTriangle size={9} /> Emergency
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {p.patientNumber} · {p.age} yrs · {genderLabel(p.gender)} · {genderIcon(p.gender)}
                  {p.phoneNumber && ` · ${p.phoneNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={markBeingSeen}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium shadow-sm">
                <Activity size={13} /> Being Seen
              </button>
              <button onClick={printReport}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-100 mb-5">
            <div className="flex overflow-x-auto border-b border-slate-100">
              {([
                { id: "exam" as const, label: "Chief Complaint & History", icon: FileText },
                { id: "clinical" as const, label: "Clinical Exam & Odontogram", icon: Activity },
                { id: "procedures" as const, label: "Procedures", icon: Syringe },
                { id: "imaging" as const, label: "Imaging", icon: Eye },
                { id: "history" as const, label: "Past History", icon: Clock },
              ]).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    tab === id ? "border-[#0a2e1a] text-[#00803F]" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ═══ TAB: EXAM — Chief Complaint & History ═══ */}
              {tab === "exam" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Chief Complaint</label>
                      <textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={3}
                        placeholder="Patient's dental complaint…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">History of Present Illness</label>
                      <textarea value={historyOfPresentIllness} onChange={e => setHistoryOfPresentIllness(e.target.value)} rows={3}
                        placeholder="Onset, duration, severity, aggravating/relieving factors…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Past Dental History</label>
                      <textarea value={pastDentalHistory} onChange={e => setPastDentalHistory(e.target.value)} rows={3}
                        placeholder="Previous dental treatments, surgeries, orthodontics…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Medical History</label>
                      <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} rows={3}
                        placeholder="Systemic conditions, medications, bleeding disorders…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Allergies</label>
                      <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2}
                        placeholder="Drug allergies, latex allergy, etc."
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Vital Signs</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Temp (°C)", val: temperature, set: setTemperature },
                          { label: "BP Syst", val: bpSystolic, set: setBpSystolic },
                          { label: "BP Dias", val: bpDiastolic, set: setBpDiastolic },
                          { label: "HR (bpm)", val: heartRate, set: setHeartRate },
                          { label: "RR", val: respiratoryRate, set: setRespiratoryRate },
                          { label: "SpO₂ (%)", val: spo2, set: setSpo2 },
                          { label: "Weight (kg)", val: weight, set: setWeight },
                        ].map(({ label, val, set }) => (
                          <div key={label}>
                            <span className="text-[9px] text-slate-400">{label}</span>
                            <input value={val} onChange={e => set(e.target.value)} type="number"
                              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB: CLINICAL — Examination & Odontogram ═══ */}
              {tab === "clinical" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Interactive Odontogram</label>
                      <button onClick={clearOdontogram}
                        className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-1">
                        <Trash2 size={10} /> Clear
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                      <OdontogramView
                        findings={odontogramFindings}
                        onToggle={toggleOdontogramTooth}
                        activeFinding={activeTooth}
                        setActiveFinding={setActiveTooth}
                      />
                      {Object.keys(odontogramFindings).length > 0 && (
                        <div className="mt-2 text-[10px] text-slate-400 text-center">
                          {Object.keys(odontogramFindings).length} tooth/teeth marked · Tap a tooth to edit details
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Extraoral Examination</label>
                      <textarea value={extraoralExam} onChange={e => setExtraoralExam(e.target.value)} rows={3}
                        placeholder="Facial symmetry, lymph nodes, TMJ, swelling…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Intraoral Examination</label>
                      <textarea value={intraoralExam} onChange={e => setIntraoralExam(e.target.value)} rows={3}
                        placeholder="Soft tissues, mucosa, tongue, palate, gingiva…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Periodontal Findings</label>
                      <textarea value={periodontalFindings} onChange={e => setPeriodontalFindings(e.target.value)} rows={2}
                        placeholder="Gingivitis, periodontitis, pockets, recession, BOP…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Oral Hygiene Assessment</label>
                      <textarea value={oralHygieneAssessment} onChange={e => setOralHygieneAssessment(e.target.value)} rows={2}
                        placeholder="Plaque, calculus, bleeding index, hygiene habits…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Clinical Examination Summary</label>
                    <textarea value={clinicalExamination} onChange={e => setClinicalExamination(e.target.value)} rows={3}
                      placeholder="Overall clinical assessment summary…"
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Diagnosis</label>
                      <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={4}
                        placeholder="Clinical diagnosis with affected teeth…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Treatment Plan</label>
                      <textarea value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} rows={4}
                        placeholder="Proposed treatment, sequence, alternatives…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB: PROCEDURES ═══ */}
              {tab === "procedures" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Procedures Performed ({procedures.length})</span>
                    <button onClick={() => setShowProcedureForm(true)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#00803F] text-white hover:bg-[#006633] transition-colors">
                      <Plus size={12} /> Add Procedure
                    </button>
                  </div>

                  {procedures.length === 0 && !showProcedureForm ? (
                    <div className="py-8 text-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                      <Syringe size={24} className="mx-auto mb-2 text-slate-200" />
                      <p>No procedures added yet</p>
                      <p className="text-xs mt-1 text-slate-300">Click "Add Procedure" to document treatments performed</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {procedures.map((proc, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-[#00803F]/10 text-[#00803F] flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{proc.procedureName}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
                                {PROCEDURE_TYPES.find(t => t.value === proc.procedureType)?.label || proc.procedureType}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {proc.toothNumbers && `Teeth: ${JSON.parse(proc.toothNumbers).join(", ")}`}
                              {proc.arch && ` · Arch: ${proc.arch}`}
                              {proc.anaesthesiaType && ` · Anaesthesia: ${proc.anaesthesiaType}`}
                              {proc.outcome && ` · Outcome: ${proc.outcome}`}
                            </div>
                          </div>
                          <button onClick={() => removeProcedure(i)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Procedure form modal */}
                  {showProcedureForm && (
                    <ProcedureForm
                      onSave={addProcedure}
                      onCancel={() => setShowProcedureForm(false)}
                    />
                  )}

                  {/* Prescriptions */}
                  <div className="border-t border-slate-200 pt-4">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Prescribed Medications (JSON format)</label>
                    <textarea value={prescribedMedications} onChange={e => setPrescribedMedications(e.target.value)} rows={2}
                      placeholder='[{"medication":"Amoxicillin","dosage":"500mg","instructions":"Three times daily for 7 days"}]'
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300 font-mono text-xs" />
                  </div>
                </div>
              )}

              {/* ═══ TAB: IMAGING ═══ */}
              {tab === "imaging" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Dental Images ({images.length})</span>
                    <div className="flex gap-2">
                      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" multiple
                        onChange={e => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const imageType = prompt("Image type: INTRAORAL, PANORAMIC, BITEWING, PERIAPICAL, CEPHALOMETRIC, CBCT, OCCLUSAL, EXTRAORAL, OTHER") || "INTRAORAL";
                            Array.from(files).forEach(f => uploadImage(f, imageType));
                          }
                          e.target.value = "";
                        }} />
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#00803F] text-white hover:bg-[#006633] transition-colors">
                        <Upload size={12} /> Upload Images
                      </button>
                    </div>
                  </div>

                  {images.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                      <Eye size={24} className="mx-auto mb-2 text-slate-200" />
                      <p>No dental images uploaded</p>
                      <p className="text-xs mt-1 text-slate-300">Upload intraoral photos, X-rays, or other dental images</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {images.map((img: any) => (
                        <div key={img.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow group cursor-pointer"
                          onClick={() => setViewingImage(img)}>
                          <div className="h-28 bg-slate-100 flex items-center justify-center overflow-hidden">
                            <img src={`/api/dental/images/${img.id}`} alt={img.fileName}
                              className="w-full h-full object-cover" />
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-[11px] font-medium text-slate-700 truncate">{img.fileName}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {IMAGE_TYPES.find(t => t.value === img.imageType)?.label || img.imageType}
                              {img.fileSize && ` · ${(img.fileSize / 1024).toFixed(0)} KB`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: HISTORY — Past dental records ═══ */}
              {tab === "history" && (
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Previous Dental Records</span>
                  {p.DentalRecord && p.DentalRecord.length > 0 ? (
                    <div className="space-y-3">
                      {p.DentalRecord.slice(0, 10).map((rec, idx) => (
                        <div key={rec.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {rec.reportNumber || `Visit #${idx + 1}`}
                                </span>
                                <span className="text-[11px] text-slate-400">{fmtDate(rec.createdAt)}</span>
                                {rec.Staff && <span className="text-[11px] text-slate-400">by {rec.Staff.fullName}</span>}
                              </div>
                              {rec.chiefComplaint && <p className="text-xs text-slate-500 mt-2 italic">{rec.chiefComplaint}</p>}
                              {rec.diagnosis && <p className="text-xs text-slate-700 mt-1"><span className="font-medium">Dx:</span> {rec.diagnosis}</p>}
                              {rec.treatmentPlan && <p className="text-xs text-slate-600 mt-0.5"><span className="font-medium">Tx:</span> {rec.treatmentPlan}</p>}
                            </div>
                          </div>
                          {rec.DentalProcedure && rec.DentalProcedure.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rec.DentalProcedure.map((pr: any, pi: number) => (
                                <span key={pi} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                  {pr.procedureName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                      <Clock size={24} className="mx-auto mb-2 text-slate-200" />
                      <p>No previous dental records for this patient</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom section: Route + Follow-up + Submit */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
            {/* Route grid */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-semibold">Route Patient To</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROUTES.map(r => (
                  <button key={r.id} onClick={() => setRoute(r.id)}
                    className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                      route === r.id ? "border-[#0a2e1a] bg-emerald-50 shadow-sm" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}>
                    <r.Icon size={14} className={route === r.id ? "text-[#00803F]" : "text-slate-400"} />
                    <div className={`text-[10px] font-semibold ${route === r.id ? "text-[#00803F]" : "text-slate-700"}`}>{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up & Submit */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-semibold">Follow-Up</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Review Appointment Date</label>
                    <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Follow-Up Instructions</label>
                    <textarea value={followUpInstructions} onChange={e => setFollowUpInstructions(e.target.value)} rows={2}
                      placeholder="Post-treatment care, precautions, next visit…"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Clinical Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      placeholder="Additional notes, observations, education provided…"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setActive(null)}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  Discard
                </button>
                <button onClick={completeConsultation} disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#00803F] text-white text-sm px-5 py-2.5 rounded-xl hover:bg-[#006633] disabled:opacity-60 transition-colors font-medium">
                  {isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><CheckCircle size={14} /> Complete & Route</>}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Odontogram Editor Modal */}
        {showOdontogramEditor && activeTooth && odontogramFindings[activeTooth] && (
          <OdontogramEditor
            toothNumber={activeTooth}
            finding={odontogramFindings[activeTooth]}
            onUpdate={(updates) => updateOdontogramFinding(activeTooth, updates)}
            onClose={() => setShowOdontogramEditor(false)}
          />
        )}

        {Overlays}

        {/* Printable consultation form */}
        <div className="print-area" style={{ display: "none" }}>
          <div style={{ textAlign: "center", borderBottom: "3px double #00803F", paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#00803F" }}>MAIN STREET MEDICAL CENTER</h1>
            <p style={{ fontSize: 12, margin: "4px 0", color: "#475569" }}>Dental Consultation Form</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>{fmtDateTime(new Date())}</p>
          </div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 8px", fontWeight: "bold", width: 140 }}>Patient Name</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{active.firstName} {active.lastName}</td>
                <td style={{ padding: "4px 8px", fontWeight: "bold", width: 100 }}>Care ID</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{active.patientNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Age / Gender</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{active.age} yrs / {genderLabel(active.gender)}</td>
                <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Department</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>Dental</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Phone</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{active.phoneNumber || "&mdash;"}</td>
                <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Attending</td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{dentistName}</td>
              </tr>
            </tbody>
          </table>
          {chiefComplaint && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Chief Complaint</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{chiefComplaint}</p></div>}
          {diagnosis && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Diagnosis</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{diagnosis}</p></div>}
          {treatmentPlan && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Treatment Plan</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{treatmentPlan}</p></div>}
          {procedures.length > 0 && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Procedures</h3>{procedures.map((proc, i) => <p key={i} style={{ fontSize: 12, margin: "2px 0" }}>{i+1}. {proc.procedureName} ({PROCEDURE_TYPES.find(t=>t.value===proc.procedureType)?.label||proc.procedureType}){proc.toothNumbers?` - ${JSON.parse(proc.toothNumbers).join(", ")}`:""}{proc.outcome?` - ${proc.outcome}`:""}</p>)}</div>}
          {followUpInstructions && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Follow-Up Instructions</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{followUpInstructions}</p></div>}
          {notes && <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: "bold", color: "#00803F", margin: "0 0 6px", textTransform: "uppercase" }}>Clinical Notes</h3><p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{notes}</p></div>}
          <div style={{ marginTop: 40, borderTop: "1px solid #cbd5e1", paddingTop: 20 }}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <tbody>
                <tr><td style={{ fontWeight: "bold", width: 160 }}>Attending Dentist</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px" }}>{dentistName}</td></tr>
                <tr><td style={{ fontWeight: "bold", paddingTop: 10 }}>Signature</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}></td></tr>
                <tr><td style={{ fontWeight: "bold", paddingTop: 10 }}>Date</td><td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}>{fmtDate(new Date())}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            Routed to {ROUTES.find(r => r.id === route)?.label ?? route} - Main Street Medical Center - Dental Department
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FALLBACK — redirect to dashboard
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar dentistName={dentistName} queueCount={patients.length} onNav={setActiveView} activeView="dashboard" onLogout={() => setLogoutModal(true)} />
      <main className="lg:ml-56 ml-0 pt-14 lg:pt-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Loader2 size={24} className="animate-spin mx-auto mt-20 text-slate-300" />
      </main>
      {Overlays}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PROCEDURE FORM COMPONENT
// ════════════════════════════════════════════════════════════════════════

function ProcedureForm({
  onSave, onCancel,
}: {
  onSave: (proc: DentalProcedureData) => void;
  onCancel: () => void;
}) {
  const [procedureType, setProcedureType] = useState("FILLING");
  const [procedureName, setProcedureName] = useState("");
  const [toothNumbersStr, setToothNumbersStr] = useState("");
  const [arch, setArch] = useState("UPPER");
  const [diag, setDiag] = useState("");
  const [findings, setFindings] = useState("");
  const [technique, setTechnique] = useState("");
  const [materials, setMaterials] = useState("");
  const [complications, setComplications] = useState("");
  const [outcome, setOutcome] = useState("SUCCESSFUL");
  const [anaesthesiaType, setAnaesthesiaType] = useState("LOCAL");
  const [fee, setFee] = useState("");
  const [procNotes, setProcNotes] = useState("");

  const handleSave = () => {
    const toothNums = toothNumbersStr
      .split(",")
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 32);

    onSave({
      procedureType,
      procedureName: procedureName || PROCEDURE_TYPES.find(t => t.value === procedureType)?.label || procedureType,
      toothNumbers: toothNums.length > 0 ? JSON.stringify(toothNums) : null,
      arch: toothNumbersStr ? (toothNums.every(n => n <= 16) ? "UPPER" : "LOWER") : arch,
      diagnosis: diag || null,
      findings: findings || null,
      technique: technique || null,
      materials: materials || null,
      complications: complications || null,
      outcome,
      anaesthesiaType: anaesthesiaType || null,
      fee: fee ? parseFloat(fee) : null,
      isCompleted: true,
      performedByName: null,
      notes: procNotes || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-800">Add Procedure</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Procedure Type</label>
              <select value={procedureType} onChange={e => setProcedureType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200">
                {PROCEDURE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Procedure Name</label>
              <input value={procedureName} onChange={e => setProcedureName(e.target.value)}
                placeholder={`e.g. ${PROCEDURE_TYPES.find(t => t.value === procedureType)?.label}`}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Tooth Numbers (comma-separated)</label>
              <input value={toothNumbersStr} onChange={e => setToothNumbersStr(e.target.value)}
                placeholder="e.g. 14, 15, 16"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Anaesthesia</label>
              <select value={anaesthesiaType} onChange={e => setAnaesthesiaType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200">
                <option value="LOCAL">Local</option>
                <option value="GENERAL">General</option>
                <option value="CONSCIOUS_SEDATION">Conscious Sedation</option>
                <option value="NONE">None</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Diagnosis / Indication</label>
            <input value={diag} onChange={e => setDiag(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Findings</label>
            <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Technique</label>
              <input value={technique} onChange={e => setTechnique(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Materials Used</label>
              <input value={materials} onChange={e => setMaterials(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Outcome</label>
              <select value={outcome} onChange={e => setOutcome(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200">
                <option value="SUCCESSFUL">Successful</option>
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Failed</option>
                <option value="ABANDONED">Abandoned</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Fee</label>
              <input value={fee} onChange={e => setFee(e.target.value)} type="number"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Complications</label>
              <input value={complications} onChange={e => setComplications(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Notes</label>
            <textarea value={procNotes} onChange={e => setProcNotes(e.target.value)} rows={2}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel}
            className="px-5 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 text-xs rounded-lg bg-[#00803F] text-white hover:bg-[#006633] font-semibold">
            <Plus size={12} className="inline mr-1" /> Add Procedure
          </button>
        </div>
      </div>
    </div>
  );
}
