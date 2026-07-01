"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical, Search, RefreshCw, LogOut, User, Phone,
  ArrowRight, CheckCircle, XCircle, Save, FileText,
  Microscope, TestTube, Droplets, Syringe, Beaker,
  Activity, AlertCircle, Plus, Minus, Trash2,
  Calendar, ClipboardList, Heart, Send,
  Stethoscope, Building2, Timer, Users,
  Bone, ExternalLink, ChevronLeft, ChevronRight,
  FlaskRound, BadgeCheck, Sigma, Menu, X, Home,
  Archive, Ban, MessageSquareText, Eye, Filter,
  Share2, Printer, Paperclip, Upload,
  Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import StaffMessaging from "../components/StaffMessaging";
import {
  getTestDefinition,
  getFlatFields,
  getSectionFieldBounds,
  computeFlag,
  getFlagColor,
  computeInterpretation,
  type TestDefinition,
  type TestFieldConfig,
  type PrintLayoutConfig,
  type ResultEntry,
} from "../lib/lab-config";
import {
  ResultEntryForm,
  generateLabReportHTML,
  type LabAttachment,
} from "../components/lis";

// ─── Colors ──────────────────────────────────────────────────────────────
const BRAND = "#00703C";
const BRAND_LIGHT = "#e8f5e9";
const BRAND_DARK = "#004d2b";

const SPECIMEN_TYPES = ["BLOOD", "URINE", "STOOL", "CSF", "SWAB", "SPUTUM", "TISSUE", "SERUM", "PLASMA", "OTHER"];
const NOTIFICATION_METHODS = ["Phone", "In Person", "Email"];
const PRIORITY_ORDER: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };

// ─── Role → Department mapping for SHARE_RESULT ──────────────────────────
// These targetDept strings match what the dashboards listen for
const SHARE_TARGETS = [
  { role: "DOCTOR", dept: "Doctor", label: "Doctor", icon: Stethoscope, desc: "Send results to Doctor's inbox" },
  { role: "NURSE_MIDWIFE", dept: "Nurse/Midwife", label: "Nurse / Midwife", icon: Heart, desc: "Send results to Nursing dashboard" },
  { role: "RECEPTIONIST", dept: "Reception", label: "Receptionist", icon: Users, desc: "Send results to Reception" },
  { role: "RADIOLOGIST_SONOGRAPHER", dept: "Radiology", label: "Radiologist / Sonographer", icon: Bone, desc: "Send results to Radiology" },
] as const;

const formatDate = (iso: string) => {
  if (!iso) return "\u2014";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

const formatShortDate = (iso: string) => {
  if (!iso) return "\u2014";
  try { return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const timeElapsed = (iso: string) => {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return formatShortDate(iso);
  } catch { return ""; }
};

// ─── Note: generateLabReportHTML moved to app/components/lis/PrintReport.ts ─

// ─── Types ───────────────────────────────────────────────────────────────
interface LabRequestItem {
  id: number; patientId: number; patientNumber: string; firstName: string; lastName: string;
  age: number; gender: string; isEmergency: boolean;
  testName: string; testPanel: string | null;
  priority: string; referralSource: string | null;
  referralNotes: string | null; clinicalNotes: string | null;
  requestedBy: string; requestedDepartment: string;
  specimenType: string | null; specimenId: string | null;
  specimenCollectedAt: string | null; collectedByName: string | null;
  specimenRejected: boolean; rejectionReason: string | null;
  rejectionCategory: string | null; rejectedAt: string | null; rejectedBy: string | null;
  processingStartedAt: string | null; processingStartedBy: string | null;
  results: string | null; resultEnteredAt: string | null;
  enteredByName: string | null; validatedByName: string | null;
  validatedAt: string | null; isCritical: boolean; criticalNote: string | null;
  analyzerType: string | null; analyzerModel: string | null;
  analyzerImportStatus: string | null;
  chainOfCustody: string | null; attachments: string | null;
  status: string; createdAt: string; updatedAt: string;
}

	// ─── Note: LabAttachment type moved to app/components/lis/types.ts ─

// ─── Main Component ──────────────────────────────────────────────────────
export default function LaboratoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [allRequests, setAllRequests] = useState<LabRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar + Navigation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<"queue" | "records" | "completed" | "rejected" | "messages">("queue");

  // Queue view
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<"ALL" | "PENDING" | "URGENT">("PENDING");

  // Lab Records view
  const [recordsFilter, setRecordsFilter] = useState("ALL");
  const [recordsSearch, setRecordsSearch] = useState("");

  // Workflow state
  const [selectedRequest, setSelectedRequest] = useState<LabRequestItem | null>(null);
  const [workflowStep, setWorkflowStep] = useState(0);

  // Step 1: Sample collection
  const [specimenType, setSpecimenType] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [savingSpecimen, setSavingSpecimen] = useState(false);

  // Step 2: Results
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [savingResults, setSavingResults] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);

  // Step 3: Share results — multi-select roles
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [sendingResults, setSendingResults] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Critical notification
  const [critNotifiedPerson, setCritNotifiedPerson] = useState("");
  const [critNotificationMethod, setCritNotificationMethod] = useState("");
  const [savingCritical, setSavingCritical] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<LabAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient history (cross-department)
  const [patientHistoryData, setPatientHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }
    const parsed = JSON.parse(storedUser);
    if (!["LAB_TECHNICIAN", "ADMINISTRATOR"].includes(parsed.role)) { router.push("/"); return; }
    setUser(parsed);
    setIsAuthed(true);
  }, [router]);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/laboratory");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.success) setAllRequests(data.requests);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    fetchRequests();
    const interval = setInterval(fetchRequests, 60_000);
    return () => clearInterval(interval);
  }, [fetchRequests, isAuthed]);

  // ── API helper ────────────────────────────────────────────────────────
  const callLabApi = async (action: string, payload: any) => {
    const res = await fetch("/api/laboratory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
    return res.json();
  };

  // ── Fetch cross-department patient history ──────────────────────────────
  const fetchPatientHistory = useCallback(async (patientId: number) => {
    setHistoryLoading(true);
    setPatientHistoryData(null);
    try {
      const res = await fetch(`/api/patient-history?patientId=${patientId}`);
      const data = await res.json();
      if (data.success) setPatientHistoryData(data.data);
    } catch (err) {
      console.error("Failed to fetch patient history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user?.id, username: user?.username }) }); } catch {}
    localStorage.removeItem("user"); sessionStorage.removeItem("user"); router.push("/");
  };

  // ── Derived data ──────────────────────────────────────────────────────
  const completedRequests = useMemo(() =>
    allRequests.filter(r => r.status === "COMPLETED" && !r.specimenRejected),
  [allRequests]);

  const pendingRequests = useMemo(() =>
    allRequests.filter(r =>
      (r.status === "PENDING" || r.status === "SPECIMEN_COLLECTED" || r.status === "PROCESSING" || r.status === "AWAITING_VALIDATION") &&
      !r.specimenRejected
    ),
  [allRequests]);

  const rejectedRequests = useMemo(() =>
    allRequests.filter(r => r.specimenRejected),
  [allRequests]);

  // ── Queue ─────────────────────────────────────────────────────────────
  const queueItems = useMemo(() => {
    // Main queue: lab tech's active work — pending, collected, processing, awaiting validation
    let items = [...pendingRequests];
    if (viewFilter === "ALL") items = [...pendingRequests, ...completedRequests];
    if (viewFilter === "URGENT") items = items.filter(r => r.priority === "URGENT" || r.priority === "STAT");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.patientNumber?.toLowerCase().includes(q) ||
        r.testName?.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return items;
  }, [completedRequests, pendingRequests, viewFilter, searchQuery]);

  // ── Lab Records ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let items = [...allRequests];
    if (recordsFilter === "COMPLETED") items = items.filter(r => r.status === "COMPLETED");
    else if (recordsFilter === "PENDING") items = items.filter(r => r.status === "PENDING" || r.status === "SPECIMEN_COLLECTED" || r.status === "PROCESSING" || r.status === "AWAITING_VALIDATION");
    else if (recordsFilter === "REJECTED") items = items.filter(r => r.specimenRejected);
    else if (recordsFilter === "CRITICAL") items = items.filter(r => r.isCritical);
    if (recordsSearch) {
      const q = recordsSearch.toLowerCase();
      items = items.filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.patientNumber?.toLowerCase().includes(q) ||
        r.testName?.toLowerCase().includes(q) ||
        r.specimenId?.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [allRequests, recordsFilter, recordsSearch]);

  // ── Open patient workflow ─────────────────────────────────────────────
  const openWorkflow = (req: LabRequestItem) => {
    setSelectedRequest(req);
    setWorkflowStep(1);
    setSpecimenType(req.specimenType || "");
    setCollectorName(req.collectedByName || user?.fullName || "");
    setResultsSaved(false);
    setSentSuccess(false);
    setSelectedDepts([]);
    setCritNotifiedPerson("");
    setCritNotificationMethod("");
    setActiveSection(0);

    // Fetch cross-department patient history
    fetchPatientHistory(req.patientId);

    // Parse existing attachments
    if (req.attachments) {
      try {
        const parsed = JSON.parse(req.attachments);
        if (Array.isArray(parsed)) setAttachments(parsed);
        else setAttachments([]);
      } catch { setAttachments([]); }
    } else {
      setAttachments([]);
    }

    if (req.results) {
      try {
        const parsed = JSON.parse(req.results);
        if (Array.isArray(parsed)) {
          setResults(parsed);
          setResultsSaved(true);
          if (req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED") {
            setWorkflowStep(3);
            return;
          }
          setWorkflowStep(2);
          return;
        }
      } catch {}
    }
    setResults(getDefaultResults(req));
    setActiveSection(0);
  };

  const closeWorkflow = () => {
    setSelectedRequest(null);
    setWorkflowStep(0);
    setResults([]);
    setResultsSaved(false);
    setSentSuccess(false);
    setSpecimenType("");
    setCollectorName("");
    setSelectedDepts([]);
    setCritNotifiedPerson("");
    setCritNotificationMethod("");
    setAttachments([]);
    setActiveSection(0);
  };

  // ── Default Results ───────────────────────────────────────────────────
  const getDefaultResults = (req: LabRequestItem): ResultEntry[] => {
    const def = getTestDefinition(req.testName);
    return def.fields.map(f => ({
      test: f.test, unit: f.unit || "", referenceRange: f.referenceRange || "", result: "", flag: "",
    }));
  };

  // ── Step 1: Save Specimen ─────────────────────────────────────────────
  const handleSaveSpecimen = async () => {
    if (!selectedRequest || !specimenType) return;
    setSavingSpecimen(true);
    try {
      await callLabApi("RECORD_SPECIMEN", {
        id: selectedRequest.id,
        specimenType,
        collectedByName: collectorName || user?.fullName || "Lab Technician",
      });
      await fetchRequests();
      setWorkflowStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSpecimen(false);
    }
  };

  // ── Step 2: Handle result change ──────────────────────────────────────
  const handleResultChange = (index: number, value: string) => {
    setResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], result: value, flag: computeFlag(value, next[index].referenceRange) };
      return next;
    });
  };

  // ── Attachment helpers ──────────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadAttachment = (att: LabAttachment) => {
    const dataUrl = `data:${att.type || "application/octet-stream"};base64,${att.data}`;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRequest) return;
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) { alert("File too large. Maximum size is 10 MB."); return; }
    setIsUploading(true);
    try {
      const data = await fileToBase64(file);
      const attachment: LabAttachment = {
        name: file.name,
        data,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.fullName || "Lab Technician",
      };
      await callLabApi("ATTACH_FILE", { id: selectedRequest.id, attachment });
      setAttachments(prev => [...prev, attachment]);
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveResults = async () => {
    if (!selectedRequest) return;
    setSavingResults(true);
    try {
      const def = getTestDefinition(selectedRequest.testName);
      const isFileTest = def.fields.every(f => f.inputType === "file");
      const hasAnyResult = isFileTest ? attachments.length > 0 : results.some(r => r.result.trim() !== "");
      if (!hasAnyResult) { alert(isFileTest ? "Upload at least one attachment before saving." : "Enter at least one result value."); setSavingResults(false); return; }

      const criticalFlags = results.filter(r => r.flag === "HIGH" || r.flag === "LOW");
      const isCrit = criticalFlags.length > 0;

      await callLabApi("ENTER_RESULTS", {
        id: selectedRequest.id,
        results,
        enteredByName: user?.fullName || "Lab Technician",
        isCritical: isCrit,
        criticalNote: isCrit ? `Abnormal results: ${criticalFlags.map(r => r.test).join(", ")}` : null,
      });
      await fetchRequests();
      setResultsSaved(true);
      setWorkflowStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingResults(false);
    }
  };

  // ── Step 3: Share Results ─────────────────────────────────────────────
  const toggleDept = (dept: string) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleSendResults = async () => {
    if (!selectedRequest || selectedDepts.length === 0) { alert("Select at least one recipient."); return; }
    setSendingResults(true);
    try {
      // Resolve the logged-in user to their Staff record for sharedById
      let staffId: number | null = null;
      try {
        const staffRes = await fetch("/api/staffcreate");
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (staffData.success && Array.isArray(staffData.staff)) {
            const myStaff = staffData.staff.find((s: any) => s.userId === user?.id);
            if (myStaff?.id) staffId = myStaff.id;
          }
        }
      } catch { /* staff lookup failed — sharedById will be null */ }

      const alreadyCompleted = selectedRequest.status === "COMPLETED";
      if (!alreadyCompleted) {
        await callLabApi("VALIDATE_RESULTS", {
          id: selectedRequest.id,
          validatedByName: user?.fullName || "Lab Technician",
        });
      }

      // Share to each selected department
      for (const dept of selectedDepts) {
        await callLabApi("SHARE_RESULT", {
          labRequestId: selectedRequest.id,
          patientId: selectedRequest.patientId,
          sharedById: staffId,
          sharedByName: user?.fullName || "Lab Technician",
          targetDept: dept,
          includeReport: true,
          note: `Lab results shared from Laboratory to ${dept}`,
        });
      }

      await fetchRequests();
      setSentSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingResults(false);
    }
  };

  // ── Critical Notification ─────────────────────────────────────────────
  const handleSaveCriticalNotification = async () => {
    if (!selectedRequest || !critNotifiedPerson || !critNotificationMethod) {
      alert("Enter who was notified and the notification method.");
      return;
    }
    setSavingCritical(true);
    try {
      await callLabApi("RECORD_CRITICAL_NOTIFICATION", {
        labRequestId: selectedRequest.id,
        patientId: selectedRequest.patientId,
        notifiedPerson: critNotifiedPerson,
        notifiedDept: selectedDepts.length > 0 ? selectedDepts.join(",") : "GENERAL",
        notificationMethod: critNotificationMethod,
      });
      await fetchRequests();
      alert("Critical notification recorded.");
      setCritNotifiedPerson("");
      setCritNotificationMethod("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingCritical(false);
    }
  };

  const specimenAlreadyCollected = selectedRequest?.specimenType && selectedRequest?.specimenCollectedAt;

  // ── Print Report ────────────────────────────────────────────────────
  const openPrintWindow = (req: LabRequestItem) => {
    let parsedResults: ResultEntry[] = [];
    if (req.results) {
      try {
        const p = JSON.parse(req.results);
        if (Array.isArray(p)) parsedResults = p;
      } catch {}
    }
    if (parsedResults.length === 0) {
      parsedResults = getDefaultResults(req);
    }
    const printDef = getTestDefinition(req.testName);
    const html = generateLabReportHTML(
      `${req.lastName}, ${req.firstName}`,
      req.patientNumber,
      req.gender,
      req.age,
      req.testName,
      req.specimenType,
      req.specimenId,
      req.specimenCollectedAt,
      req.requestedBy,
      parsedResults,
      req.enteredByName,
      req.validatedByName,
      printDef.printLayout,
    );
    const w = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      alert("Popup blocked. Please allow popups for this site to print reports.");
    }
  };

  if (!isAuthed) return null;

  // ── Sidebar navigation items ──────────────────────────────────────────
  const NavItem = ({ id, label, icon: Icon, count }: { id: typeof activeView; label: string; icon: any; count?: number }) => (
    <button
      onClick={() => { setActiveView(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeView === id
          ? "text-white shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
      style={activeView === id ? { backgroundColor: "rgba(255,255,255,0.2)" } : {}}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
          activeView === id ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  // ── Small info tile for vitals grid ──────────────────────────────────
  const InfoTile = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{value}</p>
    </div>
  );

  // ── Render: Loading state ─────────────────────────────────────────────
  if (!isAuthed) return null;

  // ── Render: Workflow view ─────────────────────────────────────────────
  if (selectedRequest && workflowStep > 0) {
    const def = getTestDefinition(selectedRequest.testName);
    const hasSections = !!(def.sections && def.sections.length > 0);
    const sectionBounds = hasSections ? getSectionFieldBounds(def) : [];
    // Map activeSection index to the start index in the flat results array
    const sectionStart = hasSections && activeSection < sectionBounds.length
      ? (activeSection === 0 ? 0 : sectionBounds[activeSection - 1])
      : 0;
    const sectionEnd = hasSections && activeSection < sectionBounds.length
      ? sectionBounds[activeSection]
      : results.length;
    const visibleResults = hasSections ? results.slice(sectionStart, sectionEnd) : results;

    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa" }}>
        {/* Workflow Header */}
        <header className="border-b" style={{ backgroundColor: BRAND, borderColor: BRAND_DARK }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={closeWorkflow}
              className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Queue</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold text-sm">
                  {selectedRequest.lastName}, {selectedRequest.firstName}
                </p>
                <p className="text-white/70 text-xs">
                  {selectedRequest.patientNumber} | {selectedRequest.gender} / {selectedRequest.age}y | {selectedRequest.testName}
                </p>
              </div>
              {(selectedRequest.priority === "URGENT" || selectedRequest.priority === "STAT") && (
                <span className="bg-white text-red-700 text-xs font-bold px-2.5 py-1 rounded">
                  {selectedRequest.priority}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center gap-0">
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      workflowStep >= step ? "text-white shadow-md" : "bg-gray-200 text-gray-400"
                    }`}
                    style={workflowStep >= step ? { backgroundColor: BRAND } : {}}
                  >
                    {workflowStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  <span className={`text-xs font-medium ${workflowStep >= step ? "text-gray-800" : "text-gray-400"}`}>
                    {step === 1 ? "Sample Collected" : step === 2 ? "Enter Results" : "Share Results"}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${workflowStep > step ? "" : "bg-gray-200"}`}
                    style={workflowStep > step ? { backgroundColor: BRAND } : {}}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>


        {/* ── Patient History Panel ──────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toggle header */}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Patient History</span>
                {historyLoading && (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                )}
                {!historyLoading && patientHistoryData && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {[
                      patientHistoryData.triage ? 1 : 0,
                      patientHistoryData.visits?.length || 0,
                      patientHistoryData.imaging?.length || 0,
                      patientHistoryData.labHistory?.length || 0,
                      patientHistoryData.prescriptions?.length || 0,
                    ].reduce((a: number, b: number) => a + b, 0)} entries
                  </span>
                )}
              </div>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Collapsible content */}
            {historyOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {/* Loading state */}
                {historyLoading && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                    Loading patient history...
                  </div>
                )}

                {/* Error / empty state (loaded but nothing found) */}
                {!historyLoading && !patientHistoryData && (
                  <div className="px-5 py-6 text-center text-sm text-gray-400">
                    No history data available for this patient.
                  </div>
                )}

                {/* ── Triage / Nurse Assessment ── */}
                {!historyLoading && patientHistoryData?.triage && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Triage Assessment</span>
                      <span className="text-[10px] text-blue-500 font-medium ml-auto">Nurse Midwife</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                      {patientHistoryData.triage.chiefComplaint && (
                        <div className="col-span-full bg-blue-50/50 rounded-lg px-3 py-2 border border-blue-100">
                          <span className="font-semibold text-gray-500">Chief Complaint:</span>
                          <p className="text-gray-700 mt-0.5">{patientHistoryData.triage.chiefComplaint}</p>
                        </div>
                      )}
                      {patientHistoryData.triage.esiLevel && (
                        <InfoTile label="ESI Level" value={`Level ${patientHistoryData.triage.esiLevel}`} />
                      )}
                      {patientHistoryData.triage.temperature && (
                        <InfoTile label="Temperature" value={`${patientHistoryData.triage.temperature} °C`} />
                      )}
                      {patientHistoryData.triage.bpSystolic && (
                        <InfoTile label="BP" value={`${patientHistoryData.triage.bpSystolic}/${patientHistoryData.triage.bpDiastolic || "—"}`} />
                      )}
                      {patientHistoryData.triage.heartRate && (
                        <InfoTile label="Heart Rate" value={`${patientHistoryData.triage.heartRate} bpm`} />
                      )}
                      {patientHistoryData.triage.spo2 && (
                        <InfoTile label="SpO₂" value={`${patientHistoryData.triage.spo2}%`} />
                      )}
                      {patientHistoryData.triage.weight && (
                        <InfoTile label="Weight" value={`${patientHistoryData.triage.weight} kg`} />
                      )}
                      {patientHistoryData.triage.allergies && (
                        <InfoTile label="Allergies" value={patientHistoryData.triage.allergies} />
                      )}
                    </div>
                    {patientHistoryData.triage.nursingNotes && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        <span className="font-semibold text-gray-400">Nursing Notes:</span> {patientHistoryData.triage.nursingNotes}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-gray-400">
                      {new Date(patientHistoryData.triage.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* ── Doctor Consultations ── */}
                {!historyLoading && patientHistoryData?.visits?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center">
                        <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Doctor Consultations</span>
                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full ml-auto">
                        {patientHistoryData.visits.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {patientHistoryData.visits.map((v: any, i: number) => (
                        <div key={v.id} className="bg-amber-50/30 rounded-lg border border-amber-100 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                              Visit {patientHistoryData.visits.length - i}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {v.diagnosis && (
                            <p className="text-xs mb-0.5"><span className="font-semibold text-gray-500">Diagnosis:</span> {v.diagnosis}</p>
                          )}
                          {v.assessment && (
                            <p className="text-xs mb-0.5"><span className="font-semibold text-gray-500">Assessment:</span> {v.assessment}</p>
                          )}
                          {v.treatmentPlan && (
                            <p className="text-xs mb-0.5"><span className="font-semibold text-gray-500">Plan:</span> {v.treatmentPlan}</p>
                          )}
                          {v.notes && (
                            <p className="text-xs text-gray-500"><span className="font-semibold text-gray-400">Notes:</span> {v.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Imaging / Radiology Reports ── */}
                {!historyLoading && patientHistoryData?.imaging?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-cyan-100 flex items-center justify-center">
                        <Microscope className="w-3.5 h-3.5 text-cyan-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Imaging Reports</span>
                      <span className="text-[9px] bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded-full ml-auto">
                        {patientHistoryData.imaging.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {patientHistoryData.imaging.map((img: any) => (
                        <div key={img.id} className="bg-cyan-50/30 rounded-lg border border-cyan-100 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">{img.studyType}</span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                              img.status === "REPORTED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>{img.status}</span>
                          </div>
                          {img.Staff && (
                            <p className="text-[9px] text-gray-400 mb-1">By: {img.Staff.fullName} ({img.Staff.department})</p>
                          )}
                          {img.clinicalNotes && (
                            <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Notes:</span> {img.clinicalNotes}</p>
                          )}
                          {img.findings && (
                            <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Findings:</span> {img.findings}</p>
                          )}
                          {img.impression && (
                            <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Impression:</span> {img.impression}</p>
                          )}
                          {img.conclusion && (
                            <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Conclusion:</span> {img.conclusion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Lab History ── */}
                {!historyLoading && patientHistoryData?.labHistory?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center">
                        <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Previous Lab Results</span>
                      <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full ml-auto">
                        {patientHistoryData.labHistory.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {patientHistoryData.labHistory.map((lab: any) => (
                        <div key={lab.id} className="bg-purple-50/30 rounded-lg border border-purple-100 px-3 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{lab.testName}</p>
                            <p className="text-[10px] text-gray-400">
                              {lab.Staff?.fullName || "—"} &middot; {new Date(lab.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {lab.results && (
                              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700">
                                Results entered
                              </span>
                            )}
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                              lab.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>{lab.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Prescriptions ── */}
                {!historyLoading && patientHistoryData?.prescriptions?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Prescriptions</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full ml-auto">
                        {patientHistoryData.prescriptions.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patientHistoryData.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="bg-emerald-50/30 rounded-lg border border-emerald-100 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-700">{rx.medication}</p>
                          {rx.dosage && <p className="text-[10px] text-gray-500">{rx.dosage}</p>}
                          {rx.instructions && <p className="text-[10px] text-gray-400">{rx.instructions}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                              rx.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}>{rx.status}</span>
                            <span className="text-[9px] text-gray-400">{new Date(rx.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Timeline ── */}
                {!historyLoading && patientHistoryData?.timeline?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Patient Timeline</span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-auto">
                        {patientHistoryData.timeline.length}
                      </span>
                    </div>
                    <div className="relative pl-5 space-y-0">
                      {patientHistoryData.timeline.map((t: any, i: number) => (
                        <div key={t.id || i} className="relative pb-3 last:pb-0">
                          {/* Vertical line */}
                          {i < patientHistoryData.timeline.length - 1 && (
                            <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-200" />
                          )}
                          {/* Dot */}
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
                          {/* Content */}
                          <div className="ml-3">
                            <p className="text-xs text-gray-700">
                              {t.action}
                              {t.fromDepartment && t.toDepartment && (
                                <span className="text-gray-400">: {t.fromDepartment} → {t.toDepartment}</span>
                              )}
                            </p>
                            {t.description && (
                              <p className="text-[10px] text-gray-400">{t.description}</p>
                            )}
                            <p className="text-[9px] text-gray-300 mt-0.5">
                              {new Date(t.createdAt).toLocaleString()} {t.performedBy ? `by ${t.performedBy}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* ── End Patient History Panel ──────────────────────────────────── */}


        {/* Workflow Content */}
        <div className="max-w-4xl mx-auto px-4 pb-8">
          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {workflowStep === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                  <Droplets className="w-5 h-5" style={{ color: BRAND }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Step 1: Sample Collection</h2>
                  <p className="text-xs text-gray-500">Record the specimen details for this request</p>
                </div>
              </div>
              {specimenAlreadyCollected ? (
                <div className="p-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Sample already collected</p>
                      <p className="text-sm text-green-600">
                        Type: <strong>{selectedRequest.specimenType}</strong>
                        {selectedRequest.specimenId && <> | ID: <strong>{selectedRequest.specimenId}</strong></>}
                        {selectedRequest.collectedByName && <> | By: <strong>{selectedRequest.collectedByName}</strong></>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWorkflowStep(2)}
                    className="mt-4 w-full py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: BRAND }}
                  >
                    Continue to Step 2
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Specimen Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={specimenType}
                      onChange={e => setSpecimenType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      style={{ borderColor: specimenType ? BRAND : "#d1d5db" }}
                    >
                      <option value="">Select specimen type...</option>
                      {SPECIMEN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Collected By</label>
                    <input
                      type="text"
                      value={collectorName}
                      onChange={e => setCollectorName(e.target.value)}
                      placeholder="Technician name"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveSpecimen}
                    disabled={savingSpecimen || !specimenType}
                    className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: BRAND }}
                  >
                    {savingSpecimen ? "Saving..." : <><Save className="w-4 h-4" /> Record Specimen & Continue</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {workflowStep === 2 && (
            <ResultEntryForm
              def={def}
              results={results}
              hasSections={hasSections}
              activeSection={activeSection}
              sectionBounds={sectionBounds}
              sectionStart={sectionStart}
              visibleResults={visibleResults}
              resultsSaved={resultsSaved}
              attachments={attachments}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
              onResultChange={handleResultChange}
              onSectionChange={setActiveSection}
              onFileSelect={handleFileSelect}
              onFileUploadClick={() => fileInputRef.current?.click()}
              onDownloadAttachment={downloadAttachment}
              onSaveResults={handleSaveResults}
              savingResults={savingResults}
            />
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────── */}
          {workflowStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                    <Share2 className="w-5 h-5" style={{ color: BRAND }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Step 3: Share Results</h2>
                    <p className="text-xs text-gray-500">Send results to one or more recipient roles</p>
                  </div>
                  {sentSuccess && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent
                    </span>
                  )}
                </div>
                <div className="p-6">
                  {/* Results summary */}
                  {selectedRequest.results && (() => {
                    try {
                      const res = JSON.parse(selectedRequest.results);
                      if (!Array.isArray(res)) return null;
                      const flagged = res.filter((r: any) => r.flag === "HIGH" || r.flag === "LOW");
                      const normal = res.filter((r: any) => r.flag === "NORMAL");
                      return (
                        <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">Results Summary</p>
                          <div className="flex flex-wrap gap-2">
                            {flagged.map((r: any, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                                {r.test}: {r.result} ({r.flag})
                              </span>
                            ))}
                            {normal.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                                {normal.length} normal parameters
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Attachments summary in Step 3 */}
                  {attachments.length > 0 && (
                    <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        Attachments ({attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                          <button
                            key={idx}
                            onClick={() => downloadAttachment(att)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
                            title="Download"
                          >
                            {att.type.startsWith("image/") ? (
                              <img
                                src={`data:${att.type};base64,${att.data}`}
                                alt={att.name}
                                className="w-5 h-5 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="truncate max-w-[120px]">{att.name}</span>
                            <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Role-based recipient grid — 2x2 large tappable cards */}
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Recipients <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {SHARE_TARGETS.map(({ role, dept, label, icon: Icon, desc }) => {
                      const isSelected = selectedDepts.includes(dept);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleDept(dept)}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                            isSelected
                              ? "border-green-600 bg-green-50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          style={{ minHeight: "72px" }}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            isSelected ? "bg-green-100" : "bg-gray-100"
                          }`}>
                            <Icon className={`w-7 h-7 ${isSelected ? "text-green-700" : "text-gray-400"}`} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold ${isSelected ? "text-green-800" : "text-gray-700"}`}>
                              {label}
                            </span>
                            {isSelected && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {sentSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Results shared successfully</p>
                        <p className="text-sm text-green-600">
                          Sent to: {selectedDepts.join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => selectedRequest && openPrintWindow(selectedRequest)}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90 flex items-center gap-1.5"
                        style={{ backgroundColor: BRAND }}
                        title="Print Report"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button
                        onClick={closeWorkflow}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90"
                        style={{ backgroundColor: BRAND_DARK }}
                      >
                        Back to Queue
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendResults}
                      disabled={sendingResults || selectedDepts.length === 0}
                      className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base"
                      style={{ backgroundColor: BRAND }}
                    >
                      {sendingResults ? (
                        "Sending..."
                      ) : (
                        <><Share2 className="w-5 h-5" /> Share Results {selectedDepts.length > 0 ? `(${selectedDepts.length} recipient${selectedDepts.length > 1 ? "s" : ""})` : ""}</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Critical Notification Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Record Critical Notification</h3>
                    <p className="text-xs text-gray-500">Only if critical/abnormal results were reported</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Who Was Notified <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={critNotifiedPerson}
                        onChange={e => setCritNotifiedPerson(e.target.value)}
                        placeholder="e.g. Dr. Okello, Nurse Sarah"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Notification Method <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        {NOTIFICATION_METHODS.map(method => (
                          <button
                            key={method}
                            onClick={() => setCritNotificationMethod(method)}
                            className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                              critNotificationMethod === method
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {method === "Phone" && <Phone className="w-4 h-4 inline mr-1" />}
                            {method === "In Person" && <User className="w-4 h-4 inline mr-1" />}
                            {method === "Email" && <MailIcon className="w-4 h-4 inline mr-1" />}
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCriticalNotification}
                    disabled={savingCritical || !critNotifiedPerson || !critNotificationMethod}
                    className="mt-4 px-5 py-2.5 text-sm font-medium rounded-lg border-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                    style={{ borderColor: "#dc2626", color: "#dc2626" }}
                  >
                    {savingCritical ? "Saving..." : "Save Critical Notification"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Main layout with sidebar ──────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f5f7fa" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
        style={{ backgroundColor: BRAND }}
      >
        {/* Sidebar header with circular logo */}
        <div className="p-5 flex flex-col items-center border-b border-white/10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 mb-2 flex items-center justify-center bg-white/10">
            <img
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-white text-2xl font-bold">MS</div>';
              }}
            />
          </div>
          <h1 className="text-white font-bold text-sm text-center">Laboratory</h1>
          <p className="text-white/50 text-[10px] text-center">Main Street Medical Center</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 mb-2 mt-2">Navigation</p>
          <NavItem id="queue" label="Active Queue" icon={Home} count={pendingRequests.length} />
          <NavItem id="records" label="All Records" icon={FileText} count={allRequests.length} />
          <NavItem id="completed" label="Completed" icon={CheckCircle} count={completedRequests.length} />
          <NavItem id="rejected" label="Rejected" icon={Ban} count={rejectedRequests.length} />

          <div className="my-3 border-t border-white/10" />

          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-4 mb-2">Communications</p>
          <NavItem id="messages" label="Messages" icon={MessageSquareText} />
        </nav>

        {/* Logout at bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <FlaskConical className="w-4 h-4" style={{ color: BRAND }} />
                <span className="font-medium text-gray-700">
                  {activeView === "queue" ? "Patient Queue" :
                   activeView === "records" ? "Lab Records" :
                   activeView === "completed" ? "Completed Results" :
                   activeView === "rejected" ? "Rejected Specimens" : "Messages"}
                </span>
              </div>
            </div>

            {/* Welcome message in header */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.fullName || "Technician"}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">LAB TECHNICIAN</span>
                  <span className="text-[10px] text-gray-400">· Laboratory</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ backgroundColor: BRAND }}>
                {(user?.fullName || "T").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Sub-nav tabs for active view */}
          {activeView === "queue" && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "PENDING" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "PENDING" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  Pending ({pendingRequests.length})
                </button>
                <button
                  onClick={() => setViewFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "ALL" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "ALL" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  All ({pendingRequests.length + completedRequests.length})
                </button>
                <button
                  onClick={() => setViewFilter("URGENT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewFilter === "URGENT" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={viewFilter === "URGENT" ? { backgroundColor: BRAND, color: "white" } : {}}
                >
                  Urgent ({[...pendingRequests, ...completedRequests].filter(r => r.priority === "URGENT" || r.priority === "STAT").length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient name, ID, or test..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#00703C] focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    {queueItems.length} result{queueItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 px-4 py-5 overflow-y-auto">

          {/* ── QUEUE VIEW ─────────────────────────────────────────────── */}
          {activeView === "queue" && (
            <>
              {/* Welcome banner */}
              <div className="rounded-xl px-5 py-4 mb-4" style={{ backgroundColor: BRAND }}>
                <p className="text-white text-sm font-medium">
                  Welcome to Main Street Medical Center Laboratory Dashboard, {user?.fullName || "Technician"}
                </p>
              </div>

            {isLoading && allRequests.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: BRAND, borderTopColor: "transparent" }} />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-red-700 font-medium">Failed to load requests</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
                <button onClick={() => { setIsLoading(true); fetchRequests(); }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                  Retry
                </button>
              </div>
            ) : queueItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12" style={{ color: BRAND }} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-1">All caught up!</h3>
                <p className="text-sm text-gray-400">No pending requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {queueItems.map(req => {
                  const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                  const isRoutine = req.priority === "ROUTINE";
                  const isCompleted = req.status === "COMPLETED";
                  const hasAbnormal = req.isCritical;

                  // Determine top strip color
                  let stripColor = BRAND;
                  if (isUrgent) stripColor = "#dc2626";
                  else if (hasAbnormal) stripColor = "#f59e0b";

                  // Priority pill
                  const PriorityPill = () => {
                    if (isUrgent && req.priority === "STAT") {
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                          STAT
                        </span>
                      );
                    }
                    if (isUrgent) {
                      return (
                        <span className="text-[10px] font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full">
                          URGENT
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-medium text-gray-500 border border-gray-300 px-2.5 py-0.5 rounded-full">
                        ROUTINE
                      </span>
                    );
                  };

                  // Status progress
                  const statusSteps = [
                    { key: "sample", label: "S", done: req.specimenCollectedAt !== null || req.status !== "PENDING", title: "Sample" },
                    { key: "processing", label: "P", done: req.processingStartedAt !== null || req.status === "PROCESSING" || req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED", title: "Processing" },
                    { key: "results", label: "R", done: req.results !== null || req.status === "AWAITING_VALIDATION" || req.status === "COMPLETED", title: "Results" },
                    { key: "sent", label: "S", done: req.status === "COMPLETED", title: "Sent" },
                  ];

                  const currentStepIndex = statusSteps.findIndex(s => !s.done);
                  const activeStepIndex = currentStepIndex === -1 ? 3 : Math.max(0, currentStepIndex - 1);

                  return (
                    <div
                      key={req.id}
                      onClick={() => openWorkflow(req)}
                      className="relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ease group flex flex-col"
                      style={{
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        border: "0.5px solid #e5e7eb",
                        maxHeight: "160px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,112,60,0.12)";
                        e.currentTarget.style.borderColor = "#00703C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                    >
                      {/* Top priority strip */}
                      <div
                        className="w-full flex-shrink-0"
                        style={{ height: "4px", backgroundColor: stripColor }}
                      />

                      {/* Card content */}
                      <div className="flex flex-col flex-1 p-3.5 gap-2">
                        {/* Top row: Name + Priority pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">
                              {req.lastName}, {req.firstName}
                            </h3>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">
                              {timeElapsed(req.createdAt)}
                            </span>
                          </div>
                          <div className="flex-shrink-0 mt-0.5">
                            <PriorityPill />
                          </div>
                        </div>

                        {/* Middle section: details stacked */}
                        <div className="space-y-[3px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-medium" style={{ color: BRAND }}>
                              {req.patientNumber}
                            </span>
                            <span className="text-[11px] text-gray-400">|</span>
                            <span className="text-[11px] text-gray-500">
                              {req.gender} / {req.age}y
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FlaskConical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-[12px] font-semibold text-gray-700 truncate">
                              {req.testName}
                            </span>
                          </div>
                          {(req.clinicalNotes || req.referralNotes) && (
                            <div className="flex items-start gap-1.5 mt-0.5">
                              <FileText className="w-2.5 h-2.5 text-gray-300 mt-0.5 flex-shrink-0" />
                              <span className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                                {req.clinicalNotes || req.referralNotes}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom row: progress strip + Open button */}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            {statusSteps.map((step, idx) => {
                              const isActive = idx === activeStepIndex;
                              const isDone = step.done;
                              const isLast = idx === statusSteps.length - 1;
                              return (
                                <React.Fragment key={step.key}>
                                  <div
                                    className={`w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold transition-all duration-300 ${
                                      isDone
                                        ? "bg-green-500 text-white"
                                        : isActive
                                        ? "bg-[#00703C] text-white animate-pulse"
                                        : "bg-gray-200 text-gray-400"
                                    }`}
                                    title={step.title}
                                  >
                                    {step.label}
                                  </div>
                                  {!isLast && (
                                    <div className={`w-[10px] h-[1.5px] ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            {isCompleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openPrintWindow(req); }}
                                className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#00703C] transition-colors"
                                title="Print Report"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            )}
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-white px-2 py-1 rounded-md transition-all duration-200"
                              style={{ backgroundColor: BRAND }}
                            >
                              Open
                              <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}

          {/* ── LAB RECORDS VIEW ────────────────────────────────────────── */}
          {activeView === "records" && (
            <div>
              {/* Records filter bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  {(["ALL", "COMPLETED", "PENDING", "REJECTED", "CRITICAL"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRecordsFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        recordsFilter === f ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                      }`}
                      style={recordsFilter === f ? { backgroundColor: BRAND, color: "white" } : {}}
                    >
                      {f === "ALL" ? "All Records" :
                       f === "COMPLETED" ? "Completed" :
                       f === "PENDING" ? "In Progress" :
                       f === "REJECTED" ? "Rejected" : "Critical"}
                    </button>
                  ))}
                </div>
                <div className="relative sm:ml-auto w-full sm:w-auto">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={recordsSearch}
                    onChange={e => setRecordsSearch(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00703C]"
                  />
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Archive className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Records Found</h3>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Table header - hidden on mobile, visible on sm+ */}
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Test</div>
                    <div className="col-span-2">Specimen</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1 text-right">Priority</div>
                  </div>
                  {filteredRecords.map(req => {
                    const isRejected = req.specimenRejected;
                    const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                    const isCrit = req.isCritical;
                    return (
                      <button
                        key={req.id}
                        onClick={() => openWorkflow(req)}
                        className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Mobile view */}
                        <div className="sm:hidden flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{req.lastName}, {req.firstName}</span>
                            {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URGENT</span>}
                            {isCrit && <AlertCircle className="w-3 h-3 text-red-500" />}
                          </div>
                          <span className={`text-[10px] font-medium ${
                            isRejected ? "text-red-600" : req.status === "COMPLETED" ? "text-green-600" : "text-gray-500"
                          }`}>
                            {isRejected ? "REJECTED" : req.status}
                          </span>
                        </div>
                        <div className="sm:hidden flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{req.testName}</span>
                          <span>|</span>
                          <span>{req.patientNumber}</span>
                          <span>|</span>
                          <span>{formatShortDate(req.createdAt)}</span>
                        </div>

                        {/* Desktop grid */}
                        <div className="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{req.lastName}, {req.firstName}</span>
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-sm text-gray-600 truncate">
                          <FlaskConical className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                          {req.testName}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {req.specimenId ? (
                            <><span className="font-mono">{req.specimenId}</span> {req.specimenType && <span className="ml-1 text-gray-400">({req.specimenType})</span>}</>
                          ) : <span className="italic text-gray-300">Not collected</span>}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center">
                          {isRejected ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">REJECTED</span>
                          ) : (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              req.status === "COMPLETED" ? "text-green-700 bg-green-50 border border-green-200" :
                              req.status === "AWAITING_VALIDATION" ? "text-amber-700 bg-amber-50 border border-amber-200" :
                              req.status === "REJECTED" ? "text-red-700 bg-red-50 border border-red-200" :
                              "text-gray-500 bg-gray-50 border border-gray-200"
                            }`}>
                              {req.status === "COMPLETED" ? "Completed" :
                               req.status === "AWAITING_VALIDATION" ? "Awaiting Validation" :
                               req.status === "SPECIMEN_COLLECTED" ? "Collected" :
                               req.status === "PROCESSING" ? "Processing" :
                               req.status === "REJECTED" ? "Rejected" : "Pending"}
                            </span>
                          )}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {formatShortDate(req.createdAt)}
                        </div>
                        <div className="hidden sm:flex col-span-1 items-center justify-end gap-1">
                          {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URG</span>}
                          {isCrit && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                          {req.priority === "ROUTINE" && !isCrit && (
                            <span className="text-[9px] text-gray-400">R</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REJECTED VIEW ──────────────────────────────────────────── */}
          {activeView === "rejected" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Ban className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-bold text-gray-700">Rejected Specimens</h2>
                <span className="text-xs text-gray-400">({rejectedRequests.length} total)</span>
              </div>
              {rejectedRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Rejected Specimens</h3>
                  <p className="text-sm text-gray-400 mt-1">All specimens have been accepted.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rejectedRequests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => openWorkflow(req)}
                      className="w-full bg-white rounded-xl border border-red-200 px-5 py-4 text-left hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{req.lastName}, {req.firstName}</span>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">REJECTED</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="font-mono">{req.patientNumber}</span>
                            <span>{req.testName}</span>
                            {req.rejectionReason && <span className="text-red-500">Reason: {req.rejectionReason}</span>}
                            {req.rejectedAt && <span>{formatDate(req.rejectedAt)}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED VIEW ────────────────────────────────────────── */}
          {activeView === "completed" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-bold text-gray-700">Completed Lab Results</h2>
                <span className="text-xs text-gray-400">({completedRequests.length} total)</span>
              </div>
              {completedRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500">No Completed Results</h3>
                  <p className="text-sm text-gray-400 mt-1">Completed lab results will appear here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Test</div>
                    <div className="col-span-2">Specimen</div>
                    <div className="col-span-2">Results</div>
                    <div className="col-span-2">Completed</div>
                    <div className="col-span-1 text-right">Priority</div>
                  </div>
                  {completedRequests.map(req => {
                    const isUrgent = req.priority === "URGENT" || req.priority === "STAT";
                    const isCrit = req.isCritical;
                    let resultCount = 0;
                    try { const r = JSON.parse(req.results || "[]"); if (Array.isArray(r)) resultCount = r.length; } catch {}
                    return (
                      <button
                        key={req.id}
                        onClick={() => openWorkflow(req)}
                        className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Mobile */}
                        <div className="sm:hidden flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{req.lastName}, {req.firstName}</span>
                            {isCrit && <AlertCircle className="w-3 h-3 text-red-500" />}
                          </div>
                          <span className="text-[10px] font-medium text-green-600">COMPLETED</span>
                        </div>
                        <div className="sm:hidden flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{req.testName}</span>
                          <span>|</span>
                          <span>{req.patientNumber}</span>
                          <span>|</span>
                          <span>{formatShortDate(req.validatedAt || req.updatedAt)}</span>
                        </div>

                        {/* Desktop grid — read-only, no click-to-edit call to action */}
                        <div className="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{req.lastName}, {req.firstName}</span>
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-sm text-gray-600 truncate">
                          <FlaskConical className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                          {req.testName}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {req.specimenId ? (
                            <><span className="font-mono">{req.specimenId}</span> {req.specimenType && <span className="ml-1 text-gray-400">({req.specimenType})</span>}</>
                          ) : <span className="italic text-gray-300">N/A</span>}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {resultCount > 0 ? (
                            <span className="text-green-600">{resultCount} parameter{resultCount !== 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-gray-300">No data</span>
                          )}
                        </div>
                        <div className="hidden sm:flex col-span-2 items-center text-xs text-gray-500">
                          {formatShortDate(req.validatedAt || req.updatedAt)}
                        </div>
                        <div className="hidden sm:flex col-span-1 items-center justify-end gap-1">
                          {isUrgent && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URG</span>}
                          {isCrit && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES VIEW ──────────────────────────────────────────── */}
          {activeView === "messages" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquareText className="w-5 h-5" style={{ color: BRAND }} />
                <h2 className="text-base font-bold text-gray-700">Staff Messages</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <StaffMessaging
                  currentUserName={user?.fullName || "Lab Technician"}
                  currentUserDept="Laboratory"
                />
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Send and receive messages from other departments
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
