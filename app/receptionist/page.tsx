"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import NotificationInbox from "../components/NotificationInbox";
import StaffMessaging from "../components/StaffMessaging";
import { useRouter } from "next/navigation";
import {
  Search, UserPlus, UserCheck, ArrowRight, CheckCircle2,
  AlertCircle, ShieldAlert, FileText, Phone, MapPin, FileHeart,
  LogOut, Receipt, Plus, Trash2, CreditCard, Banknote, Smartphone,
  Printer, X, BadgeCheck, Stethoscope, FlaskConical, Scan, Baby,
  Waves, RadioTower, Calendar, Clock, UserRound, Loader2,
  Pencil, Package,
} from "lucide-react";
import { FULL_SERVICE_CATALOG, CatalogItemWithCategory } from "./servicePriceCatalog";
import { LAB_TEST_CATALOG, type LabTestCatalogItem } from "../lib/labTestCatalog";
import { LabOrderModal } from "../components/LabOrderModal";
import ResultsModal from "../components/ResultsModal";
import PatientFileModal from "../components/PatientFileModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  ageUnit: string;
  dob: string | null;
  gender: string;
  phone: string | null;
  address: string | null;
  chiefComplaint: string;
  isEmergency: boolean;
  status: string;
  createdAt: string;
}

interface BillLine {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD" | "INSURANCE";

interface PartialBillPatient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  status: string;
  balanceDue: number;
  invoiceNumber: string;
  billingId: number;
}

interface BillingRecord {
  id: number;
  patientId: number;
  amount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  invoiceNumber: string;
  description: string;
  createdAt: string;
  Patient?: {
    id: number;
    patientNumber: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    currentStatus: string;
  };
  isPartial?: boolean;
}

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={15} />,
  MOBILE_MONEY: <Smartphone size={15} />,
  CARD: <CreditCard size={15} />,
  INSURANCE: <BadgeCheck size={15} />,
};

// ─── Routing destinations ─────────────────────────────────────────────────────

interface RouteOption {
  label: string;
  status: string;
  icon: React.ReactNode;
  color: string;      // Tailwind bg colour for the button
  ringColor: string;  // Tailwind ring / border colour
}

const ROUTE_OPTIONS: RouteOption[] = [
  {
    label: "Triage",
    status: "AWAITING_TRIAGE",
    icon: <UserCheck size={14} />,
    color: "bg-[#00703C] hover:bg-emerald-800",
    ringColor: "border-emerald-600",
  },
  {
    label: "Doctor",
    status: "AWAITING_DOCTOR",
    icon: <Stethoscope size={14} />,
    color: "bg-indigo-600 hover:bg-indigo-700",
    ringColor: "border-indigo-500",
  },
  {
    label: "Dentist",
    status: "AWAITING_DENTIST",
    icon: <FileText size={14} />,
    color: "bg-cyan-600 hover:bg-cyan-700",
    ringColor: "border-cyan-500",
  },
  {
    label: "Nurse / Midwife",
    status: "AWAITING_TRIAGE",   // Triage is the nurse/midwife queue in this schema
    icon: <Baby size={14} />,
    color: "bg-pink-500 hover:bg-pink-600",
    ringColor: "border-pink-400",
  },
  {
    label: "Sonographer",
    status: "AWAITING_SONOGRAPHY",
    icon: <Waves size={14} />,
    color: "bg-blue-600 hover:bg-blue-700",
    ringColor: "border-blue-500",
  },
  {
    label: "Radiologist",
    status: "AWAITING_RADIOLOGY",
    icon: <RadioTower size={14} />,
    color: "bg-violet-600 hover:bg-violet-700",
    ringColor: "border-violet-500",
  },
  {
    label: "Laboratory",
    status: "AWAITING_LAB",
    icon: <FlaskConical size={14} />,
    color: "bg-amber-500 hover:bg-amber-600",
    ringColor: "border-amber-400",
  },
  {
    label: "Pharmacy",
    status: "AWAITING_PHARMACY",
    icon: <Scan size={14} />,
    color: "bg-teal-600 hover:bg-teal-700",
    ringColor: "border-teal-500",
  },
  // ── ANC / Midwife — not a status change; creates an ANC appointment ──
  {
    label: "MIDWIFE",
    status: "MIDWIFE_ANC",
    icon: <Baby size={14} />,
    color: "bg-purple-600 hover:bg-purple-700",
    ringColor: "border-purple-500",
  },
];

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    REGISTERED:          { label: "Registered — not yet routed", color: "text-slate-700 bg-slate-100 border-slate-300" },
    AWAITING_TRIAGE:     { label: "Awaiting Triage",     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  AWAITING_DOCTOR:     { label: "Awaiting Doctor",      color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  AWAITING_DENTIST:    { label: "Awaiting Dentist",     color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  AWAITING_SONOGRAPHY: { label: "Awaiting Sonography",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  AWAITING_RADIOLOGY:  { label: "Awaiting Radiology",   color: "text-violet-700 bg-violet-50 border-violet-200" },
  AWAITING_LAB:        { label: "Awaiting Lab",         color: "text-amber-700 bg-amber-50 border-amber-200" },
  IN_CONSULTATION:     { label: "In Consultation",      color: "text-rose-700 bg-rose-50 border-rose-200" },
  AWAITING_PHARMACY:   { label: "Awaiting Pharmacy",    color: "text-teal-700 bg-teal-50 border-teal-200" },
  AWAITING_CASHIER:    { label: "Awaiting Cashier",     color: "text-orange-700 bg-orange-50 border-orange-200" },
	  DISCHARGED:          { label: "Discharged",           color: "text-slate-500 bg-slate-50 border-slate-200" },
	  LAB_REJECTED:        { label: "Rejected by Lab",      color: "text-red-700 bg-red-50 border-red-200" },
	};

const formatUGX = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-UG");

const formatAge = (age: number, unit: string) =>
  `${age} ${unit === "months" ? "mo" : "yrs"}`;

// Format a Date as a LOCAL "YYYY-MM-DDTHH:mm" string for <input type="datetime-local">
// (new Date().toISOString().slice(0, 16) returns UTC and shifts times by the UTC offset)
const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Format a Date as a LOCAL "YYYY-MM-DD" key
const toLocalDateKey = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ─── Lab Test Price List — now using shared LAB_TEST_CATALOG ─────────────────

const SERVICE_PRICE_KEY = "MSMC_SERVICE_PRICES";

/* Generalized price functions — used across all 13 categories */
function getServicePrice(code: string, defaultPrice: number): number {
  if (typeof window === "undefined") return defaultPrice;
  try {
    const stored = localStorage.getItem(SERVICE_PRICE_KEY);
    if (stored) {
      const prices: Record<string, number> = JSON.parse(stored);
      if (prices[code] !== undefined) return prices[code];
    }
  } catch {}
  return defaultPrice;
}

function setServicePrice(code: string, price: number) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(SERVICE_PRICE_KEY);
    const prices: Record<string, number> = stored ? JSON.parse(stored) : {};
    prices[code] = price;
    localStorage.setItem(SERVICE_PRICE_KEY, JSON.stringify(prices));
  } catch {}
}

// ─── StaffAttendancePanel ──────────────────────────────────────────────────────

interface AttendanceRecord {
  id: number;
  staffId: number | null;
  staffName: string | null;
  department: string | null;
  clockIn: string;
  clockOut: string | null;
  date: string;
  notes: string | null;
  Staff: { fullName: string; department: string } | null;
}

interface StaffMember {
  id: number;
  fullName: string;
  department: string;
  role: string | null;
  todayAttendance: AttendanceRecord | null;
  isClockedIn: boolean;
}

function StaffAttendancePanel() {
  const [panelTab, setPanelTab] = useState<"clock" | "records">("clock");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingId, setClockingId] = useState<number | null>(null);

  // Manual time-entry modal state
  const [timeEntry, setTimeEntry] = useState<{
    staff: StaffMember;
    mode: "clockIn" | "clockOut";
  } | null>(null);
  const [entryTime, setEntryTime] = useState("");

  // ── Fetch staff list (for Quick Clock) ──────────────────────────────────────
  const fetchStaffList = useCallback(async () => {
    try {
      const res = await fetch("/api/staff-attendance?staffList=true");
      const data = await res.json();
      setStaffList(data.staffList ?? []);
    } catch {
      setStaffList([]);
    }
  }, []);

  // ── Fetch attendance records (for Records view) ─────────────────────────────
  const fetchRecords = useCallback(async () => {
    try {
      const today = toLocalDateKey(new Date());
      const res = await fetch(`/api/staff-attendance?date=${today}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      setRecords([]);
    }
  }, []);

  // ── Initial fetch & auto-refresh ────────────────────────────────────────────
  useEffect(() => {
    fetchStaffList();
    fetchRecords();
    const interval = setInterval(() => {
      fetchStaffList();
      fetchRecords();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStaffList, fetchRecords]);

  // ── Open manual time-entry modal ────────────────────────────────────────────
  const openTimeEntry = (staff: StaffMember, mode: "clockIn" | "clockOut") => {
    setEntryTime(toLocalInputValue(new Date()));
    setTimeEntry({ staff, mode });
  };

  // ── Submit manual time entry ────────────────────────────────────────────────
  const handleManualTimeEntry = async () => {
    if (!timeEntry || clockingId) return;
    setClockingId(timeEntry.mode === "clockIn" ? timeEntry.staff.id : (timeEntry.staff.todayAttendance?.id ?? timeEntry.staff.id));
    try {
      if (timeEntry.mode === "clockIn") {
        const res = await fetch("/api/staff-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: timeEntry.staff.id,
            // datetime-local value is parsed as browser-LOCAL time → send as UTC ISO
            // so the server stores the correct instant regardless of its own timezone
            clockIn: new Date(entryTime).toISOString(),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to clock in");
        }
      } else {
        const attendanceId = timeEntry.staff.todayAttendance?.id;
        if (!attendanceId) { alert("No active attendance record to clock out"); return; }
        const res = await fetch("/api/staff-attendance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attendanceId, clockOut: new Date(entryTime).toISOString() }),
        });
        if (!res.ok) {
          alert("Failed to clock out");
        }
      }
      setTimeEntry(null);
      await fetchStaffList();
      await fetchRecords();
    } catch {
      alert("Failed to save time entry");
    } finally {
      setClockingId(null);
    }
  };

  // ── Delete record ───────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/staff-attendance?id=${id}`, { method: "DELETE" });
      await fetchRecords();
    } catch {}
  };

  // ── Formatters ──────────────────────────────────────────────────────────────
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return null;
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const activeCount = staffList.filter((s) => s.isClockedIn).length;
  const totalCount = staffList.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-blue-600" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Staff Attendance
          </span>
          <span className="text-[10px] text-slate-400 ml-1">
            {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
          <button
            onClick={() => { fetchStaffList(); fetchRecords(); }}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs: Quick Clock | Records */}
      <div className="flex gap-1 px-5 pt-3 pb-1 border-b border-slate-50">
        <button
          onClick={() => setPanelTab("clock")}
          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
            panelTab === "clock"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Quick Clock
        </button>
        <button
          onClick={() => setPanelTab("records")}
          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
            panelTab === "records"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Attendance Records
        </button>
      </div>

      {/* ── QUICK CLOCK TAB ──────────────────────────────────────────────────── */}
      {panelTab === "clock" && (
        <div className="p-5">
          {staffList.length === 0 && loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="text-slate-300 animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <UserRound size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-medium">No staff members found</p>
              <p className="text-[10px] text-slate-300 mt-1">Staff accounts need to be created in the system first</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className={`relative rounded-xl border-2 p-4 transition-all ${
                    staff.isClockedIn
                      ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                      staff.isClockedIn
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {staff.fullName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{staff.fullName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-semibold text-slate-400 truncate">{staff.department}</span>
                        {staff.isClockedIn && (
                          <span className="text-[8px] font-extrabold uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Today's attendance info */}
                  {staff.todayAttendance && (
                    <div className="text-[10px] text-slate-500 mb-3 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <LogOut size={10} className="text-slate-400" />
                        <span className="font-medium">In: {formatTime(staff.todayAttendance.clockIn)}</span>
                      </div>
                      {staff.todayAttendance.clockOut && (
                        <div className="flex items-center gap-1.5">
                          <LogOut size={10} className="rotate-180 text-slate-400" />
                          <span className="font-medium">Out: {formatTime(staff.todayAttendance.clockOut)}</span>
                          <span className="text-slate-300">({formatDuration(staff.todayAttendance.clockIn, staff.todayAttendance.clockOut)})</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Two buttons — Clock In & Clock Out always visible */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openTimeEntry(staff, "clockIn")}
                      disabled={clockingId !== null}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[#00703C] py-2 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {clockingId === staff.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LogOut size={12} />
                      )}
                      Clock In
                    </button>
                    <button
                      onClick={() => openTimeEntry(staff, "clockOut")}
                      disabled={clockingId !== null}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 py-2 text-[10px] font-extrabold uppercase tracking-wider text-red-600 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {clockingId === (staff.todayAttendance?.id ?? staff.id) ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LogOut size={12} className="rotate-180" />
                      )}
                      Clock Out
                    </button>
                  </div>
                </div>
              ))}

              {/* ── Manual Time-Entry Modal ──────────────────────────────── */}
              {timeEntry && (
                <>
                  <div className="fixed inset-0 z-[200] bg-black/30" onClick={() => setTimeEntry(null)} />
                  <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 w-[min(380px,calc(100vw-32px))] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-extrabold text-slate-800">
                        {timeEntry.mode === "clockIn" ? "Clock In" : "Clock Out"}
                      </h3>
                      <button onClick={() => setTimeEntry(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">
                      {timeEntry.staff.fullName} &middot; {timeEntry.staff.department}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      {timeEntry.mode === "clockIn" ? "Enter clock-in time" : "Enter clock-out time"}
                    </p>
                    <input
                      type="datetime-local"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#00703C] mb-4"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTimeEntry(null)}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleManualTimeEntry}
                        disabled={clockingId !== null || !entryTime}
                        className="flex-1 rounded-xl bg-[#00703C] py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {clockingId !== null ? (
                          <Loader2 size={12} className="animate-spin mx-auto" />
                        ) : (
                          `Save ${timeEntry.mode === "clockIn" ? "Clock In" : "Clock Out"}`
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE RECORDS TAB ───────────────────────────────────────────── */}
      {panelTab === "records" && (
        <div className="p-5">
          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-medium">No attendance records for today</p>
              <p className="text-[10px] text-slate-300 mt-1">Use Quick Clock to record staff attendance</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-12 gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                <div className="col-span-3">Staff</div>
                <div className="col-span-2 flex items-center gap-1">
                  <LogOut size={10} /> In
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <LogOut size={10} className="rotate-180" /> Out
                </div>
                <div className="col-span-2 text-center">Duration</div>
                <div className="col-span-3 text-right">Action</div>
              </div>

              {records.map((r) => (
                <div key={r.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50/50 transition-colors relative">
                  {/* Name + Dept */}
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      !r.clockOut ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {(r.Staff?.fullName || r.staffName || "?").split(" ").map((s: string) => s[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{r.Staff?.fullName || r.staffName || "Unknown"}</p>
                      <p className="text-[9px] text-slate-400 truncate">{r.Staff?.department || r.department || "—"}</p>
                    </div>
                  </div>

                  {/* Clock In */}
                  <div className="sm:col-span-2 flex sm:block items-center gap-2">
                    <span className="sm:hidden text-[9px] font-bold text-slate-400 uppercase">In</span>
                    <span className="text-xs font-semibold text-slate-600">{formatTime(r.clockIn)}</span>
                  </div>

                  {/* Clock Out */}
                  <div className="sm:col-span-2 flex sm:block items-center gap-2">
                    <span className="sm:hidden text-[9px] font-bold text-slate-400 uppercase">Out</span>
                    {r.clockOut ? (
                      <span className="text-xs font-semibold text-slate-600">{formatTime(r.clockOut)}</span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="sm:col-span-2 text-center">
                    {r.clockOut ? (
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatDuration(r.clockIn, r.clockOut)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-500">—</span>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="sm:col-span-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this attendance record?")) handleDelete(r.id);
                      }}
                      className="text-[9px] text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AppointmentsPanel ─────────────────────────────────────────────────────────

function AppointmentsPanel({ staffId, patients }: { staffId: string | null; patients: Patient[] }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [apptFilter, setApptFilter] = useState("all");

  // ── Create appointment form ───────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [formPatientSearch, setFormPatientSearch] = useState("");
  const [formPatientId, setFormPatientId] = useState<number | null>(null);
  const [formDepartment, setFormDepartment] = useState("Doctor");
  const [formStaffId, setFormStaffId] = useState<number | null>(null);
  const [formStaffList, setFormStaffList] = useState<any[]>([]);
  const [formDateTime, setFormDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return toLocalInputValue(now);
  });
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const formDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch ALL staff for the staff selector — no role filter
  useEffect(() => {
    fetch("/api/staffcreate")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const allStaff = data.staff;
          setFormStaffList(allStaff);
          // Auto-select the first staff member
          if (allStaff.length > 0 && formStaffId === null) {
            setFormStaffId(allStaff[0].id);
          }
        }
      })
      .catch(() => {});
  }, []); // only fetch once on mount

  // Close patient dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target as Node))
        setShowPatientDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredFormPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(formPatientSearch.toLowerCase()) ||
      p.lastName.toLowerCase().includes(formPatientSearch.toLowerCase()) ||
      p.patientNumber.toLowerCase().includes(formPatientSearch.toLowerCase())
  );

  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      const params = new URLSearchParams({ date: apptDate });
      if (apptFilter !== "all") params.set("status", apptFilter.toUpperCase());
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setAppointments([]);
    } finally {
      setApptLoading(false);
    }
  }, [apptDate, apptFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Auto-refresh every 15 seconds for real-time
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 15_000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId || !formDateTime) return;
    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formPatientId,
          staffId: formStaffId,
          createdById: staffId ? parseInt(staffId) : null,
          department: formDepartment,
          appointmentDate: new Date(formDateTime).toISOString(),
          reason: formReason || null,
          notes: formNotes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormSuccess(`Appointment created for ${patients.find(p => p.id === formPatientId)?.firstName} ${patients.find(p => p.id === formPatientId)?.lastName}`);
        setFormPatientId(null);
        setFormPatientSearch("");
        setFormReason("");
        setFormNotes("");
        setShowForm(false);
        fetchAppointments();
      } else {
        setFormError(data.error || "Failed to create appointment.");
      }
    } catch {
      setFormError("Network error.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const appendedStaff = formStaffList.filter((s: any) =>
    s.fullName.toLowerCase().includes(formPatientSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: Filters + Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
          className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#00703C]" />
        <select value={apptFilter} onChange={e => setApptFilter(e.target.value)}
          className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#00703C]">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{appointments.length} appointment(s)</span>
        <button onClick={() => { setShowForm(!showForm); setFormError(null); setFormSuccess(null); }}
          className={`text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all ${
            showForm ? "bg-slate-200 text-slate-600" : "bg-[#00703C] text-white hover:bg-emerald-800"
          }`}>
          {showForm ? "Cancel" : "+ New Appointment"}
        </button>
      </div>

      {/* ── CREATE APPOINTMENT FORM ───────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreateAppointment} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-emerald-50/70 px-5 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Schedule New Appointment</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient selector */}
            <div className="md:col-span-2" ref={formDropdownRef}>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Patient *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={formPatientId
                  ? `${patients.find(p => p.id === formPatientId)?.patientNumber} — ${patients.find(p => p.id === formPatientId)?.lastName}, ${patients.find(p => p.id === formPatientId)?.firstName}`
                  : formPatientSearch}
                  onChange={(e) => { if (formPatientId) setFormPatientId(null); setFormPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  placeholder="Search patient by name or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C] focus:bg-white" />
                {formPatientId && (
                  <button type="button" onClick={() => { setFormPatientId(null); setFormPatientSearch(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                    <X size={14} />
                  </button>
                )}
                {showPatientDropdown && !formPatientId && filteredFormPatients.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {filteredFormPatients.slice(0, 7).map((p) => (
                      <button key={p.id} type="button"
                        onClick={() => { setFormPatientId(p.id); setFormPatientSearch(""); setShowPatientDropdown(false); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#00703C] font-mono">{p.patientNumber}</span>
                          <span className="text-slate-700 font-semibold">{p.lastName}, {p.firstName}</span>
                        </div>
                        <span className="text-slate-400">{formatAge(p.age, p.ageUnit)} · {p.gender}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Department *</label>
              <select value={formDepartment} onChange={(e) => { setFormDepartment(e.target.value); setFormStaffId(null); }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium bg-white outline-none focus:border-[#00703C]">
                {[
                  { value: "Doctor", label: "Doctor" },
                  { value: "Dentist", label: "Dentist" },
                  { value: "Nurse_Midwife", label: "Nurse / Midwife" },
                  { value: "Radiology", label: "Radiologist / Sonographer" },
                  { value: "Laboratory", label: "Laboratory" },
                ].map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Staff */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assign To *</label>
              <select value={formStaffId ?? ""} onChange={(e) => setFormStaffId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium bg-white outline-none focus:border-[#00703C]">
                {formStaffList.length === 0 && <option value="">Loading staff...</option>}
                {formStaffList.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.fullName} — {s.role.replace(/_/g, " ")} ({s.department})</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date & Time *</label>
              <input type="datetime-local" value={formDateTime}
                onChange={(e) => setFormDateTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Reason</label>
              <input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g., Follow-up, Routine checkup..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notes (optional)</label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                placeholder="Any additional instructions or notes..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>

            {formError && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl">{formError}</div>
            )}
            {formSuccess && (
              <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 size={13} /> {formSuccess}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting || !formPatientId || !formDateTime}
                className="flex items-center gap-1.5 rounded-xl bg-[#00703C] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 transition-all disabled:opacity-50">
                {formSubmitting ? <><Loader2 size={13} className="animate-spin" /> Scheduling...</> : <><Calendar size={13} /> Schedule Appointment</>}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── APPOINTMENTS LIST ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
            {new Date(apptDate + "T12:00:00").toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {apptLoading ? (
          <div className="py-16 flex items-center justify-center text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No appointments for this date</p>
            <p className="text-xs text-slate-300 mt-1">Click "+ New Appointment" above to schedule one</p>
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
                    <span className="text-sm font-semibold text-slate-800">
                      {a.Patient?.lastName}, {a.Patient?.firstName}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      a.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                      a.status === "COMPLETED" ? "bg-green-50 text-green-600" :
                      a.status === "CONFIRMED" ? "bg-blue-50 text-blue-600" :
                      "bg-amber-50 text-amber-600"
                    }`}>
                      {a.status}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {a.department}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {a.Patient?.patientNumber} · {new Date(a.appointmentDate).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                    {a.Patient?.phoneNumber && ` · ${a.Patient.phoneNumber}`}
                  </div>
                  {a.reason && <div className="text-xs text-slate-500 mt-1">{a.reason}</div>}
                  {a.notes && <div className="text-[11px] text-slate-400 mt-0.5 italic">{a.notes}</div>}
                  {a.Staff && <div className="text-[10px] text-slate-400 mt-0.5">with {a.Staff.fullName} ({a.Staff.department})</div>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {a.status === "PENDING" && (
                    <button onClick={async () => {
                      await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status: "CONFIRMED" }) });
                      setAppointments((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CONFIRMED" } : x));
                    }}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors">
                      Confirm
                    </button>
                  )}
                  {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                    <button onClick={async () => {
                      await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
                      setAppointments((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: "CANCELLED" } : x));
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
    </div>
  );
}

// ─── QuickAddPanel (catalog-wide service quick-add) ────────────────────────────

const CATEGORIES: { key: string; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Drug", label: "Drugs" },
  { key: "Sundry", label: "Sundries" },
  { key: "Procedures", label: "Procedures" },
  { key: "Add-Ons", label: "Add-Ons" },
  { key: "Dental", label: "Dental" },
  { key: "Lab Test", label: "Lab Tests" },
  { key: "Radiology", label: "Radiology" },
  { key: "Copay", label: "Copay" },
  { key: "Consultation", label: "Consultations" },
  { key: "Beds", label: "Beds" },
  { key: "Packages", label: "Packages" },
  { key: "Cardiology", label: "Cardiology" },
  { key: "NonMedicalCategory", label: "Non-Medical" },
  { key: "Custom", label: "Custom" },
];

function QuickAddPanel({ setBillLines, setInvoiceConfirmed }: {
  setBillLines: React.Dispatch<React.SetStateAction<BillLine[]>>;
  setInvoiceConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [customItems, setCustomItems] = useState<CatalogItemWithCategory[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("MSMC_CUSTOM_CATALOG_ITEMS");
      if (raw) {
        const parsed: CatalogItemWithCategory[] = JSON.parse(raw);
        setCustomItems(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const hasActiveFilter = category !== "All" || search.trim().length > 0;

  /* Merge custom catalog items from localStorage */
  const catalog = useMemo(
    () => (customItems.length > 0 ? [...FULL_SERVICE_CATALOG, ...customItems] : FULL_SERVICE_CATALOG),
    [customItems]
  );

  /* Filter + sort */
  let filtered = catalog;
  if (category !== "All") {
    filtered = filtered.filter((i) => i.category === category);
  }
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
    filtered = [...filtered].sort((a, b) => {
      const q = search.toLowerCase().trim();
      const aExact = a.code.toLowerCase() === q ? 0 : 1;
      const bExact = b.code.toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = a.code.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.code.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aNameStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bNameStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aNameStarts !== bNameStarts) return aNameStarts - bNameStarts;
      return a.name.localeCompare(b.name);
    });
  } else {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  /* Cap at 50 when browsing a category without a search term */
  const showCapped = category !== "All" && !search.trim();
  const displayList = showCapped ? filtered.slice(0, 50) : filtered;

  const getEffectivePrice = (item: CatalogItemWithCategory): number =>
    getServicePrice(item.code, item.defaultPrice);

  const handleEditSave = (item: CatalogItemWithCategory) => {
    const price = Math.max(0, Math.round(parseInt(editPriceValue.replace(/,/g, "")) || 0));
    setServicePrice(item.code, price);
    setEditingPrice(null);
  };

  const addToBill = (item: CatalogItemWithCategory) => {
    const price = getEffectivePrice(item);
    setBillLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: `${item.code} — ${item.name}`, qty: 1, unitPrice: price, subtotal: price },
    ]);
    setInvoiceConfirmed(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Package size={14} className="text-amber-600" />
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Quick Add
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-400 font-medium">
            {catalog.length} items
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div>
          {/* Search row */}
          <div className="px-4 pt-3 pb-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-[11px] font-medium outline-none transition focus:border-[#00703C] focus:bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-colors ${
                  category === cat.key
                    ? "bg-[#00703C] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results or empty state */}
          {!hasActiveFilter ? (
            <div className="px-4 py-10 text-center">
              <Package size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-400">Select a category or type a search term</p>
              <p className="text-[10px] text-slate-300 mt-1">Browse {catalog.length} services across {CATEGORIES.length} categories</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Search size={24} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-400">No items match your search</p>
              <p className="text-[10px] text-slate-300 mt-1">Try a different term or category</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {displayList.map((item) => {
                const currentPrice = getEffectivePrice(item);
                const isEditing = editingPrice === item.code;
                return (
                  <div
                    key={item.code}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50/50 transition group"
                  >
                    <button
                      onClick={() => addToBill(item)}
                      className="flex-1 min-w-0 text-left"
                      title={`Add ${item.name} to bill`}
                    >
                      <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">
                        <span className="font-mono text-[10px] text-amber-600">{item.code}</span>{" "}
                        {item.name}
                        {item.needsPricing && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-700">
                            Needs Pricing
                          </span>
                        )}
                      </p>
                      <span className="text-[9px] text-slate-400">{item.category}</span>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(item);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                            className="w-20 rounded-lg border border-[#00703C] px-2 py-1 text-[10px] font-bold text-right outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleEditSave(item)}
                            className="text-[#00703C] hover:text-emerald-700 p-0.5">
                            <CheckCircle2 size={12} />
                          </button>
                          <button onClick={() => setEditingPrice(null)}
                            className="text-slate-400 hover:text-rose-500 p-0.5">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          {!item.needsPricing && (
                            <button
                              onClick={() => addToBill(item)}
                              className="rounded-lg bg-[#00703C]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#00703C] hover:bg-[#00703C]/20 transition"
                            >
                              + {formatUGX(currentPrice)}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingPrice(item.code);
                              setEditPriceValue(String(currentPrice));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-600 p-1 transition-all"
                            title="Edit price"
                          >
                            <Pencil size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {showCapped && filtered.length > 50 && (
                <div className="px-4 py-2.5 text-center border-t border-slate-50">
                  <p className="text-[10px] font-medium text-slate-400">
                    Showing 50 of {filtered.length} &mdash; type to search for more
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Count badge */}
          {filtered.length > 0 && (
            <div className="border-t border-slate-50 px-4 py-1.5 text-[9px] text-slate-400 text-right">
              {displayList.length} of {catalog.length} items
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BillingHistory (Receipts Tab) ─────────────────────────────────────────────

function BillingHistory() {
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const fetchBilled = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = `/api/receptionist?billed=true${q ? `&search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) setRecords(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchBilled(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchBilled]);

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
  };

  const buildReceiptHtmlFromRecord = (record: any) => {
    const dt = new Date(record.billing.createdAt);
    const dateStr = dt.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
    const linesHtml = (record.billing.lines || [])
      .map(
        (l: any) =>
          `<tr>
            <td style="padding:3px 4px;font-size:10px;line-height:1.4">${l.description}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:center">${l.qty}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:right">${formatUGX(l.unitPrice)}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:right;font-weight:600">${formatUGX(l.subtotal)}</td>
          </tr>`
      )
      .join("");

    const pm = record.billing.paymentMethod;
    const totalAmt = record.billing.amount;
    const paidAmt = record.billing.amountPaid;
    let pmtHtml = "";
    if (pm === "CASH") {
      const chg = paidAmt - totalAmt;
      pmtHtml = `
        <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Tendered</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:600">${formatUGX(paidAmt)}</td></tr>
        <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Change</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:700;color:#059669">${formatUGX(Math.max(0, chg))}</td></tr>`;
    }
    if (record.billing.paymentRef && (pm === "MOBILE_MONEY" || pm === "CARD")) {
      pmtHtml += `<tr><td colspan="2" style="padding:2px 4px;font-size:9px;color:#475569">Ref: ${record.billing.paymentRef}</td></tr>`;
    }
    if (pm === "INSURANCE" && record.billing.insuranceProvider) {
      pmtHtml += `<tr><td colspan="2" style="padding:2px 4px;font-size:9px;color:#475569">Provider: ${record.billing.insuranceProvider}${record.billing.insurancePolicyNumber ? ` &middot; Policy: ${record.billing.insurancePolicyNumber}` : ""}</td></tr>`;
    }

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Receipt - ${record.billing.invoiceNumber}</title>
    <style>
      @page { margin: 12mm; }
      body { margin:0; padding:0; font-family:'Courier New',monospace; color:#0f172a; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      .watermark { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:-1; opacity:0.1; }
      .watermark img { width:50%; height:auto; max-width:400px; }
      .header { text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px dashed #64748b; }
      .header h1 { font-size:16px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1px; }
      .header p { font-size:9px; color:#334155; margin:2px 0 0 0; }
      .title { text-align:center; margin-bottom:12px; }
      .title h2 { font-size:14px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1.5px; color:#00703C; }
      table.info { width:100%; font-size:10px; margin-bottom:8px; border-collapse:collapse; }
      table.info td { padding:2px 4px; }
      table.info td:first-child { color:#475569; white-space:nowrap; }
      table.info td:last-child { font-weight:700; text-align:right; }
      .items-header { border-top:1px solid #cbd5e1; border-bottom:2px solid #0f172a; margin:8px 0; padding:4px 0; }
      .items-header table { width:100%; border-collapse:collapse; }
      .items-header th { font-size:9px; color:#334155; text-transform:uppercase; padding:4px; }
      table.items { width:100%; border-collapse:collapse; }
      table.items td { border-bottom:1px dotted #cbd5e1; }
      table.totals { width:100%; font-size:11px; margin-top:4px; border-collapse:collapse; }
      table.totals td { padding:3px 4px; }
      .footer { border-top:2px dashed #64748b; margin-top:16px; padding-top:8px; text-align:center; font-size:8px; color:#475569; }
      .footer p { margin:2px 0; }
    </style></head>
<body>
  <div class="watermark"><img src="/Images/LOGO.jpg" alt="" /></div>
  <div class="header">
    <h1>Main Street Medical Center</h1>
    <p>Commitment to Good Health</p>
    <p>P.O. Box &mdash; Kampala, Uganda</p>
  </div>
  <div class="title"><h2>Payment Receipt</h2></div>
  <table class="info">
    <tr><td>Invoice:</td><td>${record.billing.invoiceNumber}</td></tr>
    <tr><td>Patient:</td><td>${record.lastName}, ${record.firstName}</td></tr>
    <tr><td>ID:</td><td style="color:#00703C">${record.patientNumber}</td></tr>
    <tr><td>Date:</td><td>${dateStr}</td></tr>
    <tr><td>Time:</td><td>${timeStr}</td></tr>
    <tr><td>Method:</td><td>${pm.replace("_", " ")}</td></tr>
  </table>
  <div class="items-header"><table><tr>
    <th style="text-align:left;width:45%">Item</th>
    <th style="text-align:center;width:12%">Qty</th>
    <th style="text-align:right;width:20%">Price</th>
    <th style="text-align:right;width:23%">Total</th>
  </tr></table></div>
  <table class="items">${linesHtml}</table>
  <table class="totals">
    <tr><td style="font-weight:800;text-transform:uppercase;font-size:13px">Total Due</td><td style="font-weight:800;text-align:right;font-size:13px;color:#00703C">${formatUGX(totalAmt)}</td></tr>
    ${pmtHtml}
  </table>
  <div class="footer">
    <p>Thank you for choosing Main Street Medical Center</p>
    <p>This is a computer-generated receipt</p>
  </div>
</body></html>`;
  };

  const handlePrintFromHistory = (record: any) => {
    const html = buildReceiptHtmlFromRecord(record);
    if (!html || !printFrameRef.current) return;
    const iframe = printFrameRef.current;
    iframe.srcdoc = html;
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow?.print(); } catch { alert("Print failed. Try Download instead."); }
      }, 300);
    };
  };

  const handleDownloadFromHistory = (record: any) => {
    const html = buildReceiptHtmlFromRecord(record);
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${record.billing.invoiceNumber || "receipt"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} style={{ position: "absolute", width: 0, height: 0, border: "none" }} title="print-frame-receipts" />

      {/* Left panel — search + list */}
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">
            <FileText size={13} className="inline mr-1.5 text-teal-500" />
            Billing Receipts History
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name or ID…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm font-semibold outline-none transition focus:border-[#00703C] focus:bg-white"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-400">Loading receipts…</p>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Receipt size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-medium text-slate-400">No billed patients found</p>
            <p className="text-xs text-slate-300 mt-0.5">{search ? "Try a different search term" : "Billed patients will appear here after payments are processed"}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {records.map((rec) => (
              <button
                key={rec.billing.id}
                onClick={() => { setSelectedRecord(rec); setReceiptVisible(true); }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-left shadow-sm hover:bg-slate-50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{rec.lastName}, {rec.firstName}</span>
                    <span className="text-[10px] font-mono text-amber-600">{rec.patientNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span className="font-mono text-teal-600 font-bold">{rec.billing.invoiceNumber}</span>
                    <span>·</span>
                    <span>{formatDate(rec.billing.createdAt)}</span>
                    <span>·</span>
                    <span className="font-bold">{rec.billing.paymentMethod.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-sm font-extrabold text-[#00703C]">{formatUGX(rec.billing.amount)}</span>
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — receipt preview / details */}
      <div className="lg:col-span-1">
        {selectedRecord && receiptVisible ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Receipt Details</h3>
              <button onClick={() => { setReceiptVisible(false); setSelectedRecord(null); }}
                className="text-slate-300 hover:text-rose-500 p-0.5">
                <X size={14} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-bold text-teal-700">{selectedRecord.billing.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold text-slate-800">{selectedRecord.lastName}, {selectedRecord.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-bold text-[#00703C]">{selectedRecord.patientNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span>{formatDate(selectedRecord.billing.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-bold">{selectedRecord.billing.paymentMethod.replace("_", " ")}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-2 space-y-1">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Items</div>
                {(selectedRecord.billing.lines || []).map((line: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="truncate text-slate-600">{line.description}</span>
                    <span className="font-bold text-slate-700 flex-shrink-0 ml-2">{formatUGX(line.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-base">
                <span>Total</span><span className="text-[#00703C]">{formatUGX(selectedRecord.billing.amount)}</span>
              </div>
              {selectedRecord.billing.paymentMethod === "CASH" && selectedRecord.billing.amountPaid > selectedRecord.billing.amount && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Change</span>
                  <span className="font-bold text-emerald-600">{formatUGX(selectedRecord.billing.amountPaid - selectedRecord.billing.amount)}</span>
                </div>
              )}
              {selectedRecord.billing.paymentRef && (
                <div className="text-[9px] text-slate-400 text-center pt-1">Ref: {selectedRecord.billing.paymentRef}</div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handlePrintFromHistory(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition">
                <Printer size={12} /> Print
              </button>
              <button onClick={() => handleDownloadFromHistory(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#00703C] hover:bg-emerald-50 transition">
                <FileText size={12} /> Download
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <FileText size={24} className="mx-auto text-slate-200 mb-2" />
            <p className="text-xs font-medium text-slate-400">Select a receipt</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Click a billed patient to view full receipt details</p>
          </div>
        )}
      </div>

      {/* Full-screen receipt modal (alternative view) */}
      {selectedRecord && receiptVisible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#00703C] px-6 py-5 text-center text-white">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Receipt</h3>
              <p className="text-[10px] mt-0.5 text-emerald-100">Main Street Medical Center</p>
            </div>
            <div className="px-6 py-4 space-y-2 font-mono text-xs text-slate-700">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span>Invoice</span><span>{selectedRecord.billing.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold">{selectedRecord.lastName}, {selectedRecord.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-bold text-[#00703C]">{selectedRecord.patientNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span>{formatDate(selectedRecord.billing.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-bold">{selectedRecord.billing.paymentMethod.replace("_", " ")}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Items</div>
                {(selectedRecord.billing.lines || []).map((line: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="truncate text-slate-600">{line.description}</span>
                    <span className="font-bold text-slate-700 flex-shrink-0 ml-2">{formatUGX(line.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-lg">
                <span>TOTAL BILL</span><span className="text-[#00703C]">{formatUGX(selectedRecord.billing.amount)}</span>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => handlePrintFromHistory(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition">
                <Printer size={12} /> Print Receipt
              </button>
              <button onClick={() => handleDownloadFromHistory(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#00703C] hover:bg-emerald-50 transition">
                <FileText size={12} /> Download
              </button>
              <button onClick={() => { setReceiptVisible(false); setSelectedRecord(null); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-200 transition">
                <X size={12} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CashierPOS ───────────────────────────────────────────────────────────────

function CashierPOS({ patients, directBillPatient, onBillingComplete }: { patients: Patient[]; directBillPatient?: Patient | null; onBillingComplete?: () => void }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [billLines, setBillLines] = useState<BillLine[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState("");

  // ── Results modal state ────────────────────────────────────────────────
  const [resultsModalPatient, setResultsModalPatient] = useState<{
    name: string; number: string; age: number; ageUnit: string; gender: string;
  } | null>(null);

  // ── Partial / resume-bill state ──────────────────────────────────────────
  const [isResumeBill, setIsResumeBill] = useState(false);
  const [resumeBillId, setResumeBillId] = useState<number | null>(null);
  const [existingAmountPaid, setExistingAmountPaid] = useState(0);
  const [partialBillPatients, setPartialBillPatients] = useState<PartialBillPatient[]>([]);

  const subtotal = billLines.reduce((s, l) => s + l.subtotal, 0);
  const total = subtotal;
  const tendered = parseFloat(amountTendered) || 0;
  const change = tendered - total;
  const balanceDue = Math.max(0, total - tendered);
  const isPartialPayment = balanceDue > 0;

  const canConfirm = !!selectedPatient && billLines.length > 0;
  const canPay = invoiceConfirmed
    && tendered > 0
    && (paymentMethod !== "MOBILE_MONEY" || paymentReference.trim().length > 0)
    && (paymentMethod !== "CARD" || paymentReference.trim().length > 0)
    && (paymentMethod !== "INSURANCE" || insuranceProvider.trim().length > 0);

  // ── Auto-select patient for direct billing ──────────────────────────────
  useEffect(() => {
    if (directBillPatient) {
      setSelectedPatient(directBillPatient);
      setPatientSearch("");
      setInvoiceConfirmed(false);
    }
  }, [directBillPatient]);

  // ── Fetch patients with partial bills (for the queue) ───────────────────
  const fetchPartialBillPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/receptionist?status=PARTIAL");
      if (res.ok) setPartialBillPatients(await res.json());
    } catch {}
  }, []);

  // ── Fetch a single patient's partial bill (for resume flow) ────────────
  const fetchPatientBill = useCallback(async (patientId: number): Promise<BillingRecord | null> => {
    try {
      const res = await fetch(`/api/receptionist?patientId=${patientId}&status=PARTIAL`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.[0] ?? null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    fetchPartialBillPatients();
  }, [fetchPartialBillPatients]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.lastName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patientNumber.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const slugify = (s: string) =>
    s.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/^_|_$/g, "");

  const handleAddLine = () => {
    const desc = newDesc.trim();
    const qty = parseInt(newQty) || 1;
    const price = parseFloat(newPrice.replace(/,/g, "")) || 0;
    if (!desc || price <= 0) return;
    setBillLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: desc, qty, unitPrice: price, subtotal: qty * price },
    ]);
    if (saveToCatalog) {
      const code = `CUSTOM-${slugify(desc)}-${Date.now()}`;
      const customItem: CatalogItemWithCategory = {
        code,
        name: desc,
        defaultPrice: price,
        category: "Custom",
      };
      try {
        const raw = localStorage.getItem("MSMC_CUSTOM_CATALOG_ITEMS");
        const existing: CatalogItemWithCategory[] = raw ? JSON.parse(raw) : [];
        existing.push(customItem);
        localStorage.setItem("MSMC_CUSTOM_CATALOG_ITEMS", JSON.stringify(existing));
      } catch { /* localStorage full or unavailable — silently skip */ }
    }
    setNewDesc(""); setNewQty("1"); setNewPrice(""); setSaveToCatalog(false);
    setInvoiceConfirmed(false);
  };

  const updateLineQty = (id: string, delta: number) => {
    setBillLines((prev) =>
      prev
        .map((l) =>
          l.id === id
            ? { ...l, qty: l.qty + delta, subtotal: (l.qty + delta) * l.unitPrice }
            : l
        )
        .filter((l) => l.qty > 0)
    );
    setInvoiceConfirmed(false);
  };

  const removeLine = (id: string) => {
    setBillLines((prev) => prev.filter((l) => l.id !== id));
    setInvoiceConfirmed(false);
  };

  const handleProcessPayment = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    try {
      const payload: any = {
        patientId: selectedPatient.id,
        paymentMethod,
        reference: ["MOBILE_MONEY", "CARD"].includes(paymentMethod) ? paymentReference : null,
        insuranceProvider: paymentMethod === "INSURANCE" ? insuranceProvider : null,
        insurancePolicyNumber: paymentMethod === "INSURANCE" ? insurancePolicyNumber : null,
        lines: billLines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
          subtotal: l.subtotal,
        })),
      };

      let action: string;
      if (isResumeBill && resumeBillId) {
        // Follow-up payment on an existing partial bill
        action = "ADD_PAYMENT";
        payload.billingId = resumeBillId;
        payload.additionalAmountPaid = tendered;
      } else {
        // First payment — create a new bill
        action = "CREATE_BILL";
        payload.amountTendered = tendered;
        payload.amountPaid = tendered;
        payload.balanceDue = balanceDue;
        payload.visitId = null;
      }

      const res = await fetch("/api/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });

      if (!res.ok) {
        const body = await res.json();
        alert(`Payment failed: ${body.error}`);
        return;
      }

      const data = await res.json();
      setSavedInvoiceNumber(
        data.invoiceNumber ?? `INV-${selectedPatient.patientNumber}-${Date.now().toString().slice(-5)}`
      );
      setReceiptVisible(true);
    } catch {
      alert("Network error — payment could not be processed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Build standalone receipt HTML (used by both print & download) ───────
  const buildReceiptHtml = (forPrint: boolean) => {
    if (!selectedPatient) return "";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
    const itemsHtml = billLines
      .map(
        (l) =>
          `<tr>
            <td style="padding:3px 4px;font-size:10px;line-height:1.4">${l.description}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:center">${l.qty}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:right">${formatUGX(l.unitPrice)}</td>
            <td style="padding:3px 4px;font-size:10px;text-align:right;font-weight:600">${formatUGX(l.subtotal)}</td>
          </tr>`
      )
      .join("");

    let paymentExtraHtml = "";
    if (isPartialPayment || existingAmountPaid > 0) {
      // Partial payment or resume — show cumulative payment info
      if (existingAmountPaid > 0) {
        paymentExtraHtml += `
          <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Previously Paid</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:600">${formatUGX(existingAmountPaid)}</td></tr>`;
      }
      paymentExtraHtml += `
        <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Amount Paid</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:600">${formatUGX(tendered)}</td></tr>`;
      if (balanceDue > 0) {
        paymentExtraHtml += `
          <tr><td style="color:#dc2626;padding:2px 4px;font-size:10px;font-weight:700">Balance Owing</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:700;color:#dc2626">${formatUGX(balanceDue)}</td></tr>
          <tr><td colspan="2" style="padding:2px 4px;font-size:9px;font-weight:700;color:#d97706;text-align:center">PARTIAL PAYMENT</td></tr>`;
      } else if (existingAmountPaid > 0) {
        // Now fully paid after resume
        paymentExtraHtml += `
          <tr><td colspan="2" style="padding:2px 4px;font-size:9px;font-weight:700;color:#059669;text-align:center">PAID IN FULL</td></tr>`;
      }
    } else if (paymentMethod === "CASH") {
      paymentExtraHtml = `
        <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Tendered</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:600">${formatUGX(tendered)}</td></tr>
        <tr><td style="color:#334155;padding:2px 4px;font-size:10px">Change</td><td style="padding:2px 4px;text-align:right;font-size:10px;font-weight:700;color:#059669">${formatUGX(change)}</td></tr>`;
    }
    if ((paymentMethod === "MOBILE_MONEY" || paymentMethod === "CARD") && paymentReference) {
      paymentExtraHtml += `<tr><td colspan="2" style="padding:2px 4px;font-size:9px;color:#64748b">Ref: ${paymentReference}</td></tr>`;
    }
    if (paymentMethod === "INSURANCE" && insuranceProvider) {
      paymentExtraHtml += `<tr><td colspan="2" style="padding:2px 4px;font-size:9px;color:#64748b">Provider: ${insuranceProvider}${insurancePolicyNumber ? ` &middot; Policy: ${insurancePolicyNumber}` : ""}</td></tr>`;
    }

    const autoPrintScript = forPrint
      ? '<script>window.onload=function(){window.setTimeout(function(){window.print();window.close()},400)};<\/script>'
      : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Receipt - ${savedInvoiceNumber}</title>
		<style>
		  @page { margin: 12mm; }
		  body { margin:0; padding:0; font-family:'Courier New',monospace; color:#0f172a; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
		  .watermark { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:-1; opacity:0.1; }
		  .watermark img { width:50%; height:auto; max-width:400px; }
		  .header { text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px dashed #64748b; }
	  .header h1 { font-size:16px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1px; }
	  .header p { font-size:9px; color:#334155; margin:2px 0 0 0; }
	  .title { text-align:center; margin-bottom:12px; }
	  .title h2 { font-size:14px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:1.5px; color:#00703C; }
	  table.info { width:100%; font-size:10px; margin-bottom:8px; border-collapse:collapse; }
	  table.info td { padding:2px 4px; }
	  table.info td:first-child { color:#475569; white-space:nowrap; }
	  table.info td:last-child { font-weight:700; text-align:right; }
	  .items-header { border-top:1px solid #cbd5e1; border-bottom:2px solid #0f172a; margin:8px 0; padding:4px 0; }
	  .items-header table { width:100%; border-collapse:collapse; }
	  .items-header th { font-size:9px; color:#334155; text-transform:uppercase; padding:4px; }
	  table.items { width:100%; border-collapse:collapse; }
	  table.items td { border-bottom:1px dotted #cbd5e1; }
	  table.totals { width:100%; font-size:11px; margin-top:4px; border-collapse:collapse; }
	  table.totals td { padding:3px 4px; }
	  .footer { border-top:2px dashed #64748b; margin-top:16px; padding-top:8px; text-align:center; font-size:8px; color:#475569; }
	  .footer p { margin:2px 0; }
	</style></head>
<body>
  <div class="watermark"><img src="/Images/LOGO.jpg" alt="" /></div>
  <div class="header">
    <h1>Main Street Medical Center</h1>
    <p>Commitment to Good Health</p>
    <p>P.O. Box &mdash; Kampala, Uganda</p>
  </div>
  <div class="title"><h2>Payment Receipt</h2></div>
  <table class="info">
    <tr><td>Invoice:</td><td>${savedInvoiceNumber}</td></tr>
    <tr><td>Patient:</td><td>${selectedPatient.lastName}, ${selectedPatient.firstName}</td></tr>
    <tr><td>ID:</td><td style="color:#00703C">${selectedPatient.patientNumber}</td></tr>
    <tr><td>Date:</td><td>${dateStr}</td></tr>
    <tr><td>Time:</td><td>${timeStr}</td></tr>
    <tr><td>Method:</td><td>${paymentMethod.replace("_", " ")}</td></tr>
  </table>
  <div class="items-header">
    <table><tr>
      <th style="text-align:left;width:45%">Item</th>
      <th style="text-align:center;width:12%">Qty</th>
      <th style="text-align:right;width:20%">Price</th>
      <th style="text-align:right;width:23%">Total</th>
    </tr></table>
  </div>
  <table class="items">${itemsHtml}</table>
  <table class="totals">
    <tr><td style="font-weight:800;text-transform:uppercase;font-size:13px">Total Due</td><td style="font-weight:800;text-align:right;font-size:13px;color:#00703C">${formatUGX(total)}</td></tr>
    ${paymentExtraHtml}
  </table>
  <div class="footer">
    <p>Thank you for choosing Main Street Medical Center</p>
    <p>This is a computer-generated receipt</p>
  </div>
  ${autoPrintScript}
</body></html>`;
  };

	  // ── Print receipt using a hidden iframe (no popup, no save-to-PC) ──────
	  const iframeRef = useRef<HTMLIFrameElement>(null);
	  const handlePrintReceipt = () => {
	    const html = buildReceiptHtml(false);
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

  // ── Download receipt as an HTML file ────────────────────────────────────
  const handleDownloadReceipt = () => {
    const html = buildReceiptHtml(false);
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${savedInvoiceNumber || "receipt"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewBill = async () => {
    setSelectedPatient(null); setPatientSearch(""); setBillLines([]);
    setNewDesc(""); setNewQty("1"); setNewPrice("");
    setPaymentMethod("CASH"); setAmountTendered(""); setPaymentReference("");
    setInsuranceProvider(""); setInsurancePolicyNumber("");
    setInvoiceConfirmed(false); setReceiptVisible(false); setSavedInvoiceNumber("");
    setIsResumeBill(false); setResumeBillId(null); setExistingAmountPaid(0);
    onBillingComplete?.();
  };

  // ── Resume a partial bill: restore lines from saved bill ────────────────
  const handleResumePartialBill = async (patient: Patient & { billingId: number }) => {
    const bill = await fetchPatientBill(patient.id);
    if (!bill) {
      alert("Could not load the saved bill.");
      return;
    }
    // Restore bill lines from the description JSON
    try {
      const desc = JSON.parse(bill.description || "{}");
      if (desc.lines && Array.isArray(desc.lines)) {
        setBillLines(
          desc.lines.map((l: any) => ({
            id: crypto.randomUUID(),
            description: l.description || l.name || "",
            qty: l.qty || 1,
            unitPrice: l.unitPrice || 0,
            subtotal: l.subtotal || (l.qty || 1) * (l.unitPrice || 0),
          }))
        );
      }
    } catch {}
    setSelectedPatient(patient);
    setPatientSearch("");
    setIsResumeBill(true);
    setResumeBillId(bill.id);
    setExistingAmountPaid(bill.amountPaid);
    setAmountTendered("");
    setInvoiceConfirmed(true); // skip invoice review step
  };

  const waitingCashier = patients.filter(p => p.status === "AWAITING_CASHIER");

  // Combined queue: AWAITING_CASHIER patients + PARTIAL-bill patients not already in the queue
  const mergedQueue = [
    ...waitingCashier.map(p => {
      const partial = partialBillPatients.find(pp => pp.id === p.id);
      return {
        ...p,
        queueType: (partial ? "partial" : "new") as "new" | "partial",
        billingId: partial?.billingId ?? 0,
        balanceDue: partial?.balanceDue ?? 0,
      };
    }),
    ...partialBillPatients
      .filter(p => !waitingCashier.some(w => w.id === p.id))
      .map(p => ({
        id: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        ageUnit: "years",
        gender: p.gender,
        dob: null as string | null,
        phone: null as string | null,
        address: null as string | null,
        chiefComplaint: "Balance collection",
        isEmergency: false,
        status: p.status,
        createdAt: new Date().toISOString(),
        queueType: "partial" as const,
        billingId: p.billingId,
        balanceDue: p.balanceDue,
      })),
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Awaiting Cashier Queue ── */}
      {mergedQueue.length > 0 && !selectedPatient && (
        <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-amber-600" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700">
                Patients Awaiting Payment
              </span>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
              {mergedQueue.length} waiting
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
            {mergedQueue.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  if (p.queueType === "partial") {
                    handleResumePartialBill(p as any);
                  } else {
                    setSelectedPatient(p);
                    setPatientSearch("");
                    setInvoiceConfirmed(false);
                  }
                }}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    p.queueType === "partial" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{p.lastName}, {p.firstName}</div>
                    <div className="text-xs text-slate-400">
                      {p.queueType === "partial" && (
                        <span className="font-bold text-rose-500">
                          Balance: {formatUGX(p.balanceDue)} &middot;{" "}
                        </span>
                      )}
                      <span className="font-mono text-amber-600">{p.patientNumber}</span>
                      <span className="mx-1">·</span>
                      {formatAge(p.age, (p as any).ageUnit || "years")} · {p.gender}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setResultsModalPatient({
                          name: `${p.lastName}, ${p.firstName}`,
                          number: p.patientNumber,
                          age: p.age,
                          ageUnit: (p as any).ageUnit || "years",
                          gender: p.gender,
                        });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setResultsModalPatient({
                            name: `${p.lastName}, ${p.firstName}`,
                            number: p.patientNumber,
                            age: p.age,
                            ageUnit: (p as any).ageUnit || "years",
                            gender: p.gender,
                          });
                        }
                      }}
                      className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <FileText size={10} className="inline mr-0.5" /> Results
                    </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    p.queueType === "partial"
                      ? "text-rose-700 bg-rose-50 border border-rose-100"
                      : "text-amber-700 bg-amber-50 border border-amber-100"
                  }`}>
                    {p.queueType === "partial" ? "Collect Balance" : "Bill Now"}
                  </span>
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mergedQueue.length === 0 && !selectedPatient && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 text-center">
          <Receipt size={28} className="mx-auto text-slate-200 mb-2" />
          <p className="text-sm font-medium text-slate-400">No patients awaiting payment</p>
          <p className="text-xs text-slate-300 mt-0.5">Patients will appear here after the doctor completes a consultation</p>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5">
      {/* ── LEFT ── */}
      <div className="space-y-4 lg:col-span-3">
        {/* Patient Selector */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Bill To — Patient
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={selectedPatient
                ? `${selectedPatient.patientNumber} — ${selectedPatient.lastName}, ${selectedPatient.firstName}`
                : patientSearch}
              onChange={(e) => {
                if (selectedPatient) setSelectedPatient(null);
                setPatientSearch(e.target.value);
                setShowDropdown(true);
                setInvoiceConfirmed(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search patient by name or ID…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm font-semibold outline-none transition focus:border-[#00703C] focus:bg-white"
            />
            {selectedPatient && (
              <button
                onClick={() => { setSelectedPatient(null); setPatientSearch(""); setInvoiceConfirmed(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <X size={15} />
              </button>
            )}
            {showDropdown && !selectedPatient && filteredPatients.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {filteredPatients.slice(0, 7).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); setShowDropdown(false); setInvoiceConfirmed(false); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#00703C] font-mono">{p.patientNumber}</span>
                      <span className="text-slate-700 font-semibold">{p.lastName}, {p.firstName}</span>
                    </div>
                    <span className="text-slate-400">{formatAge(p.age, p.ageUnit)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPatient && (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
              <span className="rounded bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 font-mono">{selectedPatient.patientNumber}</span>
              <span className="text-slate-500">{selectedPatient.gender} · {formatAge(selectedPatient.age, selectedPatient.ageUnit)}</span>
              {selectedPatient.phone && <span className="text-slate-500"><Phone size={10} className="inline mr-0.5" />{selectedPatient.phone}</span>}
              {selectedPatient.isEmergency && (
                <span className="rounded bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 flex items-center gap-1">
                  <ShieldAlert size={10} /> Emergency
                </span>
              )}
              <button
                onClick={() => setResultsModalPatient({
                  name: `${selectedPatient.lastName}, ${selectedPatient.firstName}`,
                  number: selectedPatient.patientNumber,
                  age: selectedPatient.age,
                  ageUnit: selectedPatient.ageUnit,
                  gender: selectedPatient.gender,
                })}
                className="ml-auto rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 px-2.5 py-1 flex items-center gap-1 font-extrabold uppercase tracking-wider transition-colors"
              >
                <FileText size={10} /> Print Results
              </button>
            </div>
          )}
        </div>

        {/* Add Item Form */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Add Item to Bill</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Service / Item Description *</label>
              <input
                type="text" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLine()}
                placeholder="e.g., Consultation, Lab test, Pharmacy…"
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-[#00703C]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Quantity</label>
                <input type="number" min="1" value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unit Price (UGX)</label>
                <input type="number" min="0" value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLine()}
                  placeholder="e.g., 20000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
              </div>
            </div>
            {newDesc && parseFloat(newPrice) > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                <span>{newDesc} × {newQty || 1}</span>
                <span>{formatUGX((parseInt(newQty) || 1) * (parseFloat(newPrice) || 0))}</span>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#00703C] accent-[#00703C] focus:ring-[#00703C]"
              />
              <span className="text-[11px] font-medium text-slate-500">Save to catalog for next time</span>
            </label>
            <button
              onClick={handleAddLine}
              disabled={!newDesc.trim() || !newPrice || parseFloat(newPrice) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Add to Bill
            </button>
          </div>
        </div>

        <QuickAddPanel setBillLines={setBillLines} setInvoiceConfirmed={setInvoiceConfirmed} />
      </div>

      {/* ── RIGHT ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Current Bill</p>
            {billLines.length > 0 && (
              <button onClick={() => { setBillLines([]); setInvoiceConfirmed(false); }}
                className="text-[10px] text-rose-400 hover:text-rose-600 font-bold flex items-center gap-0.5">
                <Trash2 size={10} /> Clear
              </button>
            )}
          </div>
          <div className="min-h-[120px] divide-y divide-slate-50 overflow-y-auto max-h-56">
            {billLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                <Receipt size={28} />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">No items added</p>
              </div>
            ) : (
              billLines.map((line) => (
                <div key={line.id} className="flex items-center gap-2 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-700">{line.description}</p>
                    <p className="text-[10px] text-slate-400">{formatUGX(line.unitPrice)} × {line.qty}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateLineQty(line.id, -1)} className="flex h-5 w-5 items-center justify-center rounded-lg border border-slate-200 text-slate-500 text-xs hover:border-rose-300 hover:text-rose-500 transition">−</button>
                    <span className="w-5 text-center text-[11px] font-black text-slate-800">{line.qty}</span>
                    <button onClick={() => updateLineQty(line.id, +1)} className="flex h-5 w-5 items-center justify-center rounded-lg border border-slate-200 text-slate-500 text-xs hover:border-emerald-300 hover:text-emerald-600 transition">+</button>
                    <button onClick={() => removeLine(line.id)} className="ml-1 text-slate-300 hover:text-rose-500 transition"><Trash2 size={12} /></button>
                  </div>
                  <span className="ml-1 text-[11px] font-extrabold text-slate-800 w-20 text-right flex-shrink-0">{formatUGX(line.subtotal)}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-5 py-3 space-y-1 bg-slate-50/40">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Subtotal</span><span className="font-bold">{formatUGX(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2 mt-1">
              <span>TOTAL DUE</span><span className="text-[#00703C]">{formatUGX(total)}</span>
            </div>
          </div>
          {!invoiceConfirmed && (
            <div className="px-5 pb-4">
              <button disabled={!canConfirm} onClick={() => setInvoiceConfirmed(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold uppercase tracking-widest transition-all bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">
                <FileText size={13} /> Confirm Invoice
              </button>
            </div>
          )}
          {invoiceConfirmed && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(["CASH", "MOBILE_MONEY", "CARD", "INSURANCE"] as PaymentMethod[]).map((method) => (
                  <button key={method} onClick={() => setPaymentMethod(method)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-all ${paymentMethod === method ? "border-[#00703C] bg-emerald-50 text-[#00703C]" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    {PAYMENT_ICONS[method]}{method.replace("_", " ")}
                  </button>
                ))}
              </div>
              {/* Amount Paid — shown for ALL payment methods */}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {paymentMethod === "CASH" ? "Amount Tendered (UGX)" : "Amount Paid (UGX)"}
                </label>
                <input type="number" min={0} value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="Enter amount…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                {tendered > 0 && (
                  <div className={`mt-2 flex justify-between rounded-xl px-3 py-2 text-xs font-extrabold ${
                    isPartialPayment
                      ? "bg-amber-50 text-amber-700"
                      : change >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-600"
                  }`}>
                    {isPartialPayment ? (
                      <>
                        <span>Amount to be Paid</span>
                        <span>{formatUGX(tendered)}</span>
                      </>
                    ) : change >= 0 ? (
                      <>
                        <span>Change</span>
                        <span>{formatUGX(change)}</span>
                      </>
                    ) : (
                      <>
                        <span>Shortfall</span>
                        <span>{formatUGX(Math.abs(change))}</span>
                      </>
                    )}
                  </div>
                )}
                {existingAmountPaid > 0 && (
                  <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] text-slate-600">
                    <span className="font-bold">Previously Paid:</span> {formatUGX(existingAmountPaid)} &middot;{" "}
                    <span className="font-bold">Balance Owing:</span> <span className="text-amber-600">{formatUGX(total - existingAmountPaid)}</span>
                  </div>
                )}
              </div>
              {paymentMethod === "CASH" && null /* amount field above handles all methods */}
              {(paymentMethod === "MOBILE_MONEY" || paymentMethod === "CARD") && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {paymentMethod === "MOBILE_MONEY" ? "Mobile Money Transaction ID" : "Card / POS Reference"}
                  </label>
                  <input type="text" value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter reference number…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                </div>
              )}
              {paymentMethod === "INSURANCE" && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Insurance Provider</label>
                    <input type="text" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)}
                      placeholder="e.g., UAP, ICEA, AAR…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Policy / Claim Number</label>
                    <input type="text" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      placeholder="Policy number…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                  </div>
                </div>
              )}
              <button disabled={!canPay || isProcessing} onClick={handleProcessPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00703C] py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <CheckCircle2 size={14} />
                {isProcessing ? "Processing…" : "Process Payment"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receiptVisible && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#00703C] px-6 py-5 text-center text-white">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Payment Received</h3>
              <p className="text-[10px] mt-0.5 text-emerald-100">Main Street Medical Center</p>
            </div>
            <div className="px-6 py-4 space-y-2 font-mono text-xs text-slate-700">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span>Invoice</span><span>{savedInvoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold">{selectedPatient.lastName}, {selectedPatient.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-bold text-[#00703C]">{selectedPatient.patientNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span>{new Date().toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-bold">{paymentMethod.replace("_", " ")}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Items</div>
                {billLines.map((line) => (
                  <div key={line.id} className="flex justify-between text-[10px]">
                    <span className="truncate text-slate-600">{line.description}</span>
                    <span className="font-bold text-slate-700 flex-shrink-0 ml-2">{formatUGX(line.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-lg">
                <span>TOTAL BILL</span><span className="text-[#00703C]">{formatUGX(total)}</span>
              </div>
              {isPartialPayment || existingAmountPaid > 0 ? (
                <>
                  {existingAmountPaid > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Previously Paid</span>
                      <span>{formatUGX(existingAmountPaid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Amount Paid</span>
                    <span>{formatUGX(tendered)}</span>
                  </div>
                  {balanceDue > 0 ? (
                    <>
                      <div className="flex justify-between text-sm font-extrabold text-amber-600 border-t border-dashed border-amber-200 pt-2 mt-1">
                        <span>Balance Owing</span>
                        <span>{formatUGX(balanceDue)}</span>
                      </div>
                      <div className="text-[9px] font-extrabold uppercase tracking-wider text-amber-500 bg-amber-50 rounded-lg px-3 py-1.5 text-center mt-2">
                        Partial Payment
                      </div>
                    </>
                  ) : existingAmountPaid > 0 ? (
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5 text-center mt-2">
                      Paid in Full
                    </div>
                  ) : null}
                </>
              ) : paymentMethod === "CASH" ? (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Tendered</span><span>{formatUGX(tendered)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Change</span>
                    <span className="font-bold text-emerald-600">{formatUGX(change)}</span>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={handlePrintReceipt}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition">
                <Printer size={12} /> Print Receipt
              </button>
              <button onClick={handleDownloadReceipt}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#00703C] hover:bg-emerald-50 transition">
                <FileText size={12} /> Download
              </button>
              <button onClick={handleNewBill}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00703C] py-3 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-800 transition">
                <CheckCircle2 size={12} /> Complete Billing
              </button>
            </div>
          </div>
        </div>
		      )}

		      {/* ── Results Modal ── */}
		      {resultsModalPatient && (
		        <ResultsModal
		          patientName={resultsModalPatient.name}
		          patientNumber={resultsModalPatient.number}
		          patientAge={resultsModalPatient.age}
		          patientAgeUnit={resultsModalPatient.ageUnit}
		          patientGender={resultsModalPatient.gender}
		          onClose={() => setResultsModalPatient(null)}
		        />
		      )}

		      {/* ── Hidden iframe for seamless receipt printing ── */}
			      <iframe ref={iframeRef} style={{ position: "absolute", width: 0, height: 0, border: "none" }} title="print-frame" />

			    </div>
			  </div>
			  );
		}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceptionistPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "register" | "cashier" | "attendance" | "schedule" | "receipts">("search");
  const [registrationMode, setRegistrationMode] = useState<"normal" | "emergency">("normal");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [isRouting, setIsRouting] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const [labOrderTarget, setLabOrderTarget] = useState<Patient | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [billPatient, setBillPatient] = useState<Patient | null>(null);
  const [directBillKey, setDirectBillKey] = useState(0);

  // ── Universal patient search (for Patient File panel) ─────────────────────
  const [universalSearchQuery, setUniversalSearchQuery] = useState("");
  const [universalSearchResults, setUniversalSearchResults] = useState<Patient[]>([]);
  const [universalSearchLoading, setUniversalSearchLoading] = useState(false);
  const [patientFilePatient, setPatientFilePatient] = useState<Patient | null>(null);
  const [patientFileOpen, setPatientFileOpen] = useState(false);

  const [staffId, setStaffId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", age: "", ageUnit: "years", gender: "",
    phone: "", address: "", chiefComplaint: "",
  });

  // ── Fetch all active (non-discharged) patients ────────────────────────────
  const fetchActiveRegistry = async () => {
    try {
      const res = await fetch("/api/receptionist");
      if (res.ok) setPatients(await res.json());
    } catch (err) {
      console.error("Registry sync failure:", err);
    }
  };

  // ── Universal patient search (across all patients including discharged) ──
  const fetchUniversalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUniversalSearchResults([]);
      setUniversalSearchLoading(false);
      return;
    }
    setUniversalSearchLoading(true);
    try {
      const res = await fetch(`/api/receptionist?scope=all&search=${encodeURIComponent(query.trim())}`);
      if (res.ok) setUniversalSearchResults(await res.json());
    } catch {
      setUniversalSearchResults([]);
    } finally {
      setUniversalSearchLoading(false);
    }
  }, []);

  // ── Debounced universal search ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUniversalSearch(universalSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [universalSearchQuery, fetchUniversalSearch]);

  useEffect(() => {
    // Show a loader (min ~800ms, max 4s) instead of flashing an empty
    // registry while the initial fetch is still in flight.
    setRegistryLoading(true);
    const started = Date.now();
    const cap = setTimeout(() => setRegistryLoading(false), 4000);
    fetchActiveRegistry().finally(() => {
      clearTimeout(cap);
      const remaining = Math.max(0, 800 - (Date.now() - started));
      setTimeout(() => setRegistryLoading(false), remaining);
    });
    try {
      const r = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (r) {
        const u = JSON.parse(r);
        if (u.staffId) setStaffId(u.staffId);
        else if (u.id) setStaffId(u.id);
        if (u.id) {
          fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) });
        }
      }
    } catch {}
    const interval = setInterval(fetchActiveRegistry, 15_000);
    const hb = setInterval(() => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {} }, 120000);
    return () => { clearInterval(interval); clearInterval(hb); };
  }, []);

  const normalFields = [
    { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "e.g., John" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Okello" },
    { id: "age", label: "Age", type: "number", required: true, placeholder: "" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "e.g., 0770000000" },
    { id: "address", label: "Residential Address", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Village, District details..." },
	    { id: "chiefComplaint", label: "Chief Complaint (optional)", type: "textarea", required: false, colSpan: "md:col-span-2", placeholder: "Reason for visit..." },
  ];

  const emergencyFields = [
    { id: "firstName", label: "First Name / Alias", type: "text", required: true, placeholder: "Use 'Unknown' if unresponsive" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Trauma Male Alpha" },
    { id: "age", label: "Estimated Age", type: "number", required: true, placeholder: "" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "chiefComplaint", label: "Emergency Presentation Details", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Describe presentation: RTA, severe bleeding..." },
  ];

  const activeFields = registrationMode === "emergency" ? emergencyFields : normalFields;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Register patient — uses action/payload ────────────────────────────────
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PATIENT",
          payload: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            age: formData.age,
            ageUnit: formData.ageUnit,
            gender: formData.gender,
            phone: registrationMode === "normal" ? formData.phone : null,
            address: registrationMode === "normal" ? formData.address : null,
            chiefComplaint: formData.chiefComplaint,
            isEmergency: registrationMode === "emergency",
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Registration failed.");
      }

      await fetchActiveRegistry();
      setActiveTab("search");
      setFormData({ firstName: "", lastName: "", age: "", ageUnit: "years", gender: "", phone: "", address: "", chiefComplaint: "" });
      setSelectedPatient(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Registration failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Route patient — uses action/payload ───────────────────────────────────
  const handleDispatchPipeline = async (patientId: number, targetStatus: string, label: string) => {
    setIsRouting(true);
    try {
      // MIDWIFE is special — create an ANC appointment instead of changing status
      if (targetStatus === "MIDWIFE_ANC") {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            department: "Nurse_Midwife",
            appointmentDate: new Date().toISOString(),
            reason: "ANC - Antenatal Care",
            notes: "Referred from Reception for ANC monitoring",
          }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to create ANC appointment.");
        }
        await fetchActiveRegistry();
        setSelectedPatient(null);
        alert("✓ Patient sent to MIDWIFE (ANC)");
        return;
      }

      const response = await fetch("/api/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADVANCE_PATIENT_STATUS",
          payload: { patientId, nextStatus: targetStatus },
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Routing failed.");
      }

      await fetchActiveRegistry();
      setSelectedPatient(null);
      // Brief success toast via the browser — avoids installing a toast lib
      alert(`✓ Patient routed to ${label}`);
    } catch (err: any) {
      console.error("Routing error:", err);
      alert(err.message || "Could not route patient.");
    } finally {
      setIsRouting(false);
    }
  };

  // ── Direct Billing — switch to cashier tab with patient pre-selected ──────
  const handleDirectBill = (patient: Patient) => {
    setBillPatient(patient);
    setDirectBillKey((k) => k + 1);
    setActiveTab("cashier");
  };

  // ── Explicitly discharge a patient (separate from billing) ──────────────
  const handleDischargePatient = async (patient: Patient) => {
    if (patient.status === "DISCHARGED") return;
    if (!confirm(`Discharge ${patient.lastName}, ${patient.firstName}? This cannot be undone automatically.`)) return;

    setIsDischarging(true);
    try {
      const res = await fetch("/api/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCHARGE_PATIENT",
          payload: { patientId: patient.id },
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Discharge failed.");
      }

      await fetchActiveRegistry();
      setSelectedPatient(null);
      alert(`✓ ${patient.lastName}, ${patient.firstName} discharged`);
    } catch (err: any) {
      console.error("Discharge error:", err);
      alert(err.message || "Could not discharge patient.");
    } finally {
      setIsDischarging(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const s = STATUS_LABELS[status] ?? { label: status.replace(/_/g, " "), color: "text-slate-500 bg-slate-50 border-slate-200" };
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">

      {/* NAV */}
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-100 md:h-14 md:w-14">
              <Image src="/Images/LOGO.jpg" alt="Main Street Medical Center Logo" fill priority sizes="56px" className="object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[11px] font-extrabold leading-tight tracking-tight text-slate-900 uppercase md:text-xl">Main Street Medical Center</h1>
              <p className="text-[8px] font-semibold tracking-wide text-rose-600 md:text-xs">Commitment to Good Health</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100 md:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">Receptionist Desk Active</span>
            </div>
            <NotificationInbox department="Reception" showTitle={false} />
            <StaffMessaging showTitle={false} />
            <button
              onClick={async () => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: u.id, username: u.username }) }); } } catch {} router.push("/"); }}
              className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 border border-red-100 text-red-600 hover:bg-red-100 transition-all"
            >
              <LogOut size={14} />
              <span className="hidden text-xs font-bold tracking-wide uppercase md:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-4 space-y-5 md:p-6">

        {/* TABS */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {([
            { key: "search",   label: "Tracking Desk",    icon: <Search size={15} />,  color: "border-[#00703C] text-[#00703C]" },
            { key: "register", label: "Register Patient",  icon: <UserPlus size={15} />, color: "border-[#00703C] text-[#00703C]" },
            { key: "cashier",  label: "Cashier & Billing", icon: <Receipt size={15} />, color: "border-amber-500 text-amber-600" },
            { key: "attendance", label: "Staff Attendance", icon: <Clock size={15} />, color: "border-blue-500 text-blue-600" },
            { key: "schedule", label: "Appointments", icon: <Calendar size={15} />, color: "border-purple-500 text-purple-600" },
            { key: "receipts", label: "Receipts", icon: <FileText size={15} />, color: "border-teal-500 text-teal-600" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-bold transition-all md:px-6 md:text-sm ${
                activeTab === tab.key ? tab.color : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH / TRACKING TAB ─────────────────────────────────────────── */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">

            {/* Left: registry list */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">Live Master Registry Look-Up</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or ID…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#00703C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Live Admissions</span>
                  <span className="text-xs font-bold text-slate-400 font-mono">{registryLoading && filteredPatients.length === 0 ? "Loading…" : `${filteredPatients.length} Records`}</span>
                </div>
                {registryLoading && filteredPatients.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                    <Loader2 size={28} className="text-[#00703C] animate-spin mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">Loading patients…</h3>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">Fetching the live registry.</p>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 mb-3">
                      <AlertCircle size={28} className="text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No Patient Logs Registered</h3>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">Registry is currently empty.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`group flex items-center justify-between p-4 transition-all cursor-pointer hover:bg-slate-50/80 ${selectedPatient?.id === patient.id ? "bg-emerald-50/40 border-l-4 border-[#00703C]" : ""}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold tracking-wider text-[#00703C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {patient.patientNumber}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#00703C]">
                              {patient.lastName}, {patient.firstName}
                            </h4>
                            {patient.isEmergency && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-600 animate-pulse">
                                <ShieldAlert size={10} /> Emergency
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span><strong>Age/Sex:</strong> {formatAge(patient.age, patient.ageUnit)} ({patient.gender})</span>
                            <span>•</span>
                            {statusBadge(patient.status)}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-[#00703C] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Clinical Workflow Router */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="lg:sticky lg:top-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Workflow Router</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Route this patient to any department.</p>
                </div>

                {selectedPatient ? (
                  <div className="space-y-4">
                    {/* Patient card */}
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                      <div className="text-base font-black text-slate-800">
                        {selectedPatient.lastName}, {selectedPatient.firstName}
                      </div>
                      <div className="font-mono text-xs font-bold text-[#00703C]">{selectedPatient.patientNumber}</div>
                      <div className="pt-1">{statusBadge(selectedPatient.status)}</div>
                    </div>

                    {/* Patient details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone size={13} />
                        <span>Contact: <strong>{selectedPatient.phone || "Not recorded"}</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-500">
                        <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                        <span className="truncate">Address: <strong>{selectedPatient.address || "Not recorded"}</strong></span>
                      </div>
                      <div className="flex flex-col pt-2 border-t border-slate-100">
                        <span className="text-slate-400 font-bold mb-1 tracking-wider text-[10px] uppercase flex items-center gap-1">
                          <FileHeart size={12} /> Presenting Details
                        </span>
                        <p className="font-medium text-slate-600 bg-slate-50/80 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto text-[11px] leading-relaxed">
                          {selectedPatient.chiefComplaint}
                        </p>
                      </div>
                    </div>

                    {/* Route buttons — full grid of all destinations */}
                    <div className="pt-1 space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        Send Patient To
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ROUTE_OPTIONS.map((opt) => (
                          <button
                            key={opt.status + opt.label}
                            disabled={isRouting || isOrdering || selectedPatient.status === opt.status}
                            onClick={() => {
                              if (opt.label === "Laboratory") {
                                setLabOrderTarget(selectedPatient);
                              } else {
                                handleDispatchPipeline(selectedPatient.id, opt.status, opt.label);
                              }
                            }}
                            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 min-h-[44px] text-[10px] font-extrabold uppercase tracking-wide text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${opt.color} ${
                              selectedPatient.status === opt.status ? "ring-2 ring-offset-1 " + opt.ringColor : ""
                            }`}
                          >
                            {opt.icon}
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Direct Billing — separate action below route grid */}
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <button
                          onClick={() => handleDirectBill(selectedPatient)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white hover:bg-amber-600 transition-all"
                        >
                          <Receipt size={14} />
                          Direct Billing
                        </button>
                      </div>

                      {/* Discharge Patient — explicit, not coupled to billing */}
                      <div className="pt-2">
                        <button
                          disabled={isDischarging || selectedPatient.status === "DISCHARGED"}
                          onClick={() => handleDischargePatient(selectedPatient)}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                            selectedPatient.status === "DISCHARGED"
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300"
                          }`}
                        >
                          {isDischarging ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <LogOut size={14} />
                          )}
                          {selectedPatient.status === "DISCHARGED" ? "Already Discharged" : "Discharge Patient"}
                        </button>
                      </div>

                      {/* Current status indicator */}
                      <p className="text-[9px] text-slate-400 text-center pt-1">
                        Highlighted button = current station · Greyed = already there
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    Select a patient from the registry to route them.
                  </div>
                )}

                {/* ── Lab Order Modal ────────────────────────────────────── */}
                {labOrderTarget && (
                  <LabOrderModal
                    patientName={`${labOrderTarget.firstName} ${labOrderTarget.lastName}`}
                    onClose={() => { if (!isOrdering) setLabOrderTarget(null); }}
                    onConfirm={async (selectedTests) => {
                      setIsOrdering(true);
                      try {
                        // Resolve the current user's Staff id so the lab request
                        // records the correct requesting staff member (not a fallback).
                        let requestingStaffId: number | null = null;
                        try {
                          const staffRes = await fetch("/api/staffcreate");
                          if (staffRes.ok) {
                            const staffData = await staffRes.json();
                            if (staffData.success && Array.isArray(staffData.staff)) {
                              const userData = JSON.parse(
                                sessionStorage.getItem("user") ||
                                localStorage.getItem("user") ||
                                "{}"
                              );
                              const myStaff = staffData.staff.find(
                                (s: any) => s.userId === userData.id
                              );
                              if (myStaff?.id) requestingStaffId = myStaff.id;
                            }
                          }
                        } catch { /* staff lookup failed */ }

                        const res = await fetch("/api/receptionist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "CREATE_LAB_ORDER",
                            payload: {
                              patientId: labOrderTarget.id,
                              tests: selectedTests.map(t => ({ code: t.code, name: t.name })),
                              requestedById: requestingStaffId,
                            },
                          }),
                        });
                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.error || "Failed to create lab order");
                        }
                        // Only route if CREATE_LAB_ORDER succeeded
                        await handleDispatchPipeline(labOrderTarget.id, "AWAITING_LAB", "Laboratory");
                        setLabOrderTarget(null);
                      } catch (err: any) {
                        alert(err.message || "Failed to order lab tests. Patient was NOT routed.");
                      } finally {
                        setIsOrdering(false);
                      }
                    }}
                  />
                )}

              </div>

              {/* ── PATIENT FILE & SEARCH (universal) ────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-[#00703C]" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Patient File &amp; Search
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {universalSearchResults.length > 0 ? `${universalSearchResults.length} found` : "Search all..."}
                  </span>
                </div>
                <div className="px-4 py-2.5 border-b border-slate-50">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={universalSearchQuery} onChange={(e) => setUniversalSearchQuery(e.target.value)}
                      placeholder="Search ALL patients (incl. discharged) by name or ID..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-[11px] font-medium outline-none focus:border-[#00703C] focus:bg-white transition" />
                    {universalSearchQuery && (
                      <button onClick={() => { setUniversalSearchQuery(""); setUniversalSearchResults([]); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {universalSearchLoading ? (
                    <div className="flex items-center justify-center py-8 text-slate-300">
                      <Loader2 size={18} className="animate-spin mr-2" />
                      <span className="text-[10px] font-medium">Searching...</span>
                    </div>
                  ) : !universalSearchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <FileText size={28} />
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">Search all patient records</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Type name or ID above to find any patient in the system</p>
                    </div>
                  ) : universalSearchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <Search size={28} />
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">No matching records</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Try a different search term</p>
                    </div>
                  ) : (
                    universalSearchResults.map((patient) => (
                      <div key={patient.id}
                        className="flex items-center justify-between px-4 py-2.5 transition-all hover:bg-slate-50/80"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                              {patient.lastName}, {patient.firstName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono truncate flex-wrap">
                              <span>{patient.patientNumber}</span>
                              <span>·</span>
                              <span>{formatAge(patient.age, patient.ageUnit)} {patient.gender}</span>
                              <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[8px] font-extrabold uppercase tracking-wider ${
                                patient.status === "DISCHARGED"
                                  ? "text-slate-500 bg-slate-50 border-slate-200"
                                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
                              }`}>
                                {patient.status === "DISCHARGED" ? "Discharged" : "Active"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            onClick={() => { setPatientFilePatient(patient); setPatientFileOpen(true); }}
                            className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <FileText size={10} className="inline mr-0.5" /> View File
                          </button>
                          <button
                            onClick={() => { setSelectedPatient(patient); }}
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${
                              patient.status === "DISCHARGED"
                                ? "text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100"
                            }`}
                          >
                            <UserRound size={10} className="inline mr-0.5" />
                            {patient.status === "DISCHARGED" ? "Re-admit" : "Select"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ── PATIENT FILE MODAL ────────────────────────────────────────────── */}
          {patientFileOpen && patientFilePatient && (
            <PatientFileModal
              patient={patientFilePatient}
              onClose={() => { setPatientFileOpen(false); setPatientFilePatient(null); }}
              onRoutePatient={(p) => { setSelectedPatient(p); setPatientFileOpen(false); }}
            />
          )}

        {/* ── REGISTER TAB ──────────────────────────────────────────────────── */}
        {activeTab === "register" && (
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-200">
              <button type="button" onClick={() => setRegistrationMode("normal")}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === "normal" ? "bg-slate-50/50 text-[#00703C] border-b-2 border-[#00703C]" : "text-slate-400"}`}>
                <FileText size={14} /> Standard Admission
              </button>
              <button type="button" onClick={() => setRegistrationMode("emergency")}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === "emergency" ? "bg-rose-50/30 text-rose-600 border-b-2 border-rose-600" : "text-slate-400"}`}>
                <ShieldAlert size={14} /> Emergency Fast-Track
              </button>
            </div>
            <form onSubmit={handleRegisterPatient} className="grid gap-4 p-5 md:grid-cols-2">
              {activeFields.map((field: any) => (
                <div key={field.id} className={field.colSpan || ""}>
                  <label className="mb-1 block text-xs font-bold text-slate-600 tracking-wide">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {field.id === "age" ? (
                    <div className="flex gap-2">
                      <input type="number" name="age" required={field.required}
                        min={0} max={formData.ageUnit === "years" ? 150 : 60}
                        placeholder={formData.ageUnit === "years" ? "e.g., 25" : "e.g., 8"}
                        value={formData.age} onChange={handleInputChange}
                        className="flex-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#00703C]" />
                      <div className="flex rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
                        <button type="button"
                          onClick={() => setFormData((p) => ({ ...p, ageUnit: "years", age: p.ageUnit === "months" ? "" : p.age }))}
                          className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            formData.ageUnit === "years"
                              ? "bg-[#00703C] text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}>
                          Years
                        </button>
                        <button type="button"
                          onClick={() => setFormData((p) => ({ ...p, ageUnit: "months", age: p.ageUnit === "years" ? "" : p.age }))}
                          className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            formData.ageUnit === "months"
                              ? "bg-[#00703C] text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}>
                          Months
                        </button>
                      </div>
                    </div>
                  ) : field.type === "select" ? (
                    <select name={field.id} required={field.required} value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white transition focus:border-[#00703C]">
                      <option value="">Select Option</option>
                      {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea name={field.id} rows={3} required={field.required} placeholder={field.placeholder}
                      value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none transition focus:border-[#00703C]" />
                  ) : (
                    <input type={field.type} name={field.id} required={field.required} placeholder={field.placeholder}
                      value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#00703C]" />
                  )}
                </div>
              ))}
              <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setActiveTab("search")}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider transition-all ${registrationMode === "emergency" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#00703C] hover:bg-emerald-800"} disabled:opacity-50`}>
                  <CheckCircle2 size={14} />
                  {isSubmitting ? "Saving..." : "Commit Record"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── CASHIER TAB ───────────────────────────────────────────────────── */}
        {activeTab === "cashier" && <CashierPOS key={directBillKey} patients={patients} directBillPatient={billPatient} onBillingComplete={fetchActiveRegistry} />}

        {/* ── STAFF ATTENDANCE TAB ──────────────────────────────────────────── */}
        {activeTab === "attendance" && <StaffAttendancePanel />}

        {/* ── APPOINTMENTS TAB ──────────────────────────────────────────────── */}
        {activeTab === "schedule" && <AppointmentsPanel staffId={staffId} patients={patients} />}

        {/* ── RECEIPTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "receipts" && <BillingHistory />}

      </div>
    </main>
  );
}