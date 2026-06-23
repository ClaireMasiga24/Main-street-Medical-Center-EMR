"use client";

import Image from "next/image";
import { useState, useEffect, useTransition } from "react";
import NotificationInbox from "../components/NotificationInbox";
import {
  Users, ClipboardList, Pill, ArrowLeft, CheckCircle,
  LogOut, ChevronRight, AlertTriangle, Stethoscope,
  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Printer,
  Activity, Calendar, Settings, FileText, Menu, Bell,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Visit = {
  id: number; symptoms: string | null; diagnosis: string | null;
  notes: string | null; createdAt: string;
  Prescription: { medication: string; dosage: string; instructions: string }[];
  LabRequest: { testName: string; status: string; results: string | null }[];
};
type Patient = {
  id: number; patientNumber: string; firstName: string; lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER"; age: number; dateOfBirth: string | null;
  phoneNumber: string | null; address: string | null;
  isEmergency: boolean; currentStatus: string; updatedAt: string;
  Visit: Visit[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ROUTES = [
  { id: "LAB",        label: "Laboratory",      sub: "Send for lab tests",          Icon: Microscope  },
  { id: "SONOGRAPHY", label: "Sonography",       sub: "Imaging & ultrasound",       Icon: Waves        },
  { id: "RADIOLOGY",  label: "Radiology",        sub: "X-ray & scans",              Icon: Radio        },
  { id: "DOCTOR",     label: "Doctor",           sub: "Refer to physician",         Icon: Stethoscope  },
  { id: "NURSE",      label: "Nurse / Midwife",  sub: "Nursing or ANC care",        Icon: Activity     },
  { id: "PHARMACY",   label: "Pharmacy",         sub: "Collect prescription",       Icon: Pill         },
  { id: "CASHIER",    label: "Cashier",          sub: "Settle bill",                Icon: CreditCard   },
  { id: "DISCHARGE",  label: "Discharge",        sub: "Home with instructions",     Icon: Home         },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials  = (p: Patient) => `${p.firstName[0]}${p.lastName[0]}`.toUpperCase();
const fmtDate   = (d: string)  =>
  new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
const waitLabel = (upd: string) => {
  const m = Math.floor((Date.now() - new Date(upd).getTime()) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const genderLabel = (g: string) => g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Other";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800", "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",   "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];
const avatarCls = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  dentistName, queueCount, onQueue, onLogout,
}: {
  dentistName: string; queueCount: number;
  onQueue: () => void; onLogout: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#0a2e1a] flex flex-col z-50">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
            <Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="text-white text-sm font-medium leading-tight">Main Street</div>
            <div className="text-[#5a9e78] text-[11px]">Dental Department</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 mb-2">Clinical</p>
        <button onClick={onQueue}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a5233] text-white text-sm">
          <Users size={15} /> Patient queue
          {queueCount > 0 && (
            <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
              {queueCount}
            </span>
          )}
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#a0c8b0] text-sm hover:bg-white/5 transition-colors">
          <Calendar size={15} /> Appointments
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#a0c8b0] text-sm hover:bg-white/5 transition-colors">
          <FileText size={15} /> Clinical notes
        </button>

        <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 pt-4 mb-2">System</p>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#a0c8b0] text-sm hover:bg-white/5 transition-colors">
          <Settings size={15} /> Settings
        </button>
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-4">
        <div className="px-2 mb-3">
          <div className="text-[#a0c8b0] text-sm font-medium truncate">{dentistName}</div>
          <div className="text-[#3d7a55] text-xs mt-0.5">Dentist</div>
        </div>
        <div className="mb-2"><NotificationInbox department="Dentist" /></div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 text-sm hover:bg-rose-900/30 transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Dentist Page ─────────────────────────────────────────────────────────────
export default function DentistPage() {
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dentistName, setDentistName] = useState("Dentist");
  const [staffId, setStaffId]       = useState<number | null>(null);

  const [active, setActive]         = useState<Patient | null>(null);
  const [tab, setTab]               = useState<"exam" | "notes">("exam");
  const [route, setRoute]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes]         = useState("");
  const [affectedTeeth, setAffectedTeeth] = useState<number[]>([]);

  const [error, setError]         = useState<string | null>(null);
  const [toast, setToast]         = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch patients on mount + auto-poll every 20s ──
  useEffect(() => {
    function fetchPatients() {
      fetch("/api/dentist")
        .then(r => {
          if (!r.ok) throw new Error("Failed to load");
          return r.json();
        })
        .then(data => {
          if (Array.isArray(data)) setPatients(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setDentistName(user.username || "Dentist");
        fetch("/api/staffcreate")
          .then(r => r.json())
          .then((data: any) => {
            const staffList = data?.staff;
            if (Array.isArray(staffList)) {
              const match = staffList.find((s: any) => s.userId === user.id);
              if (match) setStaffId(match.id);
            }
          })
          .catch(() => {});
      } catch {}
    }

    fetchPatients();
    // Heartbeat
    try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {}

    const interval = setInterval(fetchPatients, 20_000);
    const heartbeat = setInterval(() => {
      try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {}
    }, 120000);
    return () => { clearInterval(interval); clearInterval(heartbeat); };
  }, []);

  function toggleTooth(n: number) {
    setAffectedTeeth(prev =>
      prev.includes(n) ? prev.filter(t => t !== n) : [...prev, n]
    );
  }

  function openPatient(p: Patient) {
    setActive(p);
    setTab("exam");
    setRoute("CASHIER");
    setChiefComplaint(p.Visit[0]?.symptoms || "");
    setDiagnosis(""); setTreatment(""); setNotes(""); setAffectedTeeth([]);
    setError(null);

    setPatients(prev => prev.filter(x => x.id !== p.id));

    fetch("/api/dentist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: p.id }),
    }).catch(() => {});
  }

  function complete() {
    if (!active) return;
    if (!route) { setError("Select where to route this patient before completing."); return; }
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/dentist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: active.id, staffId,
          chiefComplaint, diagnosis, treatment, notes,
          routeTo: route,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return;
      }

      const routeLabel = ROUTES.find(r => r.id === route)?.label ?? route;
      setPatients(prev => prev.filter(p => p.id !== active.id));
      setActive(null);
      showToast(`${active.firstName} ${active.lastName} sent to ${routeLabel}`);
    });
  }

  function printForm() {
    window.print();
  }

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
              <button onClick={async () => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: u.id, username: u.username }) }); } } catch {} window.location.href = "/login"; }}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0a2e1a] text-white text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg z-[300]">
          <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" /> {toast}
        </div>
      )}
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // QUEUE VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (!active) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar dentistName={dentistName} queueCount={patients.length} onQueue={() => {}} onLogout={() => setLogoutModal(true)} />

        <main className="ml-56 flex-1 p-8 max-w-4xl">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Dental Patient Queue</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <Bell size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Waiting</div>
              <div className="text-3xl font-semibold text-slate-800 mt-1">{patients.filter(p => p.currentStatus === "AWAITING_DENTIST").length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">In consultation</div>
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
              <div className="text-base font-semibold text-slate-800 mt-1">
                Reception · Triage · Doctor
              </div>
            </div>
          </div>

          {/* Queue list */}
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
                <p className="text-xs text-slate-300 mt-1">Patients can be sent from Reception, Triage, or Doctor</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                  {patients.map(p => {
                    const inConsultation = p.currentStatus === "IN_CONSULTATION";
                    return (
                    <li key={p.id}
                      onClick={() => { if (!inConsultation) openPatient(p); }}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${inConsultation ? "opacity-70" : "hover:bg-slate-50 cursor-pointer"}`}
                    >
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
                          {inConsultation && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                              In Consultation
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.patientNumber} · {p.age} yrs · {genderLabel(p.gender)}
                          {p.phoneNumber && ` · ${p.phoneNumber}`}
                        </div>
                        {p.Visit[0]?.symptoms && (
                          <div className="text-xs text-slate-400 mt-1 truncate">{p.Visit[0].symptoms}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 mr-2">
                        <div className="text-xs text-slate-400">{inConsultation ? "Since" : "Waiting"}</div>
                        <div className="text-sm font-medium text-slate-700">{waitLabel(p.updatedAt)}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); if (!inConsultation) openPatient(p); }}
                        className={`flex items-center gap-1 text-xs px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${
                          inConsultation
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-[#0a2e1a] text-white hover:bg-[#1a5233]"
                        }`}
                        disabled={inConsultation}>
                        {inConsultation ? "In session" : "Open"} <ChevronRight size={12} />
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

  // ════════════════════════════════════════════════════════════════════════════
  // CONSULTATION VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar dentistName={dentistName} queueCount={patients.length} onQueue={() => setActive(null)} onLogout={() => setLogoutModal(true)} />

      <main className="ml-56 flex-1 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setActive(null)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft size={15} /> Queue
            </button>
            <span className="text-slate-200">/</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">
                {active.firstName} {active.lastName}
                {active.isEmergency && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-medium align-middle">
                    <AlertTriangle size={9} /> Emergency
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {active.patientNumber} · {active.age} yrs · {genderLabel(active.gender)}
                {active.phoneNumber && ` · ${active.phoneNumber}`}
              </p>
            </div>
          </div>
          <button onClick={printForm}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
            <Printer size={15} /> Print form
          </button>
        </div>

        <div className="grid grid-cols-[288px_1fr] gap-5 items-start">
          {/* LEFT — Patient profile */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Patient profile</p>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold mb-4 ${avatarCls(active.id)}`}>
                {initials(active)}
              </div>
              <dl className="space-y-2.5">
                {([
                  ["Care ID",  active.patientNumber],
                  ["Age",      `${active.age} yrs`],
                  ["Gender",   genderLabel(active.gender)],
                  ["Phone",    active.phoneNumber ?? "—"],
                  ["Address",  active.address ?? "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-xs text-slate-400 flex-shrink-0">{k}</dt>
                    <dd className="text-xs text-slate-700 font-medium text-right truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* RIGHT — Consultation */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100">
              <div className="flex border-b border-slate-100">
                {(["exam", "notes"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-3.5 text-sm border-b-2 -mb-px transition-colors ${
                      tab === t ? "border-[#0a2e1a] text-[#0a2e1a] font-medium"
                               : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                    {t === "exam" ? "Dental Exam" : "Notes"}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === "exam" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Chief Complaint</label>
                      <textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={2}
                        placeholder="Patient's dental complaint…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>

                    {/* ── Odontogram ── */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Odontogram — Tap affected teeth</label>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                        {/* Upper jaw */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Upper Jaw</div>
                        <div className="flex justify-center gap-1 mb-1">
                          {[1,2,3,4,5,6,7,8].map(n => (
                            <button key={n} onClick={() => toggleTooth(n)}
                              className={`w-8 h-10 rounded text-xs font-bold border transition-all ${
                                affectedTeeth.includes(n)
                                  ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-center gap-1 mb-3">
                          {[9,10,11,12,13,14,15,16].map(n => (
                            <button key={n} onClick={() => toggleTooth(n)}
                              className={`w-8 h-10 rounded text-xs font-bold border transition-all ${
                                affectedTeeth.includes(n)
                                  ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                              {n}
                            </button>
                          ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-200 my-2"></div>

                        {/* Lower jaw */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Lower Jaw</div>
                        <div className="flex justify-center gap-1 mb-1">
                          {[17,18,19,20,21,22,23,24].map(n => (
                            <button key={n} onClick={() => toggleTooth(n)}
                              className={`w-8 h-10 rounded text-xs font-bold border transition-all ${
                                affectedTeeth.includes(n)
                                  ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-center gap-1">
                          {[25,26,27,28,29,30,31,32].map(n => (
                            <button key={n} onClick={() => toggleTooth(n)}
                              className={`w-8 h-10 rounded text-xs font-bold border transition-all ${
                                affectedTeeth.includes(n)
                                  ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                              {n}
                            </button>
                          ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400 justify-center">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-slate-200 inline-block"></span> Healthy</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Affected</span>
                          {affectedTeeth.length > 0 && (
                            <span className="font-medium text-slate-500">Selected: {[...affectedTeeth].sort((a,b) => a-b).join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">DIAGNOSIS</label>
                      <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={4}
                        placeholder="Dental diagnosis, findings, affected teeth…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">TREATMENT PLAN</label>
                      <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={4}
                        placeholder="Procedures, extractions, fillings, referrals…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>
                )}
                {tab === "notes" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Clinical notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
                      placeholder="Additional observations, follow-up plan, patient education…"
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Route patient grid */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Route patient to</p>
              <div className="grid grid-cols-4 gap-2">
                {ROUTES.map(r => (
                  <button key={r.id} onClick={() => setRoute(r.id)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                      route === r.id ? "border-[#0a2e1a] bg-emerald-50 shadow-sm"
                                     : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
                    <r.Icon size={16} className={route === r.id ? "text-[#0a2e1a]" : "text-slate-400"} />
                    <div className={`text-[11px] font-semibold ${route === r.id ? "text-[#0a2e1a]" : "text-slate-700"}`}>{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pb-8">
              <button onClick={() => setActive(null)}
                className="text-sm px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Discard
              </button>
              <button onClick={complete} disabled={isPending}
                className="flex items-center gap-2 bg-[#0a2e1a] text-white text-sm px-6 py-2.5 rounded-xl hover:bg-[#1a5233] disabled:opacity-60 transition-colors font-medium">
                {isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><CheckCircle size={14} /> Complete consultation</>}
              </button>
            </div>
          </div>
        </div>
      </main>
      {Overlays}

      {/* ── Printable form (hidden on screen, visible in print via CSS) ── */}
      {active && (
        <div className="print-area" style={{ display: "none", fontFamily: "'Times New Roman', Times, serif", color: "#1e293b" }}>
          <div style={{ textAlign: "center", borderBottom: "3px double #0a2e1a", paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#0a2e1a" }}>MAIN STREET MEDICAL CENTER</h1>
            <p style={{ fontSize: 12, margin: "4px 0", color: "#475569" }}>Dental Consultation Form</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>{new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</p>
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
            </tbody>
          </table>

          {chiefComplaint && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Chief Complaint</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{chiefComplaint}</p>
            </div>
          )}
          {diagnosis && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>DIAGNOSIS</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{diagnosis}</p>
            </div>
          )}
          {affectedTeeth.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Affected Teeth (Odontogram)</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>Teeth #{[...affectedTeeth].sort((a,b) => a-b).join(", ")}</p>
            </div>
          )}
          {treatment && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>TREATMENT PLAN</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{treatment}</p>
            </div>
          )}
          {notes && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Clinical Notes</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{notes}</p>
            </div>
          )}

          <div style={{ marginTop: 40, borderTop: "1px solid #cbd5e1", paddingTop: 20 }}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold", width: 160 }}>Attending Dentist</td>
                  <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px" }}>{dentistName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold", paddingTop: 10 }}>Signature</td>
                  <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold", paddingTop: 10 }}>Date</td>
                  <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}>{new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            Routed to {ROUTES.find(r => r.id === route)?.label ?? route} · Main Street Medical Center EMR System
          </div>
        </div>
      )}
    </div>
  );
}
