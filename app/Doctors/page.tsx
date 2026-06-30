"use client";





import Image from "next/image";


import { useState, useEffect, useCallback, useRef, useMemo } from "react";


import { useRouter } from "next/navigation";


import NotificationInbox from "../components/NotificationInbox";


import StaffMessaging from "../components/StaffMessaging";


import {


		  Users, Pill, ArrowLeft, ArrowRight, Baby, CheckCircle,


		  LogOut, AlertTriangle, Stethoscope, DoorOpen, Hospital,


		  Microscope, Waves, Radio, Home, CreditCard, X, Plus, Loader2, Calendar, ClipboardList, Printer,


			  Clock, Activity, AlertCircle, FileText, Bell, Search, User, Pencil, Syringe, RefreshCw, Menu, Send, Receipt, Share2,


	} from "lucide-react";





// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





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





// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





	const LAB_TESTS = [


	  "Full Blood Count (FBC / CBC)",


	  "Blood Smear for Malaria Parasites (MPS)",


	  "Malaria RDT",


	  "Urinalysis",


	  "Urine Microscopy",


	  "Blood Glucose (Random RBS)",


	  "Blood Glucose (Fasting FBS)",


	  "HbA1c",


	  "HIV Screen (1/2)",


	  "Hepatitis B Surface Antigen (HepBSAg)",


	  "Typhoid IgG",


	  "Typhoid IgM Ab Test",


	  "Widal Test",


	  "TPHA (Syphilis)",


	  "H. Pylori Stool Antigen",


	  "H. Pylori Antibody Test",


	  "Liver Function Test (LFT)",


	  "Renal Function Test (RFT)",


	  "Serum Electrolytes",


	  "Lipid Profile",


	  "Thyroid Function Test (TSH/T3/T4)",


	  "Coagulation Profile (PT/INR/APTT)",


	  "ESR",


	  "CD4 Count",


	  "Blood Group & Crossmatch",


	  "Brucella Agglutination Test",


	  "Solubility Test for Sickle Cell",


	  "MHS Sickle Cell Confirmatory Test",


	  "Urine hCG (Pregnancy Test)",


	  "Stool Analysis",


	  "Blood Culture & Sensitivity",


	  "Sputum AFB / GeneXpert TB",


	  "PSA (Prostate Specific Antigen)",


	  "Pap Smear",


	  "Uric Acid",


	  "Complete Blood Count with WBC Differential (3-part)",


	  "MPV (Mean Platelet Volume)",


	  "Post Blood Sugar (Post BS)",


	  "Sickling Test (Solubility)",


	];





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
		    // Deduplicate by doctorName keeping earliest
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


  "Lab Referral": Microscope,


  "Radiology Referral": Radio,


  "Sonography Referral": Waves,


  "Dentist Referral": Stethoscope,


  "Nurse Referral": Activity,


  "Follow-up": Users,


};





const SOURCE_COLORS: Record<string, string> = {


  "Triage": "bg-blue-100 text-blue-700",


  "Emergency": "bg-red-100 text-red-700",


  "Appointment": "bg-purple-100 text-purple-700",


  "Lab Referral": "bg-amber-100 text-amber-700",


  "Radiology Referral": "bg-cyan-100 text-cyan-700",


  "Sonography Referral": "bg-teal-100 text-teal-700",


  "Dentist Referral": "bg-indigo-100 text-indigo-700",


  "Nurse Referral": "bg-pink-100 text-pink-700",


  "Follow-up": "bg-emerald-100 text-emerald-700",


};
const RETURNING_SOURCES = new Set([
  "Lab Referral",
  "Radiology Referral",
  "Sonography Referral",
  "Dentist Referral",
  "Nurse Referral",
]);

const isReturningPatient = (source: string) => RETURNING_SOURCES.has(source);






// â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





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





      {/* Mobile drawer â€” uses left instead of translate to preserve position:fixed on child modals */}
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





// â”€â”€â”€ Metrics Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





function MetricsBar({ metrics }: { metrics: DashboardMetrics }) {


  const cards = [


    { label: "Waiting", value: metrics.awaitingDoctor, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },


    { label: "In Consultation", value: metrics.inConsultation, icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },


    { label: "Completed Today", value: metrics.completedToday, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },


    { label: "Pending Labs", value: metrics.pendingLabs, icon: Microscope, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },


    { label: "Pending Radiology", value: metrics.pendingRadiology, icon: Radio, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },


    { label: "Appointments", value: metrics.todayAppointments, icon: Calendar, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },


  ];





  return (


    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">


      {cards.map((c) => (


        <div


          key={c.label}


          className={`${c.bg} ${c.border} border rounded-lg px-2 py-2 flex items-center gap-2`}


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





// â”€â”€â”€ Patient Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





function PatientCard({


  patient,


  onSelect,


  onStartConsultation,


}: {


  patient: DashboardPatient;


  onSelect: (p: DashboardPatient) => void;


  onStartConsultation: (p: DashboardPatient) => void;


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

        {/* Appointment time */}
        {patient.source === "Appointment" && patient.appointmentTime && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Calendar size={11} />
            <span>Scheduled at {new Date(patient.appointmentTime).toLocaleTimeString("en-UG", {
              hour: "2-digit", minute: "2-digit",
            })}</span>
          </div>
        )}

        {/* Pending items */}
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





        {/* Action Button */}


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





// â”€â”€â”€ Clinical Updates Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





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





// â”€â”€â”€ Consultation Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





function ConsultationPanel({
  patient,
  onBack,
  onComplete,
  staffId,
  staffName,
  initialTab,
}: {
  patient: DashboardPatient;
  onBack: () => void;
  onComplete: () => void;
  staffId: number;
  staffName: string;
  initialTab?: "history" | "exam" | "diagnosis" | "rx" | "procedures" | "notes";
}) {
  const [tab, setTab] = useState<"history" | "exam" | "diagnosis" | "rx" | "procedures" | "notes">(initialTab || "diagnosis");
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


  const [showShareModal, setShowShareModal] = useState(false);


  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);


  const [shareLabData, setShareLabData] = useState<any[] | null>(null);


  const [shareDataLoading, setShareDataLoading] = useState(false);


  const [priorDoctors, setPriorDoctors] = useState<{ doctorName: string; createdAt: string }[]>([]);


  const [consultationStarted, setConsultationStarted] = useState(patient.currentStatus === "IN_CONSULTATION" || patient.currentStatus === "AWAITING_DOCTOR");





  // â”€â”€ Procedures state â”€â”€


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


    setNewRx({ medication: "", dosage: "", instructions: "" });


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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/doctor/records?patientId=${patient.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const patientRecord = (data.patients ?? []).find(
          (p: any) => p.id === patient.id
        );
        if (patientRecord?.visitHistory) {
          setVisitHistory(patientRecord.visitHistory);
        }
      } catch {
        // silently ignore
      }
    })();
  }, [patient.id]);
  const [returningLabResults, setReturningLabResults] = useState<any[]>([]);
  const [returningImagingResults, setReturningImagingResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const isReturning = patient.source && isReturningPatient(patient.source);
      if (!isReturning) return;
      try {
        const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.labRequests) {
          setReturningLabResults(data.labRequests.filter((lr: any) => lr.status === "COMPLETED" && lr.results));
        }
        if (data.imagingRequests) {
          setReturningImagingResults(data.imagingRequests.filter((ir: any) => ir.status === "REPORTED" && (ir.findings || ir.impression || ir.conclusion)));
        }
      } catch {
        // silently ignore
      }
    })();
  }, [patient.id, patient.source]);







  useEffect(() => {


    (async () => {


      try {


        const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);


        if (!res.ok) return;


        const data = await res.json();


        const docs: { doctorName: string; createdAt: string }[] = (data.reviews ?? []).map((r: any) => ({


          doctorName: r.doctorName || "Unknown",


          createdAt: r.createdAt || "",


        }));


        // Deduplicate by doctorName keeping the earliest entry


        const seen = new Map<string, string>();


        for (const d of docs) {


          if (!seen.has(d.doctorName) || d.createdAt < seen.get(d.doctorName)!) {


            seen.set(d.doctorName, d.createdAt);


          }


        }


        const unique = Array.from(seen.entries()).map(([doctorName, createdAt]) => ({ doctorName, createdAt }));


        unique.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));


        setPriorDoctors(unique);


      } catch { /* silently ignore */ }


    })();


  }, [patient.id]);





  const handleSaveProcedure = async () => {


    if (!procedureName.trim()) { alert("Please enter the procedure name."); return; }


    if (!procedureNotes.trim()) { alert("Please enter procedure notes."); return; }


    setSavingProcedure(true);


    try {


      const res = await fetch("/api/doctor", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          action: "SAVE_PROCEDURE",


          patientId: patient.id,


          procedureName: procedureName.trim(),


          procedureNotes: procedureNotes.trim(),


          treatmentFollowUp: procedureTreatment.trim(),


          performedBy: procedurePerformedBy.trim() || staffName,


        }),


      });


      if (res.ok) {


        setProcedureName("");


        setProcedureNotes("");


        setProcedureTreatment("");


        setProcedurePerformedBy("");


        setShowProcedureForm(false);


        fetchProcedures();


      } else {


        const err = await res.json();


        alert(`Error: ${err.error}`);


      }


    } catch {


      alert("Network error saving procedure.");


    } finally {


      setSavingProcedure(false);


    }


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


          staffId,


          staffName,


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





  const handleSendOrders = async () => {


    setSaving(true);


    setSavingAction("SEND_ORDERS");


    try {


      const res = await fetch("/api/doctor", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          patientId: patient.id,


          staffId,


          staffName,


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


          routeTo: "SEND_ORDERS",


        }),


      });


      if (res.ok) {


        alert("Orders sent! Lab and Pharmacy have been notified.");


        onComplete();


      } else {


        const err = await res.json();


        alert(`Error: ${err.error}`);


      }


    } catch {


      alert("Network error sending orders.");


    } finally {


      setSaving(false);


      setSavingAction("");


    }


  };





  const handleShareResults = async () => {


    if (selectedShareTargets.length === 0) { alert("Select at least one recipient."); return; }


    setSaving(true);


    setSavingAction("SHARE");


    try {


      const res = await fetch("/api/doctor", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          patientId: patient.id,


          staffId,


          staffName,


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


          routeTo: "SHARE",


          shareTargets: selectedShareTargets,


        }),


      });


      if (res.ok) {


        alert("Results shared successfully.");


        setShowShareModal(false);


      } else {


        const err = await res.json();


        alert(`Error: ${err.error}`);


      }


    } catch {


      alert("Network error sharing results.");


    } finally {


      setSaving(false);


      setSavingAction("");


    }


  };





  const handlePrintWithLabs = async () => {


    let labRowsHtml = "";


    try {


      const res = await fetch(`/api/doctor/reviews?patientId=${patient.id}`);


      if (res.ok) {


        const data = await res.json();


        const labs = data.labRequests ?? [];


        if (labs.length > 0) {


          const rows = labs


            .filter((lr: any) => lr.results && lr.status === "COMPLETED")


            .map((lr: any) => {


              let parsed: any[] = [];


              try { const p = JSON.parse(lr.results); if (Array.isArray(p)) parsed = p; } catch {}


              if (parsed.length === 0) {


                return `<tr><td colspan="6" style="padding:8px;font-size:12px;color:#666;text-align:center;font-style:italic">${lr.testName} â€” no detailed results</td></tr>`;


              }


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


            })


            .join("");


          if (rows) {


            labRowsHtml = `<div style="margin-bottom:16px;page-break-inside:avoid">


              <h3 style="font-size:12px;color:#0a2e1a;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px">Laboratory Results</h3>


              <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;font-size:11px">


                <thead>


                  <tr style="background:#0a2e1a;color:#fff">


                    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px">Parameter</th>


                    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Result</th>


                    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Unit</th>


                    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Reference Range</th>


                    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px">Flag</th>


                  </tr>


                </thead>


                <tbody>${rows}</tbody>


              </table>


            </div>`;


          }


        }


      }


    } catch { /* ignore fetch errors for print */ }





    const baseHtml = buildPrintHtml(false);


    const insertedHtml = baseHtml.replace(


      '</div>\n        ${doPrint',


      `${labRowsHtml}</div>\n        \${doPrint`


    );


    // If the simple replace didn't work, insert before the closing body div


    const finalHtml = labRowsHtml


      ? baseHtml.replace(


          '<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;justify-content:space-between">',


          `${labRowsHtml}<div style="margin-top:40px;border-top:1px solid #ccc;padding-top:20px;display:flex;justify-content:space-between">`


        )


      : baseHtml;





    const printWin = window.open("", "_blank", "width=800,height=600");


    if (!printWin) { alert("Please allow pop-ups to print."); return; }


    printWin.document.write(finalHtml);


    printWin.document.close();


  };





  const handleStartConsultation = async () => {


    if (patient.currentStatus !== "IN_CONSULTATION") {


      await fetch("/api/doctor", {


        method: "PATCH",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({ patientId: patient.id }),


      });


    }


    setConsultationStarted(true);


  };





  const handlePrint = () => {


	    buildPrintHtml(true);


	  };





	  const handleDownload = () => {


	    const fullHtml = buildPrintHtml(false);


	    const pw = window.open("", "_blank", "width=800,height=600,scrollbars=yes");


	    if (!pw) { alert("Please allow pop-ups to download."); return; }


	    pw.document.write(fullHtml);


	    pw.document.close();


	    // Auto-trigger the browser's print dialog (user selects "Save as PDF")


	    setTimeout(() => { pw.focus(); pw.print(); }, 800);


	  };








		  const buildPrintHtml = (doPrint: boolean): string => {


	    const rxList = rxDrafts.map((r, i) => `${i + 1}. ${r.medication} \u2014 ${r.dosage} \u2014 ${r.instructions}`).join("<br>");


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


	    const fieldsHtml = fields.map((f) =>


	      `<div style="margin-bottom:16px;page-break-inside:avoid">


	        <h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">${f.label}</h3>


	        <p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap;line-height:1.5">${f.value}</p>


	      </div>`


	    ).join("");





		    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });





		    const html = `


		      <!DOCTYPE html>


		      <html>


		      <head>


		        <title>Main Street Medical Center - Consultation Record</title>


		        <style>


		          @page { margin: 15mm; }


          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }


          body::before {


            content: '';


            position: fixed;


            inset: 0;


            background-image: url('/Images/LOGO.jpg');


            background-size: 55%;


            background-repeat: no-repeat;


            background-position: center;


            opacity: 0.07;


            pointer-events: none;


            z-index: -1;


            print-color-adjust: exact;


            -webkit-print-color-adjust: exact;


          }


		          table { width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px; }


		          td { padding: 4px 8px; }


		          .sig-line { border-bottom: 1px solid #000; display: inline-block; min-width: 250px; padding: 4px 8px; font-size: 20px; font-family: 'Brush Script MT', 'Segoe Script', cursive, sans-serif; }


		        </style>


		      </head>


		      <body style="position:relative">


        <div style="padding:40px;max-width:800px;margin:0 auto">


		          <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #0a2e1a;padding-bottom:20px">


		            <h1 style="font-size:22px;color:#0a2e1a;margin:0;font-weight:bold">MAIN STREET MEDICAL CENTER</h1>


		            <p style="font-size:13px;color:#555;margin:4px 0 0 0">Consultation Clinical Record</p>


		          </div>


		          <table>


		            <tr>


		              <td style="font-weight:bold;color:#0a2e1a;width:150px">Patient Name:</td>


		              <td style="border-bottom:1px solid #ccc">${patient.lastName}, ${patient.firstName}</td>


		              <td style="font-weight:bold;color:#0a2e1a;width:100px">Patient ID:</td>


		              <td style="border-bottom:1px solid #ccc">${patient.patientNumber}</td>


		            </tr>


		            <tr>


		              <td style="font-weight:bold;color:#0a2e1a">Gender / Age:</td>


		              <td style="border-bottom:1px solid #ccc">${patient.gender === "MALE" ? "Male" : "Female"} / ${patient.age} yrs</td>


		              <td style="font-weight:bold;color:#0a2e1a">Date:</td>


		              <td style="border-bottom:1px solid #ccc">${today}</td>


		            </tr>


		          </table>


		          ${fieldsHtml}


		          ${rxList ? `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">Prescriptions</h3><p style="font-size:13px;color:#333;margin:0">${rxList}</p></div>` : ""}


			          ${labList ? `<div style="margin-bottom:16px;page-break-inside:avoid"><h3 style="font-size:12px;color:#0a2e1a;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">Laboratory Orders</h3><p style="font-size:13px;color:#333;margin:0">${labList}</p></div>` : ""}


			          ${buildSignatureHtml(priorDoctors, staffName, doctorSignature, today)}


		        </div>


		        ${doPrint ? '<script>window.onload = function() { window.print(); window.close(); };<\/script>' : ''}


		      </body>


		      </html>


		    `;





		    if (doPrint) {


		      const printWin = window.open("", "_blank", "width=800,height=600");


		      if (!printWin) { alert("Please allow pop-ups to print."); return html; }


		      printWin.document.write(html);


		      printWin.document.close();


		    }


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


      {/* Header */}


      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">


        <button


          onClick={onBack}


          className="text-slate-500 flex items-center gap-1 hover:text-slate-700 transition-colors text-xs sm:text-sm"


        >


          <ArrowLeft size={14} /> Back to Queue


        </button>


        <div className="flex items-center gap-2">


          <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold ${


            patient.isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"


          }`}>


            {patient.patientNumber}


          </div>


        </div>


      </div>





      {/* Patient Banner */}


      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-6">


        <div className="flex items-start justify-between gap-3">


          <div className="flex items-center gap-3 sm:gap-4 min-w-0">


            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold flex-shrink-0 ${


              patient.isEmergency ? "bg-red-100 text-red-700" : "bg-[#0a2e1a]/10 text-[#0a2e1a]"


            }`}>


              {patient.firstName[0]}{patient.lastName[0]}


            </div>


            <div className="min-w-0">


              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">


                {patient.lastName}, {patient.firstName}


              </h2>


              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 mt-1">


                <span className="font-mono text-[11px] text-[#0a2e1a]/60">{patient.patientNumber}</span>


                <span className="text-slate-300 hidden sm:inline">|</span>


                <span>{patient.gender === "MALE" ? "Male" : "Female"}</span>


                <span className="text-slate-300">|</span>


                <span>{patient.age} years</span>


                {patient.phoneNumber && (


                  <>


                    <span className="text-slate-300">|</span>


                    <span className="truncate">{patient.phoneNumber}</span>


                  </>


                )}


              </div>


            </div>


          </div>


          {patient.esiLevel && (


            <div className="text-right flex-shrink-0">


              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mx-auto ${


                ESI_COLORS[patient.esiLevel] || "bg-slate-200 text-slate-600"


              }`}>


                {patient.esiLevel}


              </div>


              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1">


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





      {!consultationStarted ? (


        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">


          <Stethoscope size={48} className="mx-auto text-slate-200 mb-4" />


          <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to begin consultation</h3>


          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">


            Review the patient details above, then click below to start the consultation.


          </p>


          <button


            onClick={handleStartConsultation}


            className="bg-[#0a2e1a] text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-[#0d3d24] transition-colors flex items-center gap-2 mx-auto"


          >


            <Activity size={16} /> Start Consultation


          </button>


        </div>


      ) : (


      <>

      {/* Returning patient banner */}
      {(() => {
        const isReturning = patient.source && isReturningPatient(patient.source);
        if (!isReturning && visitHistory.length === 0) return null;
        return (
          <div className="mb-4 space-y-3">
            {isReturning && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600 flex-shrink-0">
                  {(function(){var SrcIcon = SOURCE_ICONS[patient.source] || Stethoscope; return <SrcIcon size={18} />;})()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Returning Patient</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[patient.source] || "bg-slate-100 text-slate-600"}`}>
                      {patient.source}
                    </span>
                  </div>
                  {/* Lab Results from returning department */}
                  {returningLabResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Microscope size={12} /> Lab Results
                      </span>
                      {returningLabResults.map((lr: any) => (
                        <div key={lr.id} className="bg-white rounded-lg border border-teal-100 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{lr.testName}</span>
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Completed</span>
                          </div>
                          {lr.results && (() => {
                            try {
                              const parsed = typeof lr.results === "string" ? JSON.parse(lr.results) : lr.results;
                              if (Array.isArray(parsed)) {
                                return (
                                  <div className="text-[11px] text-slate-600 space-y-0.5">
                                    {parsed.map((r: any, ri: number) => (
                                      <div key={ri} className="flex items-center gap-2">
                                        <span className="font-medium text-slate-700 min-w-[120px]">{r.test || r.parameter || ""}</span>
                                        <span className="font-semibold">{r.result || ""}</span>
                                        {r.unit && <span className="text-slate-400">{r.unit}</span>}
                                        {r.flag === "HIGH" && <span className="text-[9px] text-red-600 font-bold">HIGH</span>}
                                        {r.flag === "LOW" && <span className="text-[9px] text-amber-600 font-bold">LOW</span>}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{typeof lr.results === "string" ? lr.results : JSON.stringify(lr.results)}</p>;
                            } catch {
                              return <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{lr.results}</p>;
                            }
                          })()}
                          {lr.validatedByName && (
                            <p className="text-[9px] text-slate-400 mt-1">Validated by: {lr.validatedByName} {lr.validatedAt ? new Date(lr.validatedAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Imaging Reports from returning department */}
                  {returningImagingResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Radio size={12} /> Imaging Reports
                      </span>
                      {returningImagingResults.map((ir: any) => (
                        <div key={ir.id} className="bg-white rounded-lg border border-teal-100 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{ir.studyType}</span>
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Reported</span>
                          </div>
                          {ir.findings && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Findings:</span><span className="text-[11px] text-slate-600">{ir.findings}</span></div>}
                          {ir.impression && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Impression:</span><span className="text-[11px] text-slate-700 font-medium">{ir.impression}</span></div>}
                          {ir.conclusion && <div><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Conclusion:</span><span className="text-[11px] text-slate-600">{ir.conclusion}</span></div>}
                          {ir.reportedAt && <p className="text-[9px] text-slate-400 mt-1">Reported: {new Date(ir.reportedAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No results yet */}
                  {returningLabResults.length === 0 && returningImagingResults.length === 0 && (
                    <p className="text-sm text-teal-700 mt-1">
                      This patient was previously seen and sent back from {patient.source?.replace(" Referral", "")}. Results will appear here once available.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Previous Visits timeline */}
            {visitHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} />
                    Previous Visits ({visitHistory.length})
                  </span>
                </div>
                <div className="divide-y divide-slate-50 max-h-[240px] overflow-y-auto">
                  {visitHistory.map((v: any, i: number) => (
                    <div key={v.id || i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={11} className="text-[#0a2e1a]/40 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-600">
                          {new Date(v.date).toLocaleDateString("en-UG", {
                            weekday: "short", day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {v.symptoms && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Complaint:</span><span className="text-[12px] text-slate-600">{v.symptoms}</span></div>}
                      {v.diagnosis && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Diagnosis:</span><span className="text-[12px] text-slate-700 font-medium">{v.diagnosis}</span></div>}
                      {v.treatmentPlan && <div className="mb-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Plan:</span><span className="text-[12px] text-slate-600">{v.treatmentPlan}</span></div>}
                      {v.assessment && <div><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Assessment:</span><span className="text-[12px] text-slate-600">{v.assessment}</span></div>}
                      {v.notes && <div><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Notes:</span><span className="text-[12px] text-slate-500 italic">{v.notes}</span></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabs */}


      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">


        <div className="flex border-b border-slate-100 overflow-x-auto">


          {([


            { key: "history" as const, label: "History", icon: FileText },


            { key: "exam" as const, label: "Examination", icon: Stethoscope },


            { key: "diagnosis" as const, label: "Diagnosis & Plan", icon: AlertCircle },


            { key: "rx" as const, label: "Prescriptions", icon: Pill },


            { key: "procedures" as const, label: "Procedures", icon: Syringe },


            { key: "notes" as const, label: "Notes & Orders", icon: ClipboardList },


          ]).map((t) => (


            <button


              key={t.key}


              onClick={() => setTab(t.key)}


              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${


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





        <div className="p-4 sm:p-6">


          {/* â”€â”€ History Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


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


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


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


                  placeholder="Plan of care â€” medications, procedures, follow-up, lifestyle modifications..."


                  value={treatmentPlan}


                  onChange={(e) => setTreatmentPlan(e.target.value)}


                />


              </div>


              <div className="border-t border-slate-100 pt-4">


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


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


              {/* â”€â”€ Print & Download Buttons â”€â”€ */}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">


                <button


                  onClick={handlePrint}


                  className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"


                >


                  <Printer size={16} /> PRINT


                </button>


                <button


                  onClick={handleDownload}


                  className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a2e1a] text-white hover:bg-[#0d3d24] transition-colors flex items-center justify-center gap-2"


                >


                  <FileText size={16} /> DOWNLOAD


                </button>


              </div>


            </div>


          )}





          {/* â”€â”€ Examination Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


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


                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">


                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">


                    <span className="text-[10px] text-slate-400">Temp</span>


                    <p className="font-semibold text-slate-700">-- Â°C</p>


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


                    <span className="text-[10px] text-slate-400">SpOâ‚‚</span>


                    <p className="font-semibold text-slate-700">--%</p>


                  </div>


                </div>


              </div>


            </div>


          )}





          {/* â”€â”€ Diagnosis & Plan Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


          {tab === "diagnosis" && (


            <div className="space-y-4">


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


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


                  placeholder="Plan of care â€” medications, procedures, follow-up, lifestyle modifications..."


                  value={treatmentPlan}


                  onChange={(e) => setTreatmentPlan(e.target.value)}


                />


              </div>


            </div>


          )}





          {/* â”€â”€ Prescriptions Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


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


                        <p className="text-xs text-slate-500">{rx.dosage} â€” {rx.instructions}</p>


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


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


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





          {/* â”€â”€ Procedures Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


          {tab === "procedures" && (


            <div className="space-y-4">


              {showProcedureForm ? (


                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">


                  <div>


                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">


                      Procedure Name


                    </label>


                    <input


                      type="text"


                      placeholder="e.g. Wound Dressing, Lumbar Puncture, Incision & Drainage"


                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"


                      value={procedureName}


                      onChange={(e) => setProcedureName(e.target.value)}


                    />


                  </div>


                  <div>


                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">


                      Procedure Notes <span className="text-red-500">*</span>


                    </label>


                    <textarea


                      placeholder="Detailed description of the procedure, findings, technique used, complications (if any)..."


                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[150px]"


                      value={procedureNotes}


                      onChange={(e) => setProcedureNotes(e.target.value)}


                    />


                  </div>


                  <div>


                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">


                      Treatment / Follow-Up


                    </label>


                    <textarea


                      placeholder="Post-procedure treatment, wound care instructions, follow-up schedule..."


                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[80px]"


                      value={procedureTreatment}


                      onChange={(e) => setProcedureTreatment(e.target.value)}


                    />


                    <p className="text-[10px] text-slate-400 mt-0.5">This will be linked to the patient's treatment record</p>


                  </div>


                  <div>


                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">


                      Performed By


                    </label>


                    <input


                      type="text"


                      placeholder="Doctor's name performing the procedure"


                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a]"


                      value={procedurePerformedBy}


                      onChange={(e) => setProcedurePerformedBy(e.target.value)}


                    />


                  </div>


                  <div className="flex gap-2 pt-1">


                    <button


                      onClick={handleSaveProcedure}


                      disabled={savingProcedure}


                      className="bg-[#0a2e1a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d3d24] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"


                    >


                      {savingProcedure ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <>Save Procedure</>}


                    </button>


                    <button


                      onClick={() => { setShowProcedureForm(false); setProcedureName(""); setProcedureNotes(""); setProcedureTreatment(""); setProcedurePerformedBy(""); }}


                      className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700"


                    >


                      Cancel


                    </button>


                  </div>


                </div>


              ) : (


                <button


                  onClick={() => setShowProcedureForm(true)}


                  className="flex items-center gap-2 text-[#0a2e1a] text-sm font-medium hover:text-[#0d3d24]"


                >


                  <Plus size={15} /> Add New Procedure


                </button>


              )}





              {/* Saved Procedures List */}


              <div className="border-t border-slate-100 pt-4">


                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Procedure History</h4>


                {proceduresLoading ? (


                  <div className="text-center py-8 text-sm text-slate-400">


                    <Loader2 size={14} className="animate-spin inline mr-1" /> Loading procedures...


                  </div>


                ) : savedProcedures.length === 0 ? (


                  <div className="text-center py-8">


                    <Syringe size={24} className="mx-auto text-slate-200 mb-2" />


                    <p className="text-sm text-slate-400">No procedures recorded for this patient</p>


                  </div>


                ) : (


                  <div className="space-y-2">


                    {savedProcedures.map((proc: any, i: number) => (


                      <div key={proc.id || i} className="bg-white border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors">


                        <div className="flex items-start justify-between gap-2 mb-1">


                          <h5 className="text-sm font-semibold text-slate-700">{proc.procedureName}</h5>


                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">


                            {new Date(proc.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}


                          </span>


                        </div>


                        {proc.procedureNotes && (


                          <p className="text-xs text-slate-600 line-clamp-3 mb-1">{proc.procedureNotes}</p>


                        )}


                        <div className="flex items-center gap-3 text-[10px] text-slate-400">


                          {proc.performedBy && <span>By: <strong className="text-slate-500">{proc.performedBy}</strong></span>}


                          {proc.treatmentFollowUp && <span className="truncate">Rx: {proc.treatmentFollowUp}</span>}


                        </div>


                      </div>


                    ))}


                  </div>


                )}


              </div>


            </div>


          )}





          {/* â”€â”€ Notes & Orders Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}


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


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">


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


                {/* â”€â”€ Send to Lab Button â”€â”€ */}


                <div className="mt-3">


                  <button


                    onClick={() => handleAction("LAB")}


                    disabled={isBusy || labChecked.size === 0}


                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${


                      isBusy && savingAction === "LAB"


                        ? "bg-emerald-100 text-emerald-700"


                        : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"


                    }`}


                  >


                    {isBusy && savingAction === "LAB" ? (


                      <><Loader2 size={13} className="animate-spin" /> Sending...</>


                    ) : (


                      <><Send size={13} /> Send to Lab</>


                    )}


                  </button>


                  {labChecked.size === 0 && (


                    <p className="text-[10px] text-slate-400 mt-1">


                      Select at least one test above


                    </p>


                  )}


                  {labChecked.size > 0 && (


                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">


                      {labChecked.size} test{labChecked.size > 1 ? "s" : ""} â€” patient goes to Lab


                    </p>


                  )}


                </div>


              </div>





              {/* â”€â”€ Signature â”€â”€ */}


              <div className="border-t border-slate-100 pt-5">


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


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





              {/* â”€â”€ Print Button â”€â”€ */}


              {/* â”€â”€ Print & Download Buttons â”€â”€ */}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                <button


                  onClick={handlePrint}


                  className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"


                >


                  <Printer size={16} /> PRINT


                </button>


                <button


                  onClick={handleDownload}


                  className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a2e1a] text-white hover:bg-[#0d3d24] transition-colors flex items-center justify-center gap-2"


                >


                  <FileText size={16} /> DOWNLOAD


                </button>


              </div>


            </div>


          )}


        </div>


      </div>





      {/* â”€â”€ Action Buttons â”€â”€ */}


      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">


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





        {/* Finish Consultation â†’ routes to Cashier for billing */}


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





        {/* Share & Print */}


        <button


          onClick={() => {


            if (!isBusy) {


              setShowShareModal(true);


              setSelectedShareTargets([]);


            }


          }}


          disabled={isBusy}


          className="py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"


        >


          <Share2 size={16} /> Share &amp; Print


        </button>


      </div>


l


      {/* â”€â”€ Send Orders Button â”€â”€ */}


      <div className="mt-3">


        <button


          onClick={handleSendOrders}


          disabled={isBusy || (labChecked.size === 0 && rxDrafts.length === 0)}


          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${


            isBusy && savingAction === "SEND_ORDERS"


              ? "bg-indigo-100 text-indigo-700"


              : "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"


          }`}


        >


          {isBusy && savingAction === "SEND_ORDERS" ? (


            <><Loader2 size={16} className="animate-spin" /> Sending orders...</>


          ) : (


            <><Send size={16} /> Send Orders (Labs &amp; Prescriptions)</>


          )}


        </button>


        {labChecked.size === 0 && rxDrafts.length === 0 && (


          <p className="text-[11px] text-slate-400 text-center mt-1">


            Add lab tests or prescriptions above first


          </p>


        )}


        {labChecked.size > 0 && rxDrafts.length > 0 && (


          <p className="text-[11px] text-indigo-500 text-center mt-1 font-medium">


            Sending {labChecked.size} lab test{labChecked.size > 1 ? "s" : ""} to Lab, {rxDrafts.length} prescription{rxDrafts.length > 1 ? "s" : ""} to Pharmacy


          </p>


        )}


        {labChecked.size > 0 && rxDrafts.length === 0 && (


          <p className="text-[11px] text-indigo-500 text-center mt-1 font-medium">


            Sending {labChecked.size} lab test{labChecked.size > 1 ? "s" : ""} to Laboratory


          </p>


        )}


        {labChecked.size === 0 && rxDrafts.length > 0 && (


          <p className="text-[11px] text-indigo-500 text-center mt-1 font-medium">


            Sending {rxDrafts.length} prescription{rxDrafts.length > 1 ? "s" : ""} to Pharmacy


          </p>


        )}


      </div>





      {/* â”€â”€ Referral Department Picker Modal â”€â”€ */}


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


            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">


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





	      {/* â”€â”€ Share Results Modal â”€â”€ */}


	      {showShareModal && (


	        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowShareModal(false)}>


	          <div


	            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col"


	            onClick={(e) => e.stopPropagation()}


	          >


	            {/* Header */}


	            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">


	              <h3 className="text-sm font-bold text-slate-700">Share Results â€” {patient.lastName}, {patient.firstName}</h3>


	              <button


	                onClick={() => setShowShareModal(false)}


	                className="text-slate-400 hover:text-slate-600 p-1"


	              >


	                <X size={16} />


	              </button>


	            </div>





	            {/* Body */}


	            <div className="p-6 overflow-y-auto flex-1 space-y-5">


	              {/* Clinical Summary */}


	              <div>


	                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Summary</h4>


	                <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">


	                  {diagnosis && (


	                    <div className="px-4 py-3">


	                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Diagnosis</span>


	                      <p className="text-sm text-slate-700 mt-0.5">{diagnosis}</p>


	                    </div>


	                  )}


	                  {treatmentPlan && (


	                    <div className="px-4 py-3">


	                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Treatment Plan</span>


	                      <p className="text-sm text-slate-700 mt-0.5">{treatmentPlan}</p>


	                    </div>


	                  )}


	                  {Array.from(labChecked).length > 0 && (


	                    <div className="px-4 py-3">


	                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lab Tests Ordered</span>


	                      <div className="flex flex-wrap gap-1.5 mt-1.5">


	                        {Array.from(labChecked).map((t) => (


	                          <span key={t} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">


	                            {t}


	                          </span>


	                        ))}


	                      </div>


	                    </div>


	                  )}


	                </div>


	              </div>





	              {/* Recipient Cards */}


	              <div>


	                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Send To</h4>


	                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">


	                  {([


	                    { value: "RECEPTION", label: "Receptionist", description: "For billing & checkout", icon: Receipt },


	                    { value: "NURSE", label: "Nurse / Midwife", description: "For treatment / monitoring", icon: Activity },


	                    { value: "SONOGRAPHY", label: "Sonographer", description: "For imaging follow-up", icon: Waves },


	                  ] as const).map((target) => {


	                    const isSelected = selectedShareTargets.includes(target.value);


	                    return (


	                      <button


	                        key={target.value}


	                        onClick={() => {


	                          setSelectedShareTargets((prev) =>


	                            prev.includes(target.value)


	                              ? prev.filter((v) => v !== target.value)


	                              : [...prev, target.value]


	                          );


	                        }}


	                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left min-h-[60px] ${


	                          isSelected


	                            ? "border-purple-400 bg-purple-50"


	                            : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"


	                        }`}


	                      >


	                        <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"}`}>


	                          <target.icon size={18} />


	                        </div>


	                        <div className="min-w-0 flex-1">


	                          <div className="flex items-center gap-2">


	                            <p className="text-sm font-semibold text-slate-700">{target.label}</p>


	                            {isSelected && <CheckCircle size={14} className="text-purple-600 flex-shrink-0" />}


	                          </div>


	                          <p className="text-[10px] text-slate-400 mt-0.5">{target.description}</p>


	                        </div>


	                      </button>


	                    );


	                  })}


	                </div>


	              </div>


	            </div>





	            {/* Footer Actions */}


	            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">


	              <button


	                onClick={handlePrintWithLabs}


	                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"


	              >


	                <Printer size={15} /> Print Full Record


	              </button>


	              <div className="flex-1" />


	              <button


	                onClick={() => setShowShareModal(false)}


	                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"


	              >


	                Cancel


	              </button>


	              <button


	                onClick={handleShareResults}


	                disabled={isBusy || selectedShareTargets.length === 0}


	                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${


	                  isBusy && savingAction === "SHARE"


	                    ? "bg-purple-100 text-purple-700"


	                    : "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"


	                }`}


	              >


	                {isBusy && savingAction === "SHARE" ? (


	                  <><Loader2 size={16} className="animate-spin" /> Sharing...</>


	                ) : (


	                  <><Share2 size={15} /> Share Results</>


	                )}


	              </button>


	            </div>


	          </div>


	        </div>


	      )}


	      </>


      )}


    </div>


  );


}





// â”€â”€â”€ Appointments View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





function AppointmentsView({
  onBack,
  onSelectPatient,
}: {
  onBack: () => void;
  onSelectPatient?: (patient: DashboardPatient) => void;
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


              <li key={a.id} onClick={() => {
                  console.log("[AppointmentsView] clicked appointment:", a.id, "onSelectPatient:", !!onSelectPatient, "Patient:", !!a.Patient);
                  if (!onSelectPatient || !a.Patient) return;
                  onSelectPatient({
                    id: a.Patient.id,
                    patientNumber: a.Patient.patientNumber ?? "",
                    firstName: a.Patient.firstName ?? "",
                    lastName: a.Patient.lastName ?? "",
                    gender: a.Patient.gender ?? "OTHER",
                    age: a.Patient.age ?? 0,
                    phoneNumber: a.Patient.phoneNumber ?? null,
                    isEmergency: false,
                    currentStatus: "AWAITING_DOCTOR",
                    lastSharedFromDept: null,
                    updatedAt: new Date().toISOString(),
                    waitingMinutes: 0,
                    waitingDisplay: "Appointment",
                    chiefComplaint: a.reason || "",
                    esiLevel: null,
                    triageCompletedAt: null,
                    source: "Appointment",
                    pendingLabs: 0,
                    pendingImaging: 0,
                    hasAppointment: true,
                    appointmentTime: a.appointmentDate,
                  });
                }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
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
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    {a.Patient?.patientNumber}
                    {a.Patient?.phoneNumber && <><span className="text-slate-300">Â·</span> {a.Patient.phoneNumber}</>}
                  </div>
                  {/* Appointment time â€” prominent */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm font-bold text-[#00703C] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                    <Clock size={14} />
                    <span>{new Date(a.appointmentDate).toLocaleTimeString("en-UG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</span>
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      â€” {new Date(a.appointmentDate).toLocaleDateString("en-UG", {
                        weekday: "short", day: "numeric", month: "short"
                      })}
                    </span>
                  </div>
                  {a.reason && <div className="text-xs text-slate-600 mt-1.5 font-medium">{a.reason}</div>}
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





// â”€â”€â”€ Admitted Patients View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





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


  inTreatmentRoom?: boolean;


  admittedAt: string;


  lengthOfStay: string;


  diagnosis: string;


  assessment: string;


  treatmentPlan: string;


  chiefComplaint: string;


}





function AdmittedPatientsView({ onBack, staffId, staffName }: { onBack: () => void; staffId: number; staffName: string }) {


  const [patients, setPatients] = useState<AdmittedPatient[]>([]);


  const [loading, setLoading] = useState(true);


  const [loadError, setLoadError] = useState<string | null>(null);


  const [search, setSearch] = useState("");


  const [selectedPatient, setSelectedPatient] = useState<AdmittedPatient | null>(null);


  const [discharging, setDischarging] = useState(false);


  const [showSuccess, setShowSuccess] = useState(false);


  const [dischargedPatientName, setDischargedPatientName] = useState("");


  const [followUpNotes, setFollowUpNotes] = useState("");


  const [updatedTreatmentPlan, setUpdatedTreatmentPlan] = useState("");





  // Review system state


  const [reviews, setReviews] = useState<any[]>([]);


  const [patientLabRequests, setPatientLabRequests] = useState<any[]>([]);


  const [patientImagingRequests, setPatientImagingRequests] = useState<any[]>([]);


  const [reviewsLoading, setReviewsLoading] = useState(false);


  const [showReviewForm, setShowReviewForm] = useState(false);


  const [reviewForm, setReviewForm] = useState({


    followUpNotes: "",


    examinationFindings: "",


    diagnosis: "",


    treatmentPlan: "",


    labOrders: [] as string[],


    imagingOrders: [] as string[],


  });

  const [expandedLabCategories, setExpandedLabCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setExpandedLabCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleLabOrder = (test: string) => {
    setReviewForm((prev) => ({
      ...prev,
      labOrders: prev.labOrders.includes(test)
        ? prev.labOrders.filter((x) => x !== test)
        : [...prev.labOrders, test],
    }));
  };


  const [savingReview, setSavingReview] = useState(false);


  const [sendingToNurse, setSendingToNurse] = useState(false);





  const priorDoctors = useMemo(() => {


    const docs: { doctorName: string; createdAt: string }[] = (reviews ?? []).map((r: any) => ({


      doctorName: r.doctorName || "Unknown",


      createdAt: r.createdAt || "",


    }));


    const seen = new Map<string, string>();


    for (const d of docs) {


      if (!seen.has(d.doctorName) || d.createdAt < seen.get(d.doctorName)!) {


        seen.set(d.doctorName, d.createdAt);


      }


    }


    return Array.from(seen.entries())


      .map(([doctorName, createdAt]) => ({ doctorName, createdAt }))


      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));


  }, [reviews]);





  const handleSendToNurse = async () => {


    if (!selectedPatient) return;


    setSendingToNurse(true);


    try {


      const res = await fetch("/api/doctor/reviews", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          patientId: selectedPatient.id,


          doctorId: staffId,


          doctorName: staffName,


          followUpNotes: followUpNotes || updatedTreatmentPlan,


          treatmentPlan: updatedTreatmentPlan,


          examinationFindings: `Patient sent to Nurse/Midwife for monitoring.`,


          notifyDepartment: "NURSE",


        }),


      });


      if (!res.ok) throw new Error("Failed");


      alert(`âœ“ ${selectedPatient.firstName} ${selectedPatient.lastName} sent to Nurse/Midwife for monitoring`);


    } catch { alert("Failed to send to nurse."); }


    finally { setSendingToNurse(false); }


  };





  const fetchAdmitted = useCallback(async () => {


    try {


      setLoading(true);


      const res = await fetch("/api/doctor/admitted");


      if (!res.ok) {


        const errBody = await res.json().catch(() => ({}));


        const detail = errBody.detail ? ` â€” ${errBody.detail}` : "";


        throw new Error(`${errBody.error || `Server error (${res.status})`}${detail}`);


      }


      const data = await res.json();


      setPatients(data.patients ?? []);


      setLoadError(null);


    } catch (err: any) {


      console.error("[AdmittedPatientsView] fetch error:", err.message);


      // Don't clear patients on error â€” keep showing what we already have


      if (patients.length === 0) setLoadError(err.message);


    } finally {


      setLoading(false);


    }


  }, []);





  useEffect(() => {


    fetchAdmitted();


    const i = setInterval(fetchAdmitted, 30_000);


    return () => clearInterval(i);


  }, [fetchAdmitted]);





  // Initialize treatment plan when a patient is selected


  useEffect(() => {


    if (selectedPatient) {


      setUpdatedTreatmentPlan(selectedPatient.treatmentPlan || "");


      fetchReviews(selectedPatient.id);


    }


  }, [selectedPatient]);





  const fetchReviews = async (patientId: number) => {


    setReviewsLoading(true);


    try {


      const res = await fetch(`/api/doctor/reviews?patientId=${patientId}`);


      if (res.ok) {


        const d = await res.json();


        setReviews(d.reviews ?? []);


        setPatientLabRequests(d.labRequests ?? []);


        setPatientImagingRequests(d.imagingRequests ?? []);


      }


    } catch {} finally { setReviewsLoading(false); }


  };





  const handleAddReview = async () => {


    if (!selectedPatient) return;


    setSavingReview(true);


    try {


      const res = await fetch("/api/doctor/reviews", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          patientId: selectedPatient.id,


          doctorId: staffId,


          doctorName: staffName,


          followUpNotes: reviewForm.followUpNotes,


          examinationFindings: reviewForm.examinationFindings,


          diagnosis: reviewForm.diagnosis,


          treatmentPlan: reviewForm.treatmentPlan,


          labOrders: reviewForm.labOrders,


          imagingOrders: reviewForm.imagingOrders,


        }),


      });


      if (res.ok) {


        setReviewForm({ followUpNotes: "", examinationFindings: "", diagnosis: "", treatmentPlan: "", labOrders: [], imagingOrders: [] });


        setShowReviewForm(false);


        fetchReviews(selectedPatient.id);


      } else { alert("Failed to save review."); }


    } catch { alert("Network error saving review."); }


    finally { setSavingReview(false); }


  };





  const handleDischarge = async () => {


    if (!selectedPatient) return;


    setDischarging(true);


    try {


      // Save follow-up notes and discharge the patient to cashier for billing


      const res = await fetch("/api/doctor", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({


          patientId: selectedPatient.id,


          staffId,


          staffName,


          treatmentPlan: updatedTreatmentPlan,


          notes: followUpNotes || selectedPatient.chiefComplaint,


          routeTo: "DISCHARGE",


        }),


      });


      if (!res.ok) throw new Error("Discharge failed");


      setDischargedPatientName(`${selectedPatient.lastName}, ${selectedPatient.firstName}`);


      setShowSuccess(true);


      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));


      setTimeout(() => {


        setShowSuccess(false);


        setSelectedPatient(null);


        setFollowUpNotes("");


      }, 3000);


    } catch (err) {


      alert("Failed to discharge patient. Please try again.");


    } finally {


      setDischarging(false);


    }


  };





  const buildDischargeHtml = (): string => {


    const p = selectedPatient!;


    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });


    const admitDate = new Date(p.admittedAt).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });





    return `<!DOCTYPE html>


<html>


<head>


  <title>Main Street Medical Center - Discharge Form</title>


  <style>


    @page { size: A4; margin: 15mm; }


    * { margin: 0; padding: 0; box-sizing: border-box; }


    body {


      font-family: Arial, sans-serif;


      font-size: 13px;


      color: #222;


      line-height: 1.5;


      padding: 0;


      position: relative;


      min-height: 100vh;


    }


    body::before {


      content: '';


      position: fixed;


      inset: 0;


      background-image: url('/Images/LOGO.jpg');


      background-size: 55%;


      background-repeat: no-repeat;


      background-position: center;


      opacity: 0.07;


      pointer-events: none;


      z-index: -1;


      print-color-adjust: exact;


      -webkit-print-color-adjust: exact;


    }


    .container { width: 100%; margin: 0 auto; }


    .header {


      text-align: center;


      border-bottom: 2px solid #0a2e1a;


      padding-bottom: 14px;


      margin-bottom: 22px;


    }


    .header h1 { font-size: 22px; color: #0a2e1a; font-weight: bold; letter-spacing: 1px; }


    .header p { font-size: 12px; color: #555; margin-top: 2px; }


    h2.section-title {


      font-size: 14px;


      color: #0a2e1a;


      font-weight: bold;


      text-transform: uppercase;


      letter-spacing: 1px;


      border-bottom: 1px solid #ccc;


      padding-bottom: 4px;


      margin: 18px 0 10px 0;


    }


    table.info { width: 100%; border-collapse: collapse; margin-bottom: 6px; }


    table.info td { padding: 3px 6px; vertical-align: top; font-size: 13px; }


    table.info td.label { font-weight: bold; color: #0a2e1a; width: 160px; }


    table.info td.sep { width: 20px; color: #aaa; }


    table.info td.bottom-border { border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }


    .field-group { margin-bottom: 12px; }


    .field-group .field-label { font-weight: bold; color: #0a2e1a; font-size: 12px; margin-bottom: 2px; }


    .field-group .field-value { font-size: 13px; color: #333; white-space: pre-wrap; }


    .checkbox-grid { display: flex; flex-wrap: wrap; gap: 16px; margin: 6px 0 8px 0; }


    .checkbox-item { font-size: 13px; display: flex; align-items: center; gap: 4px; }


    .checkbox-item input[type=checkbox] { width: 14px; height: 14px; accent-color: #0a2e1a; }


    .sig-line {


      border-bottom: 1px solid #000;


      display: inline-block;


      min-width: 220px;


      padding: 3px 8px;


      font-size: 18px;


      font-family: 'Brush Script MT', 'Segoe Script', cursive, sans-serif;


    }


    .sig-row { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 14px; border-top: 1px solid #ccc; }


    .sig-block { flex: 1; }


    .sig-block p { font-size: 12px; font-weight: bold; color: #0a2e1a; margin-bottom: 2px; }


    .footer-note { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }


  </style>


</head>


<body>


  <div class="container">


    <!-- Header -->


    <div class="header">


      <h1>MAIN STREET MEDICAL CENTER</h1>


      <p>0740944150 / 0785586979</p>


      <p style="font-size:11px;color:#666">Emergency Ambulance: 0394533750 â€” Open 7 days a week 24HRS</p>


    </div>





    <h2 class="section-title" style="margin-top:4px">Discharge Summary</h2>





    <!-- Patient Information -->


    <table class="info">


      <tr><td class="label">Patient Name:</td><td class="bottom-border" colspan="3"><strong>${p.lastName}, ${p.firstName}</strong></td></tr>


      <tr><td class="label">Age / Sex:</td><td class="bottom-border">${p.age} yrs / ${p.gender === "MALE" ? "Male" : "Female"}</td><td class="label" style="width:120px">Patient ID:</td><td class="bottom-border">${p.patientNumber}</td></tr>


      <tr><td class="label">Contact:</td><td class="bottom-border">${p.phoneNumber || "N/A"}</td><td class="label">Address:</td><td class="bottom-border">${(p as any).address || "N/A"}</td></tr>


      <tr><td class="label">Date of Admission:</td><td class="bottom-border">${admitDate}</td><td class="label">Date of Discharge:</td><td class="bottom-border">${today}</td></tr>


    </table>





    <!-- Admission Details -->


    <h2 class="section-title">Admission Details</h2>


    <div class="field-group">


      <div class="field-label">Reason for Admission / Chief Complaint</div>


      <div class="field-value">${p.chiefComplaint || "Not recorded"}</div>


    </div>


    <div class="field-group">


      <div class="field-label">Clinical Summary</div>


      <div class="field-value">${p.assessment || followUpNotes || "Not documented"}</div>


    </div>





    <!-- Examination Findings -->


    <h2 class="section-title">Examination Findings Summary</h2>


    <div class="field-group">


      <div class="field-label">At Admission</div>


      <div class="field-value">${(p as any).examinationAtAdmission || "See clinical notes"}</div>


    </div>


    <div class="field-group">


      <div class="field-label">At Discharge Vitals</div>


      <div class="field-value">${(p as any).dischargeVitals || "See clinical notes"}</div>


    </div>





    <!-- Investigations Done -->


    <h2 class="section-title">Investigations Done</h2>


    <div class="field-value">${(p as any).investigations || "See lab records"}</div>





    <!-- Diagnosis -->


    <h2 class="section-title">Diagnosis</h2>


    <div class="field-value">${p.diagnosis || "Not specified"}</div>





    <!-- Summary of Treatment -->


    <h2 class="section-title">Summary of Treatment Given During Admission</h2>


    <div class="field-value">${p.treatmentPlan || "Not documented"}</div>





    <!-- Condition at Discharge -->


    <h2 class="section-title">Condition at Discharge</h2>


    <div class="checkbox-grid">


      <div class="checkbox-item"><input type="checkbox" /> Stable</div>


      <div class="checkbox-item"><input type="checkbox" /> Improved</div>


      <div class="checkbox-item"><input type="checkbox" /> Referred / Transferred</div>


      <div class="checkbox-item"><input type="checkbox" /> Other (specify): ___________</div>


    </div>





    <!-- Discharge Medication -->


    <h2 class="section-title">Discharge Medication and Instructions</h2>


    <div class="field-value">${followUpNotes || "See prescription records"}</div>





    <!-- Follow-Up -->


    <h2 class="section-title">Follow-Up and Review Plan</h2>


    <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:4px">


      <span>Review in:</span>


      <span style="border-bottom:1px solid #000;display:inline-block;min-width:80px">&nbsp;</span>


      <span>days / weeks / months</span>


    </div>


    <div style="margin-top:8px">


      <div class="field-label">Specific Instructions:</div>


      <div style="border-bottom:1px solid #e0e0e0;min-height:40px;padding:4px 0">&nbsp;</div>


    </div>





	    <!-- Signatures -->
	    <div class="sig-row">
	      <div class="sig-block">
	        <p>Next of Kin Name:</p>
	        <div style="border-bottom:1px solid #000;min-width:200px;padding:3px 8px;font-size:16px">&nbsp;</div>
	        <div style="font-size:11px;color:#666;margin-top:2px">Signature / Relation</div>
	      </div>
	    </div>
	    ${buildSignatureHtml(priorDoctors, staffName, "", today)}



    <div class="footer-note">This is a computer-generated discharge summary from Main Street Medical Center EMR</div>


  </div>


  <script>window.onload = function() { window.print(); window.close(); };<\/script>


</body>


</html>`;


  };





  const handlePrintDischarge = () => {


    const html = buildDischargeHtml();


    const printWin = window.open("", "_blank", "width=800,height=600");


    if (!printWin) { alert("Please allow pop-ups to print."); return; }


    printWin.document.write(html);


    printWin.document.close();


  };





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





  // â”€â”€ Detail / Encounter View â”€â”€


  if (selectedPatient) {


    const p = selectedPatient;


    return (


      <div>


        <button


          onClick={() => { setSelectedPatient(null); setFollowUpNotes(""); }}


          className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"


        >


          <ArrowLeft size={15} /> Back to Admitted Patients


        </button>





        {/* Patient Banner */}


        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-6">


          <div className="flex items-start justify-between gap-3">


            <div className="flex items-center gap-3 sm:gap-4 min-w-0">


              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold flex-shrink-0 ${


                p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"


              }`}>


                {p.firstName[0]}{p.lastName[0]}


              </div>


              <div className="min-w-0">


                <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{p.lastName}, {p.firstName}</h2>


                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 mt-1">


                  <span className="font-mono text-[11px] text-[#0a2e1a]/60">{p.patientNumber}</span>


                  <span className="text-slate-300">|</span>


                  <span>{p.gender === "MALE" ? "Male" : "Female"}</span>


                  <span className="text-slate-300">|</span>


                  <span>{p.age} years</span>


                  {p.phoneNumber && (


                    <><span className="text-slate-300">|</span><span className="truncate">{p.phoneNumber}</span></>


                  )}


                </div>


              </div>


            </div>


            <div className="text-right flex-shrink-0">


              <div className="bg-teal-100 text-teal-700 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">


                {p.lengthOfStay}


              </div>


              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 whitespace-nowrap">


                {new Date(p.admittedAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}


              </div>


            </div>


          </div>


        </div>





        {/* Detail Cards */}


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">


          <div className="bg-white rounded-xl border border-slate-100 p-4">


            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnosis</p>


            <p className="text-sm text-slate-700">{p.diagnosis || "Not yet diagnosed"}</p>


          </div>


          <div className="bg-white rounded-xl border border-slate-100 p-4">


            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chief Complaint</p>


            <p className="text-sm text-slate-700">{p.chiefComplaint || "Not recorded"}</p>


          </div>


        </div>





        {/* Review Timeline */}


        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">


          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">


            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Review History</h3>


            <button


              onClick={() => setShowReviewForm(!showReviewForm)}


              className="text-[10px] font-bold bg-[#0a2e1a] text-white px-3 py-1.5 rounded-lg hover:bg-[#0d3d24] transition-colors flex items-center gap-1"


            >


              <Plus size={12} /> {showReviewForm ? "Cancel" : "Add Review"}


            </button>


          </div>





          {/* Add Review Form */}


          {showReviewForm && (


            <div className="p-4 border-b border-slate-100 bg-slate-50/50">


              <div className="space-y-3">


                <div>


                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Follow-up Notes</label>


                  <textarea className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px]" placeholder="Follow-up observations, progress notes..." value={reviewForm.followUpNotes} onChange={(e) => setReviewForm({...reviewForm, followUpNotes: e.target.value})} />


                </div>


                <div>


                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Examination Findings</label>


                  <textarea className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[60px]" placeholder="Physical exam findings from this review..." value={reviewForm.examinationFindings} onChange={(e) => setReviewForm({...reviewForm, examinationFindings: e.target.value})} />


                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  <div>


                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Diagnosis</label>


                    <textarea className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[50px]" placeholder="Updated diagnosis..." value={reviewForm.diagnosis} onChange={(e) => setReviewForm({...reviewForm, diagnosis: e.target.value})} />


                  </div>


                  <div>


                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Treatment Plan</label>


                    <textarea className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2e1a] min-h-[50px]" placeholder="Updated treatment plan..." value={reviewForm.treatmentPlan} onChange={(e) => setReviewForm({...reviewForm, treatmentPlan: e.target.value})} />


                  </div>


                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  <div>

                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lab Orders</label>

                    <div className="flex flex-wrap gap-3 mb-1.5">
                      <div>
                        <button type="button" onClick={() => toggleCategory("Serology")} className={`text-[10px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors inline-flex items-center gap-1 ${expandedLabCategories.has("Serology") ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                          Serology <span className={`text-[8px] transition-transform ${expandedLabCategories.has("Serology") ? "rotate-180 inline-block" : "inline-block"}`}>▼</span>
                        </button>
                        {expandedLabCategories.has("Serology") && (
                          <div className="flex flex-wrap gap-1 mt-1.5 ml-2">
                            {["Brucella Ag", "MROT", "H. pylori antigen (stool)", "HCG (urine)", "Typhoid (IgG & IgM)", "TPHA", "HIV", "Hep B"].map((t) => (
                              <label key={t} className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${reviewForm.labOrders.includes(t) ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                                <input type="checkbox" className="hidden" checked={reviewForm.labOrders.includes(t)} onChange={() => toggleLabOrder(t)} />
                                {t}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <button type="button" onClick={() => toggleCategory("TFTs")} className={`text-[10px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors inline-flex items-center gap-1 ${expandedLabCategories.has("TFTs") ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                          TFTs <span className={`text-[8px] transition-transform ${expandedLabCategories.has("TFTs") ? "rotate-180 inline-block" : "inline-block"}`}>▼</span>
                        </button>
                        {expandedLabCategories.has("TFTs") && (
                          <div className="flex flex-wrap gap-1 mt-1.5 ml-2">
                            {["TSH", "T3", "T4"].map((t) => (
                              <label key={t} className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${reviewForm.labOrders.includes(t) ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                                <input type="checkbox" className="hidden" checked={reviewForm.labOrders.includes(t)} onChange={() => toggleLabOrder(t)} />
                                {t}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {["Urinalysis", "CBC", "Stool analysis", "Blood group", "FBS", "RBS", "B/S (Blood smear)", "Culture & Sensitivity", "Coagulation Profile", "PT & INR", "ESR", "APPT", "LFTs", "RFTs", "Lipid Profile", "Electrolytes", "CRP", "HbA1c", "PSA", "Free T4", "MAC", "LGL"].map((t) => (
                        <label key={t} className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${reviewForm.labOrders.includes(t) ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                          <input type="checkbox" className="hidden" checked={reviewForm.labOrders.includes(t)} onChange={() => toggleLabOrder(t)} />
                          {t}
                        </label>
                      ))}
                    </div>


                  </div>


                  <div>


                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Imaging Orders</label>


                    <div className="flex flex-wrap gap-1.5">


                      {["X-Ray", "Ultrasound", "CT Scan", "MRI", "Mammography"].map((t) => (


                        <label key={t} className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${reviewForm.imagingOrders.includes(t) ? "bg-[#0a2e1a] text-white border-[#0a2e1a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>


                          <input type="checkbox" className="hidden" checked={reviewForm.imagingOrders.includes(t)} onChange={() => setReviewForm({...reviewForm, imagingOrders: reviewForm.imagingOrders.includes(t) ? reviewForm.imagingOrders.filter(x => x !== t) : [...reviewForm.imagingOrders, t] })} />


                          {t}


                        </label>


                      ))}


                    </div>


                  </div>


                </div>


                <button


                  onClick={handleAddReview}


                  disabled={savingReview}


                  className="w-full bg-[#0a2e1a] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#0d3d24] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"


                >


                  {savingReview ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle size={14} /> Save Review</>}


                </button>


              </div>


            </div>


          )}





          {/* Reviews List */}


          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">


            {reviews.length === 0 && !reviewsLoading ? (


              <div className="py-8 text-center text-sm text-slate-400">No reviews yet. Click "Add Review" to document a follow-up.</div>


            ) : reviewsLoading ? (


              <div className="py-8 text-center text-sm text-slate-400"><Loader2 size={14} className="animate-spin inline mr-1" /> Loading reviews...</div>


            ) : (


              reviews.map((r: any) => (


                <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">


                  <div className="flex items-center justify-between mb-2">


                    <div className="flex items-center gap-2">


                      <div className="w-6 h-6 rounded-full bg-[#0a2e1a]/10 flex items-center justify-center text-[9px] font-bold text-[#0a2e1a]">


                        {r.doctorName?.[0] || "D"}


                      </div>


                      <span className="text-xs font-semibold text-slate-700">{r.doctorName}</span>


                      <span className="text-[10px] text-slate-400">Â·</span>


                      <span className="text-[10px] text-slate-400">


                        {new Date(r.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}


                      </span>


                    </div>


                    <span className="text-[9px] text-slate-300 font-mono">#{r.id}</span>


                  </div>


                  {r.followUpNotes && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Notes:</span><span className="text-sm text-slate-600">{r.followUpNotes}</span></div>}


                  {r.examinationFindings && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Exam:</span><span className="text-sm text-slate-600">{r.examinationFindings}</span></div>}


                  {r.diagnosis && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Dx:</span><span className="text-sm text-slate-700 font-medium">{r.diagnosis}</span></div>}


                  {r.treatmentPlan && <div className="mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Plan:</span><span className="text-sm text-slate-600">{r.treatmentPlan}</span></div>}


                  {r.labOrders && (() => { try { return JSON.parse(r.labOrders); } catch { return []; } })().length > 0 && (


                    <div className="flex flex-wrap gap-1 mt-1">


                      {JSON.parse(r.labOrders).map((l: string, i: number) => <span key={i} className="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{l}</span>)}


                    </div>


                  )}


                  {r.imagingOrders && (() => { try { return JSON.parse(r.imagingOrders); } catch { return []; } })().length > 0 && (


                    <div className="flex flex-wrap gap-1 mt-1">


                      {JSON.parse(r.imagingOrders).map((img: string, i: number) => <span key={i} className="text-[9px] bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full">{img}</span>)}


                    </div>


                  )}


                </div>


              ))


            )}


          </div>


        </div>





        {/* Lab & Imaging Orders Status */}


        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">


          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">


            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Orders & Results</h3>


          </div>


          <div className="divide-y divide-slate-50">


            {patientLabRequests.length === 0 && patientImagingRequests.length === 0 ? (


              <div className="py-6 text-center text-sm text-slate-400">No lab or imaging orders yet</div>


            ) : (


              <>


                {patientLabRequests.map((lr: any) => (


                  <div key={`lab-${lr.id}`} className="px-5 py-3 flex items-center gap-3">


                    <Microscope size={14} className="text-purple-500 flex-shrink-0" />


                    <div className="flex-1 min-w-0">


                      <p className="text-sm font-medium text-slate-700">{lr.testName}</p>


                      <p className="text-[10px] text-slate-400">{new Date(lr.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</p>


                    </div>


                    {lr.status === "COMPLETED" ? (


                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">


                        <CheckCircle size={9} /> Results Ready


                      </span>


                    ) : lr.status === "PENDING" ? (


                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending</span>


                    ) : (


                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{lr.status}</span>


                    )}


                  </div>


                ))}


                {patientImagingRequests.map((ir: any) => (


                  <div key={`img-${ir.id}`} className="px-5 py-3 flex items-center gap-3">


                    <Radio size={14} className="text-cyan-500 flex-shrink-0" />


                    <div className="flex-1 min-w-0">


                      <p className="text-sm font-medium text-slate-700">{ir.studyType}</p>


                      <p className="text-[10px] text-slate-400">{new Date(ir.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</p>


                    </div>


                    {ir.status === "REPORTED" ? (


                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">


                        <CheckCircle size={9} /> Report Ready


                      </span>


                    ) : ir.status === "ORDERED" ? (


                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Ordered</span>


                    ) : (


                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{ir.status}</span>


                    )}


                  </div>


                ))}


              </>


            )}


          </div>


        </div>





        {/* Follow-up / Discharge Notes */}


        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">


          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">


            Discharge Summary Notes


          </label>


          <textarea


            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0a2e1a] focus:ring-1 focus:ring-[#0a2e1a]/20 min-h-[100px]"


            placeholder="Document final discharge summary, instructions, and follow-up plan..."


            value={followUpNotes}


            onChange={(e) => setFollowUpNotes(e.target.value)}


          />


        </div>





        {/* Action Buttons Grid */}


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">


          <button


            onClick={handleSendToNurse}


            disabled={sendingToNurse}


            className="py-2 rounded-xl font-semibold text-xs bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"


          >


            {sendingToNurse ? (


              <><Loader2 size={13} className="animate-spin" /> Sending...</>


            ) : (


              <><Activity size={13} /> Send to Nurse</>


            )}


          </button>





          <button


            onClick={handlePrintDischarge}


            className="py-2 rounded-xl font-semibold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-all flex items-center justify-center gap-1.5"


          >


            <Printer size={13} /> Print Discharge


          </button>





          <button


            onClick={handleDischarge}


            disabled={discharging}


            className="py-2 rounded-xl font-semibold text-xs bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"


          >


            {discharging ? (


              <><Loader2 size={13} className="animate-spin" /> Processing...</>


            ) : (


              <><LogOut size={13} /> Discharge</>


            )}


          </button>


        </div>





        {/* Success Modal */}


        {showSuccess && (


          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowSuccess(false); setSelectedPatient(null); }}>


            <div


              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center"


              onClick={(e) => e.stopPropagation()}


            >


              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">


                <CheckCircle size={32} className="text-emerald-600" />


              </div>


              <h3 className="text-lg font-bold text-slate-800 mb-2">Patient Discharged</h3>


              <p className="text-sm text-slate-600 mb-1">


                <span className="font-semibold">{dischargedPatientName}</span> has been transferred for billing.


              </p>


              <p className="text-xs text-slate-400">


                The patient will be seen at the cashier desk.


              </p>


            </div>


          </div>


        )}


      </div>


    );


  }





  // â”€â”€ List View â”€â”€


  return (


    <div>


      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">


        <ArrowLeft size={15} /> Back to Dashboard


      </button>





      <div className="flex flex-wrap items-center gap-2 mb-5">


        <div className="relative flex-1 min-w-[200px] max-w-md">


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


      ) : loadError && patients.length === 0 ? (


        <div className="text-center py-20">


          <AlertTriangle size={44} className="mx-auto text-amber-400 mb-4" />


          <p className="text-base font-semibold text-slate-500">Could not load admitted patients</p>


          <p className="text-sm text-slate-400 mt-1 mb-5 max-w-md mx-auto">{loadError}</p>


          <button onClick={fetchAdmitted}


            className="inline-flex items-center gap-2 bg-[#00703C] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#005a2e] transition-colors">


            <RefreshCw size={14} /> Retry


          </button>


        </div>


      ) : filtered.length === 0 ? (


        <div className="text-center py-20">


          <Hospital size={48} className="mx-auto text-slate-200 mb-4" />


          <p className="text-base font-semibold text-slate-400">No admitted patients</p>


          <p className="text-sm text-slate-300 mt-1">Admitted patients will appear here</p>


        </div>


      ) : (<>


        <div className="md:hidden space-y-3">


          {filtered.map((p) => (


            <div


              key={p.id}


              onClick={() => setSelectedPatient(p)}


              className="bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:border-teal-300 transition-colors active:bg-teal-50"


            >


              <div className="flex items-start justify-between mb-2">


                <div className="flex items-center gap-2.5">


                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${


                    p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"


                  }`}>


                    {p.firstName[0]}{p.lastName[0]}


                  </div>


                  <div>


                    <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>


                    <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} Â· {p.age} yrs Â· {p.patientNumber}</p>


                  </div>


                </div>


                <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full flex-shrink-0">


                  {p.lengthOfStay}


                </span>


              </div>


              {p.diagnosis && (


                <div className="mb-1">


                  <span className="text-[10px] font-bold text-slate-400 uppercase">Dx: </span>


                  <span className="text-sm text-slate-700">{p.diagnosis}</span>


                </div>


              )}


              {p.chiefComplaint && (


                <div className="mb-1">


                  <span className="text-[10px] font-bold text-slate-400 uppercase">CC: </span>


                  <span className="text-sm text-slate-600 line-clamp-2">{p.chiefComplaint}</span>


                </div>


              )}


              {p.treatmentPlan && (


                <div>


                  <span className="text-[10px] font-bold text-slate-400 uppercase">Plan: </span>


                  <span className="text-sm text-slate-600 line-clamp-2">{p.treatmentPlan}</span>


                </div>


              )}


            </div>


          ))}


        </div>





        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">


          <div className="overflow-x-auto">


            <table className="w-full text-sm">


              <thead>


                <tr className="bg-slate-50 border-b border-slate-100">


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient</th>


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">ID</th>


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis</th>


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Chief Complaint</th>


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Stay</th>


                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Treatment Plan</th>


                </tr>


              </thead>


              <tbody className="divide-y divide-slate-50">


                {filtered.map((p) => (


                  <tr


                    key={p.id}


                    onClick={() => setSelectedPatient(p)}


                    className="hover:bg-teal-50 transition-colors cursor-pointer"


                  >


                    <td className="px-4 py-3.5">


                      <div className="flex items-center gap-2.5">


                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${


                          p.isEmergency ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"


                        }`}>


                          {p.firstName[0]}{p.lastName[0]}


                        </div>


                        <div>


                          <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>


                          <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} Â· {p.age} yrs</p>


                        </div>


                      </div>


                    </td>


                    <td className="px-4 py-3.5">


                      <span className="font-mono text-xs text-[#0a2e1a]/60">{p.patientNumber}</span>


                    </td>


                    <td className="px-4 py-3.5 max-w-[200px]">


                      <p className="text-sm text-slate-700 line-clamp-2">{p.diagnosis || "â€”"}</p>


                    </td>


                    <td className="px-4 py-3.5 max-w-[200px]">


                      <p className="text-sm text-slate-600 line-clamp-2">{p.chiefComplaint || "â€”"}</p>


                    </td>


                    <td className="px-4 py-3.5">


                      <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">


                        {p.lengthOfStay}


                      </span>


                    </td>


                    <td className="px-4 py-3.5 max-w-[200px]">


                      <p className="text-sm text-slate-600 line-clamp-2">{p.treatmentPlan || "â€”"}</p>


                    </td>


                  </tr>


                ))}


              </tbody>


            </table>


          </div>


        </div>


      </>)}


    </div>


  );


}





// â”€â”€â”€ Doctor Records View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





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


  treatmentPlan: string;


  assessment: string;


  chiefComplaint: string;


  visitCount: number;


  wasAdmitted: boolean;


  visitHistory: {


    id: number;


    date: string;


    diagnosis: string;


    treatmentPlan: string;


    assessment: string;


    notes: string;


    symptoms: string;


    physicalExamination: string;


  }[];


}





function DoctorRecordsView({ onBack }: { onBack: () => void }) {


  const [records, setRecords] = useState<DoctorRecordPatient[]>([]);


  const [loading, setLoading] = useState(true);


  const [search, setSearch] = useState("");


  const [selectedRecord, setSelectedRecord] = useState<DoctorRecordPatient | null>(null);





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





  const filtered = search


    ? records.filter((p) => {


        const q = search.toLowerCase();


        return (


          p.firstName.toLowerCase().includes(q) ||


          p.lastName.toLowerCase().includes(q) ||


          p.patientNumber.toLowerCase().includes(q)


        );


      })


    : records;





  // â”€â”€ Detail View â”€â”€


  if (selectedRecord) {


    const p = selectedRecord;


    return (


      <div>


        <button


          onClick={() => setSelectedRecord(null)}


          className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700"


        >


          <ArrowLeft size={15} /> Back to All Records


        </button>





        {/* Patient Banner */}


        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-6">


          <div className="flex items-start justify-between gap-3">


            <div className="flex items-center gap-3 sm:gap-4 min-w-0">


              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold bg-[#0a2e1a]/10 text-[#0a2e1a] flex-shrink-0">


                {p.firstName[0]}{p.lastName[0]}


              </div>


              <div className="min-w-0">


                <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{p.lastName}, {p.firstName}</h2>


                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 mt-1">


                  <span className="font-mono text-[11px] text-[#0a2e1a]/60">{p.patientNumber}</span>


                  <span className="text-slate-300">|</span>


                  <span>{p.gender === "MALE" ? "Male" : "Female"}</span>


                  <span className="text-slate-300">|</span>


                  <span>{p.age} years</span>


                  {p.phoneNumber && (<><span className="text-slate-300">|</span><span className="truncate">{p.phoneNumber}</span></>)}


                </div>


              </div>


            </div>


            <div className="flex items-center gap-2 flex-shrink-0">


              {p.wasAdmitted && (


                <span className="text-[9px] sm:text-[10px] font-bold bg-teal-100 text-teal-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">


                  Admitted


                </span>


              )}


              <span className="text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">


                {p.visitCount} visit{p.visitCount !== 1 ? "s" : ""}


              </span>


            </div>


          </div>


        </div>





        {/* Summary Cards */}


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">


          <div className="bg-white rounded-xl border border-slate-100 p-4">


            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chief Complaint</p>


            <p className="text-sm text-slate-700">{p.chiefComplaint || "Not recorded"}</p>


          </div>


          <div className="bg-white rounded-xl border border-slate-100 p-4">


            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Latest Diagnosis</p>


            <p className="text-sm text-slate-700">{p.diagnosis || "Not yet diagnosed"}</p>


          </div>


        </div>





        {/* Treatment Plan */}


        {p.treatmentPlan && (


          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">


            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Latest Treatment Plan</p>


            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.treatmentPlan}</p>


          </div>


        )}





        {/* Visit History */}


        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">


          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">


            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Visit History</h3>


          </div>


          {p.visitHistory.length === 0 ? (


            <div className="py-10 text-center text-sm text-slate-400">No visit records found</div>


          ) : (


            <div className="divide-y divide-slate-50">


              {p.visitHistory.map((v) => (


                <div key={v.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">


                  <div className="flex items-center gap-2 mb-2">


                    <Calendar size={13} className="text-[#0a2e1a]/40" />


                    <span className="text-xs font-semibold text-slate-600">


                      {new Date(v.date).toLocaleDateString("en-UG", {


                        weekday: "short", day: "numeric", month: "short", year: "numeric",


                        hour: "2-digit", minute: "2-digit",


                      })}


                    </span>


                  </div>


                  {v.symptoms && (


                    <div className="mb-1.5">


                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Complaint:</span>


                      <span className="text-sm text-slate-600">{v.symptoms}</span>


                    </div>


                  )}


                  {v.diagnosis && (


                    <div className="mb-1.5">


                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Diagnosis:</span>


                      <span className="text-sm text-slate-700">{v.diagnosis}</span>


                    </div>


                  )}


                  {v.treatmentPlan && (


                    <div className="mb-1.5">


                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Plan:</span>


                      <span className="text-sm text-slate-600">{v.treatmentPlan}</span>


                    </div>


                  )}


                  {v.assessment && (


                    <div className="mb-1.5">


                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Assessment:</span>


                      <span className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-2">{v.assessment}</span>


                    </div>


                  )}


                  {v.notes && (


                    <div>


                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Notes:</span>


                      <span className="text-sm text-slate-500 italic">{v.notes}</span>


                    </div>


                  )}


                </div>


              ))}


            </div>


          )}


        </div>


      </div>


    );


  }





  // â”€â”€ List View â”€â”€


  const statusLabel: Record<string, string> = {


    ADMITTED: "Admitted", DISCHARGED: "Discharged", AWAITING_PHARMACY: "At Pharmacy",


    AWAITING_LAB: "At Lab", AWAITING_RADIOLOGY: "At Radiology", AWAITING_CASHIER: "At Cashier",


    AWAITING_DOCTOR: "Awaiting Doctor", IN_CONSULTATION: "In Consultation",


  };


  const statusColor: Record<string, string> = {


    ADMITTED: "bg-teal-100 text-teal-700", DISCHARGED: "bg-slate-100 text-slate-600",


    AWAITING_PHARMACY: "bg-blue-100 text-blue-600", AWAITING_LAB: "bg-amber-100 text-amber-600",


    AWAITING_RADIOLOGY: "bg-cyan-100 text-cyan-600",


  };





  return (


    <div>


      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">


        <ArrowLeft size={15} /> Back to Dashboard


      </button>





      <div className="flex flex-wrap items-center gap-2 mb-5">


        <div className="relative flex-1 min-w-[200px] max-w-md">


          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />


          <input


            type="text"


            placeholder="Search by name or ID..."


            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0a2e1a]"


            value={search}


            onChange={(e) => setSearch(e.target.value)}


          />


        </div>


        <span className="text-xs text-slate-400">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</span>


        <button


          onClick={fetchRecords}


          className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1.5"


        >


          <Loader2 size={12} className={loading ? "animate-spin" : ""} /> Refresh


        </button>


      </div>





      {loading ? (


        <div className="text-center py-20">


          <Loader2 size={24} className="animate-spin mx-auto text-[#0a2e1a] mb-3" />


          <p className="text-sm font-medium text-slate-400">Loading records...</p>


        </div>


      ) : filtered.length === 0 ? (


        <div className="text-center py-20">


          <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />


          <p className="text-base font-semibold text-slate-400">No records found</p>


          <p className="text-sm text-slate-300 mt-1">Patient records will appear after consultations</p>


        </div>


      ) : (<>


        <div className="md:hidden space-y-3">


          {filtered.map((p) => (


            <div


              key={p.id}


              onClick={() => setSelectedRecord(p)}


              className="bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:border-[#0a2e1a]/30 transition-colors active:bg-slate-50"


            >


              <div className="flex items-start justify-between mb-2">


                <div className="flex items-center gap-2.5">


                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#0a2e1a]/10 text-[#0a2e1a]">


                    {p.firstName[0]}{p.lastName[0]}


                  </div>


                  <div>


                    <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>


                    <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} Â· {p.age} yrs Â· {p.patientNumber}</p>


                  </div>


                </div>


                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${


                  statusColor[p.currentStatus] || "bg-slate-100 text-slate-500"


                }`}>


                  {statusLabel[p.currentStatus] || p.currentStatus}


                </span>


              </div>


              <div className="flex items-center gap-3 text-xs text-slate-500">


                {p.diagnosis && <span className="truncate max-w-[50%]"><span className="font-semibold text-slate-600">Dx:</span> {p.diagnosis}</span>}


                <span className="text-slate-300">Â·</span>


                <span>{new Date(p.lastVisitDate).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>


                <span className="text-slate-300">Â·</span>


                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{p.visitCount}x</span>


              </div>


            </div>


          ))}


        </div>





        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">


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


                {filtered.map((p) => (


                  <tr


                    key={p.id}


                    onClick={() => setSelectedRecord(p)}


                    className="hover:bg-slate-50 transition-colors cursor-pointer"


                  >


                    <td className="px-4 py-3">


                      <div className="flex items-center gap-2.5">


                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#0a2e1a]/10 text-[#0a2e1a]">


                          {p.firstName[0]}{p.lastName[0]}


                        </div>


                        <div>


                          <p className="text-sm font-semibold text-slate-800">{p.lastName}, {p.firstName}</p>


                          <p className="text-[11px] text-slate-400">{p.gender === "MALE" ? "M" : "F"} Â· {p.age} yrs</p>


                        </div>


                      </div>


                    </td>


                    <td className="px-4 py-3">


                      <span className="font-mono text-xs text-[#0a2e1a]/60">{p.patientNumber}</span>


                    </td>


                    <td className="px-4 py-3 max-w-[200px]">


                      <p className="text-sm text-slate-700 line-clamp-2">{p.diagnosis || "â€”"}</p>


                    </td>


                    <td className="px-4 py-3">


                      <span className="text-xs text-slate-500">


                        {new Date(p.lastVisitDate).toLocaleDateString("en-UG", {


                          day: "numeric", month: "short", year: "numeric",


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


                ))}


              </tbody>


            </table>


          </div>


        </div>


      </>)}


    </div>


  );


}





// â”€â”€â”€ Doctor History View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





interface HistoryEntry {


  id: number;


  patientId: number;


  patientName: string;


  patientNumber: string;


  action: string;


  description: string;


  fromDepartment: string | null;


  toDepartment: string | null;


  performedBy: string;


  createdAt: string;


}





function DoctorHistoryView({ onBack }: { onBack: () => void }) {


  const [entries, setEntries] = useState<HistoryEntry[]>([]);


  const [loading, setLoading] = useState(true);





  const fetchHistory = useCallback(async () => {


    try {


      const res = await fetch("/api/doctor/history");


      if (!res.ok) throw new Error();


      const d = await res.json();


      setEntries(d.entries ?? []);


    } catch { setEntries([]); }


    finally { setLoading(false); }


  }, []);





  useEffect(() => { fetchHistory(); }, [fetchHistory]);





  const getIcon = (action: string) => {


    switch (action) {


      case "CONSULTATION_END": return <CheckCircle size={13} className="text-emerald-500" />;


      case "STATUS_CHANGE": return <Activity size={13} className="text-blue-500" />;


      case "TRANSFER": return <ArrowRight size={13} className="text-amber-500" />;


      case "PROCEDURE": return <FileText size={13} className="text-purple-500" />;


      default: return <Clock size={13} className="text-slate-400" />;


    }


  };





  return (


    <div>


      <button onClick={onBack} className="mb-4 text-slate-500 flex items-center gap-1 hover:text-slate-700">


        <ArrowLeft size={15} /> Back to Dashboard


      </button>


      <h2 className="text-lg font-bold text-slate-700 mb-5">Doctor Activity History</h2>





      {loading ? (


        <div className="text-center py-20"><Loader2 size={24} className="animate-spin mx-auto text-[#0a2e1a] mb-3" /><p className="text-sm font-medium text-slate-400">Loading history...</p></div>


      ) : entries.length === 0 ? (


        <div className="text-center py-20"><Clock size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-base font-semibold text-slate-400">No activity recorded yet</p></div>


      ) : (


        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">


          <div className="divide-y divide-slate-50 max-h-[calc(100vh-250px)] overflow-y-auto">


            {entries.map((e) => (


              <div key={e.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3">


                <div className="mt-0.5 flex-shrink-0">{getIcon(e.action)}</div>


                <div className="flex-1 min-w-0">


                  <div className="flex items-center gap-2 flex-wrap">


                    <span className="text-xs font-semibold text-slate-700">{e.performedBy}</span>


                    <span className="text-[10px] text-slate-400">


                      {new Date(e.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}


                    </span>


                  </div>


                  <p className="text-sm text-slate-600 mt-0.5">{e.description}</p>


                  <div className="flex items-center gap-2 mt-1">


                    <span className="text-[10px] font-mono text-[#0a2e1a]/60">{e.patientNumber}</span>


                    <span className="text-[10px] text-slate-400">Â·</span>


                    <span className="text-[10px] text-slate-500 font-medium">{e.patientName}</span>


                    {e.toDepartment && (


                      <>


                        <span className="text-[10px] text-slate-300">â†’</span>


                        <span className="text-[10px] text-slate-500">{e.toDepartment}</span>


                      </>


                    )}


                  </div>


                </div>


              </div>


            ))}


          </div>


        </div>


      )}


    </div>


  );


}





// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





function formatTimestamp(date: string | Date): string {


  const d = new Date(date);


  const now = Date.now();


  const diff = now - d.getTime();





  if (diff < 60000) return "Just now";


  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;


  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;


  return d.toLocaleDateString("en-UG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });


}





// â”€â”€â”€ Main Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€





export default function DoctorsPage() {


  const router = useRouter();


  const [currentUser, setCurrentUser] = useState<{ id: number; fullName: string; staffId: number | null } | null>(null);


  const [dashboard, setDashboard] = useState<DashboardData | null>(null);


  const [activePatient, setActivePatient] = useState<DashboardPatient | null>(null);


  const [activeSection, setActiveSection] = useState<"queue" | "admitted" | "antenatal" | "records" | "history" | "appointments">("queue");


  const [loading, setLoading] = useState(true);


  const [error, setError] = useState<string | null>(null);


  const pollingRef = useRef<NodeJS.Timeout | null>(null);


  const fetchAttemptsRef = useRef(0);


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openedFromNotification, setOpenedFromNotification] = useState(false);





  // Load logged-in user


  useEffect(() => {


    try {


      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");


      if (raw) {


        const u = JSON.parse(raw);


        setCurrentUser({ id: u.id, fullName: u.fullName || "Doctor", staffId: u.staffId || u.id });


        // Heartbeat


        fetch("/api/heartbeat", {


          method: "POST",


          headers: { "Content-Type": "application/json" },


          body: JSON.stringify({ userId: u.id }),


        }).catch(() => {});


      } else {


        router.replace("/login");


      }


    } catch { router.replace("/login"); }


  }, [router]);





  const doctorId = currentUser?.id || 1;


  const doctorName = currentUser?.fullName || "Doctor";


  const doctorStaffId = currentUser?.staffId || doctorId;





  const fetchDashboard = useCallback(async () => {


    if (!currentUser) return;





    // Try cache first for instant loading


    try {


      const cached = localStorage.getItem("doctorDashboardCache");


      if (cached) {


        const parsed = JSON.parse(cached) as DashboardData;


        setDashboard(parsed);


        setLoading(false);


      }


    } catch { /* ignore stale cache */ }





    try {


      setError(null);


      fetchAttemptsRef.current++;


      const res = await fetch(`/api/doctor/dashboard?doctorId=${doctorId}`);


      if (!res.ok) {


        const errBody = await res.json().catch(() => ({}));


        const detail = errBody.detail ? ` â€” ${errBody.detail}` : "";


        throw new Error(`${errBody.error || `Server error (${res.status})`}${detail}`);


      }


      const data = await res.json();


      setDashboard(data);


      fetchAttemptsRef.current = 0; // reset on success


      localStorage.setItem("doctorDashboardCache", JSON.stringify(data));


    } catch (err: unknown) {


      const message = err instanceof Error ? err.message : String(err);


      console.error("[DoctorDashboard] fetch error:", message);


      // Only show error if we have data to preserve, or after several retries


      if (dashboard) {


        setError("Connection issue â€” showing last available data");


      } else if (fetchAttemptsRef.current >= 3) {


        setError(message || "Could not reach server");


      }


    } finally {


      setLoading(false);


    }


  }, [doctorId, currentUser]);





  // Initial fetch


  useEffect(() => {


    fetchDashboard();


  }, [fetchDashboard, currentUser]);





  // Poll every 30 seconds (reduced from 15s to ease database connection pool pressure)


  useEffect(() => {


    pollingRef.current = setInterval(fetchDashboard, 30_000);


    return () => {


      if (pollingRef.current) clearInterval(pollingRef.current);


    };


  }, [fetchDashboard]);





  const metrics = dashboard?.metrics;


  const patients = dashboard?.patients || [];


  const clinicalUpdates = dashboard?.clinicalUpdates || [];





  // â”€â”€ Determine filtered patients for sidebar count â”€â”€


  const waitingCount = metrics?.awaitingDoctor ?? 0;





  const handleSelectPatient = (patient: DashboardPatient) => {
    setActivePatient(patient);
    setOpenedFromNotification(false);
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


      // Patient may not be in queue anymore (e.g. discharged) â€” still load dashboard


      fetchDashboard();


    }


  };





  const handleStartConsultation = async (patient: DashboardPatient) => {


    try {


      await fetch("/api/doctor", {


        method: "PATCH",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({ patientId: patient.id }),


      });


      // Update local state so the card changes instantly


      setDashboard((prev) => {


        if (!prev) return prev;


        return {


          ...prev,


          patients: prev.patients.map((p) =>


            p.id === patient.id ? { ...p, currentStatus: "IN_CONSULTATION" } : p


          ),


          metrics: {


            ...prev.metrics,


            awaitingDoctor: Math.max(0, prev.metrics.awaitingDoctor - 1),


            inConsultation: prev.metrics.inConsultation + 1,


          },


        };


      });


    } catch {


      // If it fails, just refresh the dashboard


      fetchDashboard();


    }


  };





  return (


    <div className="flex min-h-screen bg-slate-50 font-sans">


      <Sidebar
        doctorName={doctorName}
        queueCount={waitingCount}
        admittedCount={metrics?.admittedPatients ?? 0}
        appointmentsCount={metrics?.todayAppointments ?? 0}
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


        onHistory={() => {


          setActivePatient(null);


          setActiveSection("history");


        }}


        onAppointments={() => {


          setActivePatient(null);


          setActiveSection("appointments");


        }}


        onAntenatal={() => {


          setActivePatient(null);


          setActiveSection("antenatal");


        }}


        onLogout={async () => {


          try {


            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");


            if (raw) {


              const u = JSON.parse(raw);


              await fetch("/api/logout", {


                method: "POST",


                headers: { "Content-Type": "application/json" },


                body: JSON.stringify({ userId: u.id, username: u.username }),


              });


            }


          } catch {}


          sessionStorage.removeItem("user");


          localStorage.removeItem("user");


          router.push("/");


        }}


        onNotifClick={async (notif) => {
          if (!notif.patientId) return;
          setActiveSection("queue");
          setOpenedFromNotification(true);
          // Try to find patient in the queue
          const found = patients.find((p: DashboardPatient) => p.id === notif.patientId);
          if (found) {
            handleStartConsultation(found);
          } else {
            // Patient not in queue â€” route them to Doctor first
            try {
              await fetch("/api/receptionist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "ADVANCE_PATIENT_STATUS",
                  payload: { patientId: notif.patientId, nextStatus: "AWAITING_DOCTOR" },
                }),
              });
              // Refresh dashboard to pick up the newly routed patient
              fetchDashboard();
            } catch {}
          }
        }}
        mobileOpen={mobileMenuOpen}


        onMobileClose={() => setMobileMenuOpen(false)}


      />





      <main className="flex-1 md:ml-56 p-4 md:p-6 pt-14 md:pt-6">


        {/* Mobile header */}


        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">


          <button


            onClick={() => setMobileMenuOpen(true)}


            className="p-1.5 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600"


          >


            <Menu size={20} />


          </button>


          <div className="flex items-center gap-2 flex-1 min-w-0">


            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#0a2e1a]/10 flex-shrink-0">


              <Image src="/Images/LOGO.jpg" alt="Logo" fill className="object-cover" />


            </div>


            <div className="min-w-0">


              <div className="text-sm font-semibold text-slate-800 truncate">Main Street Medical Center</div>


              <div className="text-[10px] text-slate-400 truncate">Dr. {doctorName}</div>


            </div>


          </div>


          {clinicalUpdates.length > 0 && (


            <div className="relative">


              <Bell size={18} className="text-slate-400" />


              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">


                {clinicalUpdates.length > 9 ? "9+" : clinicalUpdates.length}


              </span>


            </div>


          )}


        </div>


        {activePatient ? (
          <ConsultationPanel
            patient={activePatient}
            onBack={handleBackToQueue}
            onComplete={handleCompleteConsultation}
            staffId={doctorStaffId}
            staffName={doctorName}
            initialTab={openedFromNotification ? "diagnosis" : undefined}
          />
        ) : activeSection === "history" ? (


          <DoctorHistoryView onBack={() => setActiveSection("queue")} />


        ) : activeSection === "records" ? (


          <DoctorRecordsView onBack={() => setActiveSection("queue")} />


        ) : activeSection === "appointments" ? (


          <AppointmentsView onBack={() => setActiveSection("queue")} onSelectPatient={handleSelectPatient} />


        ) : activeSection === "admitted" ? (


          <AdmittedPatientsView onBack={() => setActiveSection("queue")} staffId={doctorStaffId} staffName={doctorName} />


        ) : activeSection === "antenatal" ? (


          <div className="p-6">


            <button onClick={() => setActiveSection("queue")} className="text-sm text-[#00703C] hover:underline mb-4 flex items-center gap-1">


              <ArrowLeft size={16} /> Back to Queue


            </button>


            <h2 className="text-xl font-bold text-gray-800 mb-2">Antenatal Patients</h2>


            <p className="text-gray-500">Antenatal monitoring and patient management coming soon.</p>


          </div>


        ) : (


          <div className="flex gap-6">


            {/* â”€â”€ Left Column: Metrics + Queue â”€â”€ */}


            <div className="flex-1 min-w-0">


              {/* Welcome Banner */}


              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">


                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">


                  <span className="text-[#0a2e1a]">Mainstreet Medical Center</span>


                </h1>


                <p className="text-sm text-slate-500 mt-0.5">Dr. {doctorName}</p>


              </div>


              {/* Metrics Bar */}


              {metrics && <MetricsBar metrics={metrics} />}





		              {/* Queue count */}


		              <div className="flex items-center justify-between mb-5">


		                <h2 className="text-lg font-bold text-slate-700">Patient Queue</h2>


		                <div className="flex items-center gap-2">
		                  {(() => {
		                    const returningCount = patients.filter(p => isReturningPatient(p.source)).length;
		                    const newCount = patients.length - returningCount;
		                    return (
		                      <>
		                        {returningCount > 0 && (
		                          <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
		                            {returningCount} returning
		                          </span>
		                        )}
		                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
		                          {patients.length} total
		                        </span>
		                      </>
		                    );
		                  })()}
		                </div>



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
                  {(() => {
                    const returning = patients.filter(p => isReturningPatient(p.source));
                    const newPats = patients.filter(p => !isReturningPatient(p.source));
                    return (
                      <>
                        {returning.length > 0 && (
                          <div className="mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 flex items-center gap-1.5">
                              <span>Returning Patients</span>
                              <span className="text-[9px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">{returning.length}</span>
                            </span>
                          </div>
                        )}
                        {returning.map((p) => (
                          <PatientCard
                            key={p.id}
                            patient={p}
                            onSelect={handleSelectPatient}
                            onStartConsultation={handleStartConsultation}
                          />
                        ))}
                        {newPats.length > 0 && (
                          <div className="mb-2 mt-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                              <span>New Patients</span>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{newPats.length}</span>
                            </span>
                          </div>
                        )}
                        {newPats.map((p) => (
                          <PatientCard
                            key={p.id}
                            patient={p}
                            onSelect={handleSelectPatient}
                            onStartConsultation={handleStartConsultation}
                          />
                        ))}
                      </>
                    );
                  })()}
                </div>


              )}


            </div>





            {/* â”€â”€ Right Column: Clinical Updates â”€â”€ */}


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