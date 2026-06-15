"use client";
import React, { useState, useEffect } from "react";
import { Activity, Baby, Pill, FileText, LogOut, Printer, PlusCircle, Trash2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NurseMidwifeDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("triage");
  const [patients, setPatients] = useState<any[]>([]);
  const [reportText, setReportText] = useState("");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [drugInput, setDrugInput] = useState({ name: "", dose: "", frequency: "" });

  const handleAddDrug = () => {
    if (!drugInput.name) return;
    setPrescriptions([...prescriptions, { ...drugInput, id: Date.now() }]);
    setDrugInput({ name: "", dose: "", frequency: "" });
  };

  const handleSharePrescription = () => {
    alert("Prescription shared with Pharmacy!");
    setPrescriptions([]);
  };

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
          <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>{activeTab.replace("-", " ")}</h1>
        </header>

        <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          
          {/* TRIAGE */}
          {activeTab === "triage" && (
             <div><h3 style={{ marginBottom: '20px' }}>Patients Awaiting Triage</h3>{patients.map((p: any) => <div key={p.id} style={{ padding: '15px', borderBottom: '1px solid #eee' }}>Patient ID: {p.id}</div>)}</div>
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
    </div>
  );
}