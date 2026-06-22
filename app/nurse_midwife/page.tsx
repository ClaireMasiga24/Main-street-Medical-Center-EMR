"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Activity, Baby, Pill, FileText, LogOut, Printer, PlusCircle, Trash2, Send, RefreshCw, Phone, User, Clock, AlertTriangle, X, Thermometer, Droplets, Heart, Wind, Scale, Ruler, Eye, AlertCircle, Stethoscope, ArrowRight, CheckCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function NurseMidwifeDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("triage");
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [drugInput, setDrugInput] = useState({ name: "", dose: "", frequency: "" });

  // ── Triage Modal State ────────────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<TriagePatient | null>(null);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const emptyTriageForm = (patient: TriagePatient): TriageFormData => ({
    modeOfArrival: "WALK_IN",
    temperature: "",
    bpSystolic: "",
    bpDiastolic: "",
    heartRate: "",
    respiratoryRate: "",
    spo2: "",
    weight: "",
    height: "",
    painLevel: "",
    painLocation: "",
    chiefComplaint: patient.chiefComplaint || "",
    allergies: "",
    medicalHistory: "",
    nursingObservations: "",
    nursingNotes: "",
    esiLevel: null,
    redFlags: [],
    triageOutcome: "SEND_DOCTOR",
    referredTo: "",
    studyType: "",
  });

  const [triageForm, setTriageForm] = useState<TriageFormData>(emptyTriageForm({} as TriagePatient));

  const setTriageField = (field: keyof TriageFormData, value: any) => {
    setTriageForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBeginTriage = (patient: TriagePatient) => {
    setSelectedPatient(patient);
    setTriageForm(emptyTriageForm(patient));
    setShowTriageModal(true);
  };

  const handleCancelTriage = () => {
    setShowTriageModal(false);
    setSelectedPatient(null);
  };

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

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to save: ${err.error}`);
        return;
      }

      if (completeAndSend) {
        setShowTriageModal(false);
        setSelectedPatient(null);
        fetchTriagePatients(); // refresh the queue
      } else {
        alert("Triage saved as draft.");
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDrug = () => {
    if (!drugInput.name) return;
    setPrescriptions([...prescriptions, { ...drugInput, id: Date.now() }]);
    setDrugInput({ name: "", dose: "", frequency: "" });
  };

  const handleSharePrescription = () => {
    alert("Prescription shared with Pharmacy!");
    setPrescriptions([]);
  };

  // ── Fetch triage patients from the API ─────────────────────────────────────
  const fetchTriagePatients = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/patients?status=AWAITING_TRIAGE");
      if (!res.ok) throw new Error("Failed to load patients");
      const data = await res.json();
      setPatients(data);
    } catch (err: any) {
      setError(err.message || "Could not reach server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount, then auto-refresh every 15 seconds
  useEffect(() => {
    fetchTriagePatients();
    const interval = setInterval(fetchTriagePatients, 15_000);
    return () => clearInterval(interval);
  }, [fetchTriagePatients]);

  return (
    <div className="no-blur" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', backgroundColor: '#00703C', color: '#fff', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/Images/LOGO.jpg" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid white', objectFit: 'cover' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '10px' }}>MAIN STREET EMR</h2>
        </div>

        <nav style={{ flex: 1 }}>
          {[ 
            {id: "triage", label: "Triage & Vitals", icon: Activity}, 
            {id: "antenatal", label: "ANC Monitoring", icon: Baby},
            {id: "pharmacy", label: "Drug Prescriptions", icon: Pill},
            {id: "reports", label: "Shift Handover", icon: FileText} 
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
              style={{ width: '100%', padding: '16px', marginBottom: '8px', borderRadius: '8px', 
              backgroundColor: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#00703C' : '#fff',
              fontWeight: '700', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>

        <button onClick={() => router.push("/")} style={{ backgroundColor: '#b91c1c', color: 'white', padding: '16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Logout
        </button>
      </aside>

      {/* CONTENT */}
      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>{activeTab.replace("-", " ")}</h1>
            {activeTab === "triage" && (
              <button onClick={fetchTriagePatients} disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0f2f5', color: '#00703C', padding: '10px 18px', borderRadius: '8px', border: '1px solid #d0d5dd', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                <RefreshCw size={16} className={isLoading ? "spin" : ""} /> Refresh
              </button>
            )}
          </div>
        </header>

        <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          
          {/* TRIAGE */}
          {activeTab === "triage" && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 'bold', color: '#475569' }}>
                Patients Awaiting Triage
                <span style={{ marginLeft: '10px', backgroundColor: '#00703C', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px' }}>{patients.length}</span>
              </h3>

              {isLoading && patients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={28} style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontWeight: 'bold' }}>Loading patients…</p>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> {error}
                  <button onClick={fetchTriagePatients} style={{ marginLeft: 'auto', backgroundColor: '#b91c1c', color: 'white', padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Retry</button>
                </div>
              )}

              {!isLoading && patients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <User size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: '15px', fontWeight: 'bold' }}>No patients waiting for triage</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>Patients will appear here once the receptionist sends them</p>
                </div>
              )}

              {patients.map((p) => (
                <div key={p.id} style={{ backgroundColor: p.isEmergency ? '#fef2f2' : '#f8fafc', border: `1px solid ${p.isEmergency ? '#fecaca' : '#e2e8f0'}`, borderRadius: '10px', padding: '18px', marginBottom: '12px', borderLeft: `4px solid ${p.isEmergency ? '#dc2626' : '#00703C'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'extrabold', fontSize: '12px', color: '#00703C', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>{p.patientNumber}</span>
                        {p.isEmergency && (
                          <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={12} /> EMERGENCY
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{p.lastName}, {p.firstName}</h4>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                      <div style={{ fontWeight: 'bold' }}>{p.gender} · {p.age} yrs</div>
                      {p.phone && <div style={{ marginTop: '2px' }}><Phone size={10} style={{ display: 'inline', marginRight: '2px' }} />{p.phone}</div>}
                      <div style={{ marginTop: '2px', fontSize: '11px', color: '#94a3b8' }}><Clock size={10} style={{ display: 'inline', marginRight: '2px' }} />{p.createdAt}</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Chief Complaint</p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{p.chiefComplaint}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleBeginTriage(p)} style={{ flex: 1, backgroundColor: '#00703C', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
                      <Activity size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Begin Triage
                    </button>
                    <button onClick={() => handleBeginTriage(p)} style={{ backgroundColor: '#fff', color: '#00703C', padding: '10px', borderRadius: '6px', border: '1px solid #00703C', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PHARMACY */}
          {activeTab === "pharmacy" && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '30px' }}>
                <input placeholder="Drug Name" value={drugInput.name} onChange={(e) => setDrugInput({...drugInput, name: e.target.value})} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input placeholder="Dose" value={drugInput.dose} onChange={(e) => setDrugInput({...drugInput, dose: e.target.value})} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <input placeholder="Frequency" value={drugInput.frequency} onChange={(e) => setDrugInput({...drugInput, frequency: e.target.value})} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                <button onClick={handleAddDrug} style={{ backgroundColor: '#00703C', color: 'white', padding: '0 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><PlusCircle size={20} /></button>
              </div>

              {prescriptions.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee' }}>
                  <span><strong>{p.name}</strong> - {p.dose} ({p.frequency})</span>
                  <button onClick={() => setPrescriptions(prescriptions.filter(x => x.id !== p.id))} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              ))}

              {prescriptions.length > 0 && (
                <button onClick={handleSharePrescription} style={{ marginTop: '20px', backgroundColor: '#00703C', color: 'white', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                  <Send size={18} style={{ marginRight: '8px' }} /> SHARE PRESCRIPTION
                </button>
              )}
            </div>
          )}

          {/* REPORTS */}
          {activeTab === "reports" && (
            <div>
              <textarea placeholder="Clinical notes for handover..." value={reportText} onChange={(e) => setReportText(e.target.value)} style={{ width: '100%', height: '150px', padding: '12px', marginBottom: '15px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <button onClick={() => window.print()} style={{ backgroundColor: '#00703C', color: 'white', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}><Printer size={18} style={{ marginRight: '8px' }} /> PRINT HANDOVER</button>
            </div>
          )}

        </section>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          TRIAGE ASSESSMENT MODAL
          ════════════════════════════════════════════════════════════════ */}
      {showTriageModal && selectedPatient && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
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
            .watermarked-form > * {
              position: relative;
              z-index: 1;
            }
            @media print {
              .watermarked-form::before {
                opacity: 0.08 !important;
              }
            }
          `}</style>
          <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', marginTop: '20px', marginBottom: '20px' }}>

            {/* ── Modal Header ──────────────────────────────────────────── */}
            <div style={{ backgroundColor: '#00703C', padding: '20px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                    {selectedPatient.lastName}, {selectedPatient.firstName}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', opacity: 0.85 }}>
                    <span>{selectedPatient.patientNumber}</span>
                    <span>|</span>
                    <span>{selectedPatient.gender} · {selectedPatient.age} yrs</span>
                    <span>|</span>
                    <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{selectedPatient.createdAt}</span>
                    {selectedPatient.isEmergency && (
                      <>
                        <span>|</span>
                        <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>EMERGENCY</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleCancelTriage} style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                <X size={16} /> Close
              </button>
            </div>

            {/* ── Modal Body with watermark (scrollable) ──────────────────── */}
            <div className="watermarked-form" style={{ padding: '30px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', position: 'relative' }}>

              {/* ── Mode of Arrival ──────────────────────────────────────── */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Mode of Arrival</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: "WALK_IN", label: "Walk-in" },
                    { value: "AMBULANCE", label: "Ambulance" },
                    { value: "WHEELCHAIR", label: "Wheelchair" },
                    { value: "REFERRAL", label: "Referral" },
                    { value: "TRANSFER", label: "Transfer" },
                  ].map(mode => (
                    <button key={mode.value} onClick={() => setTriageField("modeOfArrival", mode.value)}
                      style={{ padding: '8px 18px', borderRadius: '20px', border: `2px solid ${triageForm.modeOfArrival === mode.value ? '#00703C' : '#e2e8f0'}`, backgroundColor: triageForm.modeOfArrival === mode.value ? '#dcfce7' : 'white', color: triageForm.modeOfArrival === mode.value ? '#00703C' : '#64748b', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Vital Signs ─────────────────────────────────────────── */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#00703C', textTransform: 'uppercase', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} /> Vital Signs
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {[
                    { key: 'temperature', label: 'Temp (°C)', icon: Thermometer, low: 36.1, high: 37.8 },
                    { key: 'heartRate', label: 'Pulse (bpm)', icon: Heart, low: 60, high: 100 },
                    { key: 'respiratoryRate', label: 'RR (br/min)', icon: Wind, low: 12, high: 20 },
                    { key: 'spo2', label: 'SpO₂ (%)', icon: Droplets, low: 95, high: 100 },
                  ].map(v => {
                    const val = parseFloat(triageForm[v.key as keyof TriageFormData] as string);
                    const abnormal = !isNaN(val) && (val < v.low || val > v.high);
                    return (
                      <div key={v.key} style={{ backgroundColor: abnormal ? '#fef2f2' : '#f8fafc', border: `1px solid ${abnormal ? '#fecaca' : '#e2e8f0'}`, borderRadius: '8px', padding: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: abnormal ? '#b91c1c' : '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <v.icon size={14} /> {v.label}
                          {abnormal && <AlertTriangle size={12} color="#b91c1c" />}
                        </label>
                        <input type="number" step="0.1" value={triageForm[v.key as keyof TriageFormData] as string}
                          onChange={e => setTriageField(v.key as keyof TriageFormData, e.target.value)}
                          style={{ width: '100%', padding: '8px', border: `1px solid ${abnormal ? '#f87171' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', outline: 'none', backgroundColor: abnormal ? '#fff' : 'white' }}
                          placeholder="—" />
                        {abnormal && <span style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px', display: 'block' }}>Normal: {v.low}–{v.high}</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { key: 'bpSystolic', label: 'BP Systolic (mmHg)', icon: Eye, low: 90, high: 140 },
                    { key: 'bpDiastolic', label: 'BP Diastolic (mmHg)', icon: Eye, low: 60, high: 90 },
                    { key: 'weight', label: 'Weight (kg)', icon: Scale, low: null, high: null },
                    { key: 'height', label: 'Height (cm)', icon: Ruler, low: null, high: null },
                  ].map(v => {
                    const val = parseFloat(triageForm[v.key as keyof TriageFormData] as string);
                    const abnormal = v.low !== null && !isNaN(val) && (val < v.low || val > v.high);
                    return (
                      <div key={v.key} style={{ backgroundColor: abnormal ? '#fef2f2' : '#f8fafc', border: `1px solid ${abnormal ? '#fecaca' : '#e2e8f0'}`, borderRadius: '8px', padding: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: abnormal ? '#b91c1c' : '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <v.icon size={14} /> {v.label}
                          {abnormal && <AlertTriangle size={12} color="#b91c1c" />}
                        </label>
                        <input type="number" step="0.1" value={triageForm[v.key as keyof TriageFormData] as string}
                          onChange={e => setTriageField(v.key as keyof TriageFormData, e.target.value)}
                          style={{ width: '100%', padding: '8px', border: `1px solid ${abnormal ? '#f87171' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', outline: 'none' }}
                          placeholder="—" />
                        {abnormal && <span style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px', display: 'block' }}>Normal: {v.low}–{v.high}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Pain & Clinical Assessment ────────────────────────────── */}
              <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Pain Assessment</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Pain Level (0–10)</label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} onClick={() => setTriageField("painLevel", n.toString())}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${triageForm.painLevel === n.toString() ? '#00703C' : '#e2e8f0'}`, backgroundColor: triageForm.painLevel === n.toString() ? '#dcfce7' : 'white', color: triageForm.painLevel === n.toString() ? '#00703C' : '#64748b', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', marginTop: '2px', padding: '0 2px' }}>
                      <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span><span>Worst</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Pain Location</label>
                    <input type="text" value={triageForm.painLocation} onChange={e => setTriageField("painLocation", e.target.value)}
                      placeholder="e.g., lower abdomen, right knee..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Allergies & Medical History</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Known Allergies</label>
                    <textarea value={triageForm.allergies} onChange={e => setTriageField("allergies", e.target.value)}
                      placeholder="List known allergies (drug, food, environmental)..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '60px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Relevant Medical History</label>
                    <textarea value={triageForm.medicalHistory} onChange={e => setTriageField("medicalHistory", e.target.value)}
                      placeholder="Chronic conditions, past surgeries, medications..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '60px' }} />
                  </div>
                </div>
              </div>

              {/* ── Nursing Observations ─────────────────────────────────── */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nursing Observations</h4>
                <textarea value={triageForm.nursingObservations} onChange={e => setTriageField("nursingObservations", e.target.value)}
                  placeholder="General appearance, skin condition, mobility, behaviour, additional observations..."
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '60px' }} />
              </div>

              {/* ── Red-Flag Indicators ──────────────────────────────────── */}
              <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Red-Flag Indicators — Check all that apply
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    "Airway compromise", "Severe respiratory distress", "Shock / hypotension",
                    "Unresponsive / unconscious", "Active seizure", "Severe bleeding / hemorrhage",
                    "Chest pain + cardiac symptoms", "Severe allergic reaction",
                  ].map(flag => {
                    const checked = triageForm.redFlags.includes(flag);
                    return (
                      <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: checked ? '#fecaca' : 'white', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${checked ? '#b91c1c' : '#fecaca'}`, fontSize: '12px', fontWeight: checked ? 'bold' : 'normal', color: checked ? '#7f1d1d' : '#b91c1c' }}>
                        <input type="checkbox" checked={checked} onChange={() => setTriageField("redFlags", checked ? triageForm.redFlags.filter(f => f !== flag) : [...triageForm.redFlags, flag])} style={{ accentColor: '#b91c1c' }} />
                        {flag}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── ESI Classification ────────────────────────────────────── */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={14} /> Emergency Severity Index (ESI)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { level: 1, label: "Resuscitation", color: "#dc2626", desc: "Immediate life-saving intervention" },
                    { level: 2, label: "Emergent", color: "#f97316", desc: "High risk / confused / severe pain" },
                    { level: 3, label: "Urgent", color: "#eab308", desc: "Needs 2+ resources, stable vitals" },
                    { level: 4, label: "Less Urgent", color: "#22c55e", desc: "Needs 1 resource" },
                    { level: 5, label: "Non-Urgent", color: "#06b6d4", desc: "No resources needed" },
                  ].map(esi => (
                    <button key={esi.level} onClick={() => setTriageField("esiLevel", esi.level)}
                      style={{ padding: '14px 10px', borderRadius: '10px', border: `2px solid ${triageForm.esiLevel === esi.level ? esi.color : '#e2e8f0'}`, backgroundColor: triageForm.esiLevel === esi.level ? `${esi.color}15` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: triageForm.esiLevel === esi.level ? esi.color : '#e2e8f0', color: 'white', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{esi.level}</div>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', color: triageForm.esiLevel === esi.level ? esi.color : '#475569' }}>{esi.label}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>{esi.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Nursing Notes ────────────────────────────────────────── */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nursing Notes</h4>
                <textarea value={triageForm.nursingNotes} onChange={e => setTriageField("nursingNotes", e.target.value)}
                  placeholder="Free-text nursing notes, clinical impressions, handover details..."
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '80px' }} />
              </div>

              {/* ── Triage Outcome ────────────────────────────────────────── */}
              <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRight size={14} /> Triage Outcome — Where does the patient go next?
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {[
                    { value: "SEND_DOCTOR", label: "Doctor", color: "#6366f1", desc: "Joins doctor queue" },
                    { value: "EMERGENCY", label: "Emergency Unit", color: "#dc2626", desc: "Immediate care needed" },
                    { value: "OBSERVATION", label: "Observation Area", color: "#eab308", desc: "Monitor & reassess" },
                    { value: "SPECIALIST", label: "Specialist", color: "#06b6d4", desc: "Specialist consultation" },
                    { value: "DENTIST", label: "Dentist", color: "#0891b2", desc: "Dental department" },
                    { value: "LABORATORY", label: "Laboratory", color: "#d97706", desc: "Lab tests & specimens" },
                    { value: "RADIOLOGY", label: "Radiology", color: "#7c3aed", desc: "X-ray / imaging" },
                    { value: "DISCHARGE", label: "Discharge", color: "#22c55e", desc: "Patient can go home" },
                  ].map(outcome => (
                    <button key={outcome.value} onClick={() => setTriageField("triageOutcome", outcome.value)}
                      style={{ padding: '14px 8px', borderRadius: '10px', border: `2px solid ${triageForm.triageOutcome === outcome.value ? outcome.color : '#d0d5dd'}`, backgroundColor: triageForm.triageOutcome === outcome.value ? 'white' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: triageForm.triageOutcome === outcome.value ? outcome.color : '#475569' }}>{outcome.label}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{outcome.desc}</div>
                    </button>
                  ))}
                </div>
                {triageForm.triageOutcome === "SPECIALIST" && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Referred To (Specialist / Department)</label>
                    <input type="text" value={triageForm.referredTo} onChange={e => setTriageField("referredTo", e.target.value)}
                      placeholder="e.g., Orthopedics, Cardiology, Dr. Mukasa..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none' }} />
                  </div>
                )}
                {(triageForm.triageOutcome === "RADIOLOGY") && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Imaging Study Type</label>
                    <select value={triageForm.studyType} onChange={e => setTriageField("studyType", e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', backgroundColor: 'white' }}>
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

              {/* ── Action Buttons ────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button onClick={handleCancelTriage} disabled={isSaving}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  Cancel
                </button>
                <button onClick={() => window.print()} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={16} /> Print
                </button>
                <button onClick={() => handleSaveTriage(false)} disabled={isSaving}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #00703C', backgroundColor: 'white', color: '#00703C', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {isSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => handleSaveTriage(true)} disabled={isSaving}
                  style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', backgroundColor: '#00703C', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> {isSaving ? "Sending..." : "Complete & Send"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}