"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Search, 
  UserPlus, 
  UserCheck, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ShieldAlert,
  FileText,
  Phone,
  MapPin,
  FileHeart
} from "lucide-react";

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  dob: string | null;
  gender: string;
  phone: string | null;
  address: string | null;
  chiefComplaint: string;
  isEmergency: boolean;
  status: string;
  createdAt: string;
}

export default function ReceptionistPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'search' | 'register'>('search');
  const [registrationMode, setRegistrationMode] = useState<'normal' | 'emergency'>('normal');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    dob: "",
    gender: "",
    phone: "",
    address: "",
    chiefComplaint: ""
  });

  // Fetch all active profiles from your single backend route
  const fetchActiveRegistry = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Tracking node sync failure:", err);
    }
  };

  useEffect(() => {
    fetchActiveRegistry();
  }, []);

  const normalFields = [
    { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "e.g., John" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Okello" },
    { id: "age", label: "Age", type: "number", required: true, placeholder: "Years" },
    { id: "dob", label: "Date of Birth", type: "date", required: true, placeholder: "" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "e.g., 0770000000" },
    { id: "address", label: "Residential Address", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Village, District details..." },
    { id: "chiefComplaint", label: "Chief Complaint", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Reason for visit..." },
  ];

  const emergencyFields = [
    { id: "firstName", label: "First Name / Alias", type: "text", required: true, placeholder: "Use 'Unknown' if unresponsive" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Trauma Male Alpha" },
    { id: "age", label: "Estimated Age", type: "number", required: true, placeholder: "Estimated Years" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "chiefComplaint", label: "Emergency Presentation Details", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Describe presentation: RTA, severe bleeding..." },
  ];

  const activeFields = registrationMode === 'emergency' ? emergencyFields : normalFields;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: formData.age,
          dob: registrationMode === 'normal' ? formData.dob : null,
          gender: formData.gender,
          phone: registrationMode === 'normal' ? formData.phone : null,
          address: registrationMode === 'normal' ? formData.address : null,
          chiefComplaint: formData.chiefComplaint,
          isEmergency: registrationMode === 'emergency'
        })
      });

      if (!response.ok) throw new Error("Failed validation write step.");

      await fetchActiveRegistry();
      setActiveTab('search'); 
      setFormData({ firstName: "", lastName: "", age: "", dob: "", gender: "", phone: "", address: "", chiefComplaint: "" });
      setSelectedPatient(null);
    } catch (err) {
      console.error(err);
      alert("Registration failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch function to route patients down the pipeline via PATCH
  const handleDispatchPipeline = async (patientId: number, targetRoomStatus: string) => {
    try {
      const response = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patientId, status: targetRoomStatus })
      });

      if (response.ok) {
        alert(`Patient successfully routed to ${targetRoomStatus.replace('_', ' ')}`);
        await fetchActiveRegistry();
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error("Routing error:", err);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
      
      {/* Brand Header Banner featuring actual Image Assets */}
      <nav className="border-b border-slate-200 bg-white px-8 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-100">
              <Image 
                src="/Images/LOGO.jpg" 
                alt="Main Street Medical Center Logo" 
                fill
                priority
                sizes="56px"
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">Main Street Medical Center</h1>
              <p className="text-xs font-semibold tracking-wide text-rose-600">Commitment to Good Health</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">Receptionist Desk Active</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-6 space-y-6">
        
        {/* Navigation Toggles */}
        <div className="flex gap-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all ${activeTab === 'search' ? 'border-[#00703C] text-[#00703C]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Search size={16} /> Central Tracking Desk
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all ${activeTab === 'register' ? 'border-[#00703C] text-[#00703C]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <UserPlus size={16} /> Register New Patient
          </button>
        </div>

        {activeTab === 'search' && (
          <div className="grid gap-6 lg:grid-cols-3">
            
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">Live Master Registry Look-Up</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tracking registry by Unique ID, First Name, or Last Name..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#00703C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Live Admissions</span>
                  <span className="text-xs font-bold text-slate-400 font-mono">{filteredPatients.length} Records</span>
                </div>

                {filteredPatients.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
                    <div className="rounded-2xl bg-slate-50 p-4 text-slate-400 border border-slate-100 mb-3"><AlertCircle size={28} className="text-slate-300"/></div>
                    <h3 className="text-sm font-bold text-slate-800">No Patient Logs Registered</h3>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">Database collection array pool is currently empty.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPatients.map((patient) => (
                      <div 
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`group flex items-center justify-between p-4 transition-all cursor-pointer hover:bg-slate-50/80 ${selectedPatient?.id === patient.id ? 'bg-emerald-50/40 border-l-4 border-[#00703C]' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold tracking-wider text-[#00703C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{patient.patientNumber}</span>
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#00703C]">{patient.lastName}, {patient.firstName}</h4>
                            {patient.isEmergency && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-600 animate-pulse">
                                <ShieldAlert size={10}/> Emergency Fast-Track
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-slate-400">
                            <span><strong>Age/Sex:</strong> {patient.age} Yrs ({patient.gender})</span>
                            <span>•</span>
                            <span><strong>Status:</strong> {patient.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-[#00703C] group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline Action Hub */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Workflow Router</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Route records securely across hospital workstations.</p>
                </div>

                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <div className="text-base font-black text-slate-800">{selectedPatient.lastName}, {selectedPatient.firstName}</div>
                      <div className="font-mono text-xs font-bold text-[#00703C]">{selectedPatient.patientNumber}</div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone size={14} /> <span>Contact: <strong>{selectedPatient.phone || "Bypassed"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={14} /> <span className="truncate">Address: <strong>{selectedPatient.address || "Bypassed"}</strong></span>
                      </div>
                      <div className="flex flex-col pt-2 border-t border-slate-100">
                        <span className="text-slate-400 font-bold mb-1 tracking-wider text-[10px] uppercase flex items-center gap-1">
                          <FileHeart size={12}/> Presenting Manifestation Details
                        </span>
                        <p className="font-medium text-slate-600 bg-slate-50/80 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">{selectedPatient.chiefComplaint}</p>
                      </div>
                    </div>

                    {/* Direct Quick-Routing Action Array buttons */}
                    <div className="pt-2 space-y-2">
                      <button 
                        onClick={() => handleDispatchPipeline(selectedPatient.id, "AWAITING_TRIAGE")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00703C] py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-all"
                      >
                        <UserCheck size={14} /> Dispatch to Triage
                      </button>
                      <button 
                        onClick={() => handleDispatchPipeline(selectedPatient.id, "AWAITING_SONOGRAPHY")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all"
                      >
                        <UserCheck size={14} /> Send to Sonographer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    Highlight a row from the registry log tracking array to execute workflow pipeline routing steps.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Entry Profile Tab Form Container */}
        {activeTab === 'register' && (
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setRegistrationMode('normal')}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === 'normal' ? 'bg-slate-50/50 text-[#00703C] border-b-2 border-[#00703C]' : 'text-slate-400'}`}
              >
                <FileText size={14} /> Standard Admission
              </button>
              <button
                type="button"
                onClick={() => setRegistrationMode('emergency')}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === 'emergency' ? 'bg-rose-50/30 text-rose-600 border-b-2 border-rose-600' : 'text-slate-400'}`}
              >
                <ShieldAlert size={14} /> Emergency Fast-Track
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="grid gap-4 p-5 md:grid-cols-2">
              {activeFields.map((field: any) => (
                <div key={field.id} className={field.colSpan || ""}>
                  <label className="mb-1 block text-xs font-bold text-slate-600 tracking-wide">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>

                  {field.type === "select" ? (
                    <select
                      name={field.id}
                      required={field.required}
                      value={(formData as any)[field.id]}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white transition focus:border-[#00703C]"
                    >
                      <option value="">Select Option</option>
                      {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.id}
                      rows={3}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={(formData as any)[field.id]}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none transition focus:border-[#00703C]"
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.id}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={(formData as any)[field.id]}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#00703C]"
                    />
                  )}
                </div>
              ))}

              <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider transition-all ${registrationMode === 'emergency' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#00703C] hover:bg-emerald-800'}`}
                >
                  <CheckCircle2 size={14} /> {isSubmitting ? "Saving..." : "Commit Record"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}