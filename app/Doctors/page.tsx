"use client";

import Image from "next/image";
import { useState, useEffect, useTransition } from "react";
import NotificationInbox from "../components/NotificationInbox";
import {
  Users, ClipboardList, Pill, ArrowLeft, CheckCircle,
  LogOut, ChevronRight, AlertTriangle, Stethoscope,
  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Printer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Rx    = { medication: string; dosage: string; instructions: string };
type Lab   = { testName: string; status: string; results: string | null };
type Visit = {
  id: number; symptoms: string | null; diagnosis: string | null;
  notes: string | null; createdAt: string;
  Prescription: Rx[]; LabRequest: Lab[];
};
type Patient = {
  id: number; patientNumber: string; firstName: string; lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER"; age: number; dateOfBirth: string | null;
  phoneNumber: string | null; address: string | null;
  isEmergency: boolean; currentStatus: string; updatedAt: string;
  Visit: Visit[];
};
type RxDraft = { medication: string; dosage: string; instructions: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const ROUTES = [
  { id: "LAB",        label: "Laboratory",      sub: "Send for investigations", Icon: Microscope  },
  { id: "SONOGRAPHY", label: "Sonography",       sub: "Imaging & ultrasound",   Icon: Waves        },
  { id: "RADIOLOGY",  label: "Radiology",        sub: "X-ray & scans",          Icon: Radio        },
  { id: "NURSE",      label: "Nurse / Midwife",  sub: "Nursing or ANC care",    Icon: Stethoscope  },
  { id: "PHARMACY",   label: "Pharmacy",         sub: "Collect prescription",   Icon: Pill         },
  { id: "CASHIER",    label: "Cashier",          sub: "Settle bill",            Icon: CreditCard   },
  { id: "DISCHARGE",  label: "Discharge",        sub: "Home with instructions", Icon: Home         },
];

const LAB_TESTS = [
  "Full Blood Count", "Urinalysis", "Blood glucose", "Malaria RDT",
  "HIV screen", "Typhoid / Widal", "Liver function tests", "Kidney function tests",
  "Lipid profile", "HbA1c", "Pregnancy test", "Blood culture",
  "Stool M/C/S", "Urine culture", "Sputum AFB",
];

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800", "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",   "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials  = (p: Patient) => `${p.firstName[0]}${p.lastName[0]}`.toUpperCase();
const avatarCls = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const fmtDate   = (d: string)  =>
  new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
const waitLabel = (upd: string) => {
  const m = Math.floor((Date.now() - new Date(upd).getTime()) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const genderLabel = (g: string) => g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Other";

// ── Printable Consultation Form (hidden on screen, visible in print) ──
function PrintConsultationForm({
  patient, symptoms, diagnosis, notes, rxDrafts, labChecked, doctorName,
}: {
  patient: Patient; symptoms: string; diagnosis: string; notes: string;
  rxDrafts: RxDraft[]; labChecked: Set<string>; doctorName: string;
}) {
  const checkedTests = LAB_TESTS.filter(t => labChecked.has(t));
  const today = new Date().toLocaleDateString("en-UG", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="print-area" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#1e293b" }}>
      {/* Watermark is applied via CSS ::before */}

      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "3px double #0a2e1a", paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#0a2e1a" }}>MAIN STREET MEDICAL CENTER</h1>
        <p style={{ fontSize: 12, margin: "4px 0", color: "#475569" }}>Comprehensive Medical Consultation Form</p>
        <p style={{ fontSize: 11, color: "#64748b" }}>{today}</p>
      </div>

      {/* Patient info */}
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: 140 }}>Patient Name</td>
            <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{patient.firstName} {patient.lastName}</td>
            <td style={{ padding: "4px 8px", fontWeight: "bold", width: 100 }}>Care ID</td>
            <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{patient.patientNumber}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Age / Gender</td>
            <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{patient.age} yrs / {genderLabel(patient.gender)}</td>
            <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Date</td>
            <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }}>{today}</td>
          </tr>
          {patient.phoneNumber && (
            <tr>
              <td style={{ padding: "4px 8px", fontWeight: "bold" }}>Phone</td>
              <td style={{ padding: "4px 8px", borderBottom: "1px solid #cbd5e1" }} colSpan={3}>{patient.phoneNumber}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Symptoms */}
      {symptoms && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Presenting Symptoms</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{symptoms}</p>
        </div>
      )}

      {/* Diagnosis */}
      {diagnosis && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>DIAGNOSIS</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{diagnosis}</p>
        </div>
      )}

      {/* Prescriptions */}
      {rxDrafts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Prescriptions</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Medication</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Dosage</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: "bold", border: "1px solid #cbd5e1" }}>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {rxDrafts.map((rx, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{rx.medication}</td>
                  <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{rx.dosage}</td>
                  <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{rx.instructions || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lab orders */}
      {checkedTests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>Laboratory Orders</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>{checkedTests.join(", ")}</p>
        </div>
      )}

      {/* Treatment Plan */}
      {notes && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: "bold", color: "#0a2e1a", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>TREATMENT PLAN</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{notes}</p>
        </div>
      )}

      {/* Doctor & Signature */}
      <div style={{ marginTop: 40, borderTop: "1px solid #cbd5e1", paddingTop: 20 }}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: "bold", width: 160 }}>Attending Doctor</td>
              <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px" }}>{doctorName}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold", paddingTop: 10 }}>Doctor&apos;s Signature</td>
              <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}></td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold", paddingTop: 10 }}>Date</td>
              <td style={{ borderBottom: "1px solid #1e293b", padding: "4px 10px", paddingTop: 10 }}>{today}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Routing note */}
      <div style={{ marginTop: 20, fontSize: 11, color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
        Routed to Cashier for billing · Main Street Medical Center EMR System
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  doctorName, queueCount, onQueue, onLogout,
}: {
  doctorName: string; queueCount: number;
  onQueue: () => void; onLogout: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#0a2e1a] flex flex-col z-50">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
            <Image src="/images/LOGO.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <div className="text-white text-sm font-medium leading-tight">Main Street</div>
            <div className="text-[#5a9e78] text-[11px]">Medical Center</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#3d7a55] px-2 mb-2">Clinical</p>
        <button
          onClick={onQueue}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a5233] text-white text-sm"
        >
          <Users size={15} /> Patient queue
          {queueCount > 0 && (
            <span className="ml-auto bg-[#0a2e1a] text-[#7abf96] text-[10px] px-2 py-0.5 rounded-full">
              {queueCount}
            </span>
          )}
        </button>

        {/* Removed Drug reference and ICD-10 codes per user request */}
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-4">
        <div className="px-2 mb-3">
          <div className="text-[#a0c8b0] text-sm font-medium truncate">{doctorName}</div>
          <div className="text-[#3d7a55] text-xs mt-0.5">Doctor</div>
        </div>
        <div className="mb-2">
          <NotificationInbox department="Doctor" />
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 text-sm hover:bg-rose-900/30 transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  // Data
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [loading, setLoading]     = useState(true);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [staffId, setStaffId]     = useState<number | null>(null);

  // View
  const [active, setActive]       = useState<Patient | null>(null);
  const [tab, setTab]             = useState<"assess" | "rx" | "labs" | "notes">("assess");
  const [route, setRoute]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form
  const [symptoms, setSymptoms]   = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes]         = useState("");
  const [rxDrafts, setRxDrafts]   = useState<RxDraft[]>([]);
  const [rxOpen, setRxOpen]       = useState(false);
  const [rxMed, setRxMed]         = useState("");
  const [rxDose, setRxDose]       = useState("");
  const [rxInstr, setRxInstr]     = useState("");
  const [labChecked, setLabChecked] = useState<Set<string>>(new Set());

  // UI
  const [error, setError]         = useState<string | null>(null);
  const [toast, setToast]         = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState(false);

  // ── Fetch patients on mount and auto-poll every 20s ──
  useEffect(() => {
    function fetchPatients() {
      fetch("/api/doctor")
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

    // Load staff info from session/local storage
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setDoctorName(user.username || "Doctor");
        // Fetch the Staff record to get the staffId (used for lab/imaging requests)
        fetch(`/api/staffcreate`)
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

      // Heartbeat for online tracking
      try {
        const r = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } }
      } catch {}

      fetchPatients();
      const interval = setInterval(fetchPatients, 20_000);

      // Online heartbeat every 2 minutes
      const heartbeat = setInterval(() => {
        try {
          const r = sessionStorage.getItem("user") || localStorage.getItem("user");
          if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } }
        } catch {}
      }, 120000);

      return () => { clearInterval(interval); clearInterval(heartbeat); };
	  }, []);

  // ── Helpers ──
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function openPatient(p: Patient) {
    setActive(p);
    setTab("assess");
    setRoute("CASHIER"); // auto-route to cashier for billing
    setSymptoms(""); setDiagnosis(""); setNotes("");
    setRxDrafts([]); setRxOpen(false);
    setRxMed(""); setRxDose(""); setRxInstr("");
    setLabChecked(new Set());
    setError(null);

    // Remove patient from queue immediately so it doesn't show as waiting
    setPatients(prev => prev.filter(x => x.id !== p.id));

    // Begin consultation: move patient from AWAITING_DOCTOR to IN_CONSULTATION
    // If the PATCH fails (e.g. another doctor already took them), the next poll
    // will correct the local state.
    fetch("/api/doctor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: p.id }),
    }).catch(() => {});
  }

  function addRx() {
    if (!rxMed.trim()) return;
    setRxDrafts(prev => [...prev, { medication: rxMed, dosage: rxDose, instructions: rxInstr }]);
    setRxMed(""); setRxDose(""); setRxInstr("");
    setRxOpen(false);
  }

  function toggleLab(name: string) {
    setLabChecked(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function complete() {
    if (!active) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: active.id, staffId, symptoms, diagnosis, notes,
          prescriptions: rxDrafts,
          labRequests: Array.from(labChecked).map(t => ({ testName: t })),
          routeTo: "CASHIER",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setPatients(prev => prev.filter(p => p.id !== active.id));
      setActive(null);
      showToast(`${active.firstName} ${active.lastName} — consultation saved, sent to Cashier`);
    });
  }

  function printForm() {
    window.print();
  }

  // ── Shared overlays ──
  const Overlays = (
    <>
      {logoutModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800">Sign out?</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
              Your session will end. Any unsaved consultation data will be lost. Complete any open consultations first.
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
    const urgentCount = patients.filter(p => p.isEmergency).length;
    const avgWait = patients.length
      ? Math.round(patients.reduce((s, p) =>
          s + Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / 60000), 0) / patients.length)
      : 0;

    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar doctorName={doctorName} queueCount={patients.length} onQueue={() => {}} onLogout={() => setLogoutModal(true)} />

        <main className="ml-56 flex-1 p-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-800">Patient queue</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Waiting</div>
              <div className="text-3xl font-semibold text-slate-800 mt-1">{patients.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Emergency</div>
              <div className={`text-3xl font-semibold mt-1 ${urgentCount > 0 ? "text-rose-600" : "text-slate-800"}`}>
                {urgentCount}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-400">Avg. wait</div>
              <div className="text-3xl font-semibold text-slate-800 mt-1">
                {avgWait} <span className="text-base font-normal text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-slate-100">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Patients from triage</span>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">● Live</span>
            </div>

            {loading ? (
              <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading patients…
              </div>
            ) : patients.length === 0 ? (
              <div className="py-20 text-center">
                <Users size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">Queue is clear — no patients waiting.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {patients.map(p => (
                  <li key={p.id}
                    onClick={() => openPatient(p)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
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
                      <div className="text-xs text-slate-400">Waiting</div>
                      <div className="text-sm font-medium text-slate-700">{waitLabel(p.updatedAt)}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); openPatient(p); }}
                      className="flex items-center gap-1 bg-[#0a2e1a] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#1a5233] transition-colors flex-shrink-0"
                    >
                      See patient <ChevronRight size={12} />
                    </button>
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

  // ════════════════════════════════════════════════════════════════════════════
  // CONSULTATION VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar doctorName={doctorName} queueCount={patients.length} onQueue={() => setActive(null)} onLogout={() => setLogoutModal(true)} />

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

          {/* ── LEFT ── */}
          <div className="space-y-4">

            {/* Profile */}
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
                  ["DOB",      active.dateOfBirth ? fmtDate(active.dateOfBirth) : "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-xs text-slate-400 flex-shrink-0">{k}</dt>
                    <dd className="text-xs text-slate-700 font-medium text-right truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Visit history */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Visit history</p>
              {active.Visit.length === 0 ? (
                <p className="text-xs text-slate-400">No prior visits on record.</p>
              ) : (
                <div className="space-y-4">
                  {active.Visit.map(v => (
                    <div key={v.id} className="border-l-2 border-slate-100 pl-3">
                      <div className="text-[11px] text-slate-400">{fmtDate(v.createdAt)}</div>
                      {v.diagnosis && <div className="text-xs font-medium text-slate-700 mt-0.5 leading-snug">{v.diagnosis}</div>}
                      {v.symptoms  && <div className="text-xs text-slate-500 mt-0.5 leading-snug">{v.symptoms}</div>}
                      {v.Prescription?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {v.Prescription.map((rx, i) => (
                            <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                              {rx.medication}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.LabRequest?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {v.LabRequest.map((l, i) => (
                            <span key={i} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                              {l.testName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-4">

            {/* Clinical tabs */}
            <div className="bg-white rounded-xl border border-slate-100">
              <div className="flex border-b border-slate-100">
                {(["assess", "rx", "labs", "notes"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-3.5 text-sm border-b-2 -mb-px transition-colors ${
                      tab === t ? "border-[#0a2e1a] text-[#0a2e1a] font-medium"
                               : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                    {t === "assess" ? "Assessment" : t === "rx" ? "Prescription" : t === "labs" ? "Lab orders" : "Notes"}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* Assessment */}
                {tab === "assess" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Presenting symptoms</label>
                      <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={3}
                        placeholder="What the patient reports…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Diagnosis / Clinical findings</label>
                      <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={5}
                        placeholder="Working diagnosis, differential, examination findings…"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                    </div>
                  </div>
                )}

                {/* Prescription */}
                {tab === "rx" && (
                  <div>
                    {rxDrafts.length === 0 && !rxOpen && (
                      <p className="text-sm text-slate-400 mb-4">No medications added yet.</p>
                    )}
                    {rxDrafts.length > 0 && (
                      <ul className="divide-y divide-slate-50 mb-4">
                        {rxDrafts.map((rx, i) => (
                          <li key={i} className="flex items-start justify-between py-3 gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-800">{rx.medication}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{rx.dosage}{rx.instructions && ` · ${rx.instructions}`}</div>
                            </div>
                            <button onClick={() => setRxDrafts(prev => prev.filter((_, j) => j !== i))}
                              className="text-slate-300 hover:text-rose-400 transition-colors mt-0.5">
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {rxOpen ? (
                      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Drug name</label>
                            <input value={rxMed} onChange={e => setRxMed(e.target.value)} placeholder="e.g. Amoxicillin"
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 placeholder:text-slate-300" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Dose</label>
                            <input value={rxDose} onChange={e => setRxDose(e.target.value)} placeholder="e.g. 500 mg"
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 placeholder:text-slate-300" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Instructions</label>
                          <input value={rxInstr} onChange={e => setRxInstr(e.target.value)} placeholder="e.g. 3× daily for 7 days, take with food"
                            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 placeholder:text-slate-300" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addRx} className="bg-[#0a2e1a] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#1a5233] transition-colors">Add</button>
                          <button onClick={() => setRxOpen(false)} className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setRxOpen(true)}
                        className="flex items-center gap-1.5 text-sm text-[#0a2e1a] font-medium hover:text-[#1a5233] transition-colors">
                        <Plus size={14} /> Add medication
                      </button>
                    )}
                  </div>
                )}

                {/* Lab orders */}
                {tab === "labs" && (
                  <div>
                    <p className="text-xs text-slate-400 mb-4">Select all investigations to order for this visit.</p>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-6">
                      {LAB_TESTS.map(t => (
                        <label key={t} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={labChecked.has(t)} onChange={() => toggleLab(t)}
                            className="rounded border-slate-300 text-[#0a2e1a] focus:ring-[#0a2e1a] w-4 h-4 flex-shrink-0" />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {tab === "notes" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Consultation notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={9}
                      placeholder="Private notes, patient education, follow-up plan, referral reason…"
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 resize-none placeholder:text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Route notice — auto-routed to Cashier */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center gap-3 text-sm">
                <CreditCard size={18} className="text-[#0a2e1a]" />
                <div>
                  <p className="font-medium text-slate-800">Auto-routed to Cashier</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Patient will proceed to the cashier for billing after consultation
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            {/* Actions */}
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
      {active && (
        <PrintConsultationForm
          patient={active}
          symptoms={symptoms}
          diagnosis={diagnosis}
          notes={notes}
          rxDrafts={rxDrafts}
          labChecked={labChecked}
          doctorName={doctorName}
        />
      )}
    </div>
  );
}