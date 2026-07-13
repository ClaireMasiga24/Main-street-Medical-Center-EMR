"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NotificationInbox from "../components/NotificationInbox";
import StaffMessaging from "../components/StaffMessaging";
import {
  LogOut, CheckCircle, Clock, AlertTriangle, MapPin,
  ClipboardList, User, Loader2, Plus, X, MessageSquare,
  Bell, Trash2, Wrench, DoorOpen, CheckCircle2,
  ChevronRight, RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface CleaningTask {
  id: number;
  area: string;
  task: string;
  priority: "low" | "normal" | "high";
  assignedBy: string;
  assignedAt: string;
  completedAt: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  notes: string;
  roomNumber?: string;
}

interface MaintenanceReport {
  id: number;
  location: string;
  issue: string;
  reportedAt: string;
  status: "REPORTED" | "IN_PROGRESS" | "RESOLVED";
}

// ── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING:     { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
    IN_PROGRESS: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
    COMPLETED:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
    REPORTED:    { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
    RESOLVED:    { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  };
  const upper = status.toUpperCase();
  const c = config[upper] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {upper === "IN_PROGRESS" ? "In Progress" : upper.charAt(0) + upper.slice(1).toLowerCase()}
    </span>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const cls = p === "high"
    ? "bg-red-50 text-red-700 border-red-200"
    : p === "low"
    ? "bg-slate-50 text-slate-500 border-slate-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      {priority}
    </span>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────────────

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-200 ${className}`}>
    {children}
  </div>
);

// ── Sticky Header ──────────────────────────────────────────────────────────

const StickyHeader = ({ tabName, children }: { tabName: string; children?: React.ReactNode }) => (
  <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between rounded-t-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
    <div className="flex items-center gap-3">
      <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">{tabName}</h2>
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function CleanerDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"tasks" | "maintenance" | "inbox">("tasks");
  const [clock, setClock] = useState("");
  const [cleanerName, setCleanerName] = useState("Cleaner");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Maintenance
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ location: "", issue: "" });
  const [reportSaving, setReportSaving] = useState(false);

  // Clock in/out
  const [clockedIn, setClockedIn] = useState<boolean | null>(null);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);

  // ── Clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  // ── Load user from storage ─────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) { router.replace("/login"); return; }
    try {
      const u = JSON.parse(raw);
      setCleanerName(u.fullName || u.username || "Cleaner");
    } catch { router.replace("/login"); }
  }, [router]);

  // ── Load tasks ─────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch("/api/cleaning/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch { /* server may not exist yet */ }
    finally { setTasksLoading(false); }
  }, []);

  useEffect(() => {
    // Seed sample tasks if API doesn't exist yet
    setTasks([
      {
        id: 1, area: "Ward A", task: "Mop floors and disinfect surfaces",
        priority: "high", assignedBy: "Admin", assignedAt: new Date().toISOString(),
        completedAt: null, status: "PENDING", notes: "Use hospital-grade disinfectant", roomNumber: "A-101",
      },
      {
        id: 2, area: "Reception", task: "Empty bins and wipe counters",
        priority: "normal", assignedBy: "Admin", assignedAt: new Date().toISOString(),
        completedAt: null, status: "PENDING", notes: "", roomNumber: "Reception",
      },
      {
        id: 3, area: "Lab", task: "Clean and sterilize lab benches",
        priority: "high", assignedBy: "Admin", assignedAt: new Date().toISOString(),
        completedAt: null, status: "PENDING", notes: "Wear gloves", roomNumber: "Lab-1",
      },
      {
        id: 4, area: "Pharmacy", task: "Sweep and organize storage",
        priority: "low", assignedBy: "Admin", assignedAt: new Date().toISOString(),
        completedAt: null, status: "PENDING", notes: "", roomNumber: "Pharmacy",
      },
    ]);
    fetchTasks();
  }, [fetchTasks]);

  // ── Load maintenance reports ───────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/cleaning/maintenance");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Task actions ───────────────────────────────────────────────────────
  const startTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "IN_PROGRESS" as const } : t));
  };

  const completeTask = (id: number) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: "COMPLETED" as const, completedAt: new Date().toISOString() } : t
    ));
  };

  // ── Maintenance report submission ──────────────────────────────────────
  const submitReport = async () => {
    if (!reportForm.location.trim() || !reportForm.issue.trim()) return;
    setReportSaving(true);
    try {
      const newReport: MaintenanceReport = {
        id: Date.now(),
        location: reportForm.location,
        issue: reportForm.issue,
        reportedAt: new Date().toISOString(),
        status: "REPORTED",
      };
      setReports(prev => [newReport, ...prev]);
      setReportForm({ location: "", issue: "" });
      setShowReportModal(false);
    } catch {}
    finally { setReportSaving(false); }
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  // ── Filtered tasks ─────────────────────────────────────────────────────
  const filteredTasks = filterStatus === "all"
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const taskCountByStatus = {
    all: tasks.length,
    PENDING: tasks.filter(t => t.status === "PENDING").length,
    IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS").length,
    COMPLETED: tasks.filter(t => t.status === "COMPLETED").length,
  };

  // ── Sidebar tabs ───────────────────────────────────────────────────────
  const tabs = [
    { id: "tasks" as const, label: "Tasks", icon: ClipboardList },
    { id: "maintenance" as const, label: "Maintenance", icon: Wrench },
    { id: "inbox" as const, label: "Inbox", icon: Bell },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f8] to-white">
      {/* ── Top Navigation ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="bg-[#00703C]/10 p-2 rounded-lg">
              <DoorOpen size={18} className="text-[#00703C]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">Cleaner Dashboard</h1>
              <p className="text-[10px] text-slate-500">Main Street Medical Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100/70 px-2.5 py-1 rounded-lg text-xs text-slate-500">
              <Clock size={13} className="text-[#00703C]" />
              <span className="tabular-nums font-semibold text-slate-700">{clock}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#00703C]/10 px-2.5 py-1 rounded-lg text-xs">
              <User size={13} className="text-[#00703C]" />
              <span className="font-semibold text-[#00703C]">{cleanerName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg"
          >
            {activeTab.replace("_", " ").charAt(0).toUpperCase() + activeTab.slice(1).replace("_", " ")}
          </button>
        </div>

        {/* Mobile tab picker */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-2 flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition ${
                  activeTab === tab.id ? "bg-[#00703C] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Desktop tab bar */}
        <div className="hidden sm:flex items-center gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition ${
                activeTab === tab.id
                  ? "bg-[#00703C] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TASKS TAB ────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Tasks", count: taskCountByStatus.all, color: "text-slate-700 bg-slate-100" },
                { label: "Pending", count: taskCountByStatus.PENDING, color: "text-amber-700 bg-amber-50" },
                { label: "In Progress", count: taskCountByStatus.IN_PROGRESS, color: "text-blue-700 bg-blue-50" },
                { label: "Completed", count: taskCountByStatus.COMPLETED, color: "text-green-700 bg-green-50" },
              ].map(kpi => (
                <Card key={kpi.label} className="p-4 text-center">
                  <p className={`text-2xl sm:text-3xl font-bold ${kpi.color.split(" ")[0]}`}>{kpi.count}</p>
                  <p className={`text-[11px] font-semibold mt-1 ${kpi.color.split(" ")[1]} inline-block px-2 py-0.5 rounded-full`}>
                    {kpi.label}
                  </p>
                </Card>
              ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {["all", "PENDING", "IN_PROGRESS", "COMPLETED"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    filterStatus === f
                      ? "bg-[#00703C] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f === "all" ? "All" : f === "IN_PROGRESS" ? "In Progress" : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
              <button
                onClick={fetchTasks}
                className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            {/* Task list */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <Card className="p-10 text-center">
                  <CheckCircle2 size={40} className="mx-auto text-green-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">All tasks completed!</p>
                  <p className="text-xs text-slate-400 mt-1">Great work — nothing pending.</p>
                </Card>
              ) : (
                filteredTasks.map(task => (
                  <Card key={task.id} className={`p-4 sm:p-5 ${task.status === "COMPLETED" ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h3 className="text-sm font-bold text-slate-800">{task.task}</h3>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {task.area}{task.roomNumber ? ` — ${task.roomNumber}` : ""}
                          </span>
                          {task.notes && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle size={12} />
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={task.status} />
                        {task.status === "PENDING" && (
                          <button
                            onClick={() => startTask(task.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Start
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition"
                          >
                            <CheckCircle size={13} />
                            Done
                          </button>
                        )}
                        {task.status === "COMPLETED" && task.completedAt && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(task.completedAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── MAINTENANCE TAB ───────────────────────────────────────── */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
            {/* Report issue button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Report broken equipment, leaks, or hazards</p>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#00703C] hover:bg-emerald-800 px-4 py-2 rounded-lg transition"
              >
                <Plus size={14} />
                Report Issue
              </button>
            </div>

            {/* Reports list */}
            <div className="space-y-3">
              {reports.length === 0 ? (
                <Card className="p-10 text-center">
                  <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No maintenance reports</p>
                  <p className="text-xs text-slate-400 mt-1">Report an issue to get it logged.</p>
                </Card>
              ) : (
                reports.map(report => (
                  <Card key={report.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 mb-1">{report.issue}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(report.reportedAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── INBOX TAB ────────────────────────────────────────────── */}
        {activeTab === "inbox" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-5">
              <StickyHeader tabName="Notifications & Messaging" />
              <div className="p-4 space-y-6">
                <NotificationInbox />
                <StaffMessaging />
              </div>
            </Card>
          </div>
        )}

      </main>

      {/* ── Maintenance Report Modal ────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Report Maintenance Issue</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location / Room</label>
                <input
                  value={reportForm.location}
                  onChange={e => setReportForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00703C]"
                  placeholder="e.g. Ward A, Room 3"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Describe the issue</label>
                <textarea
                  value={reportForm.issue}
                  onChange={e => setReportForm(prev => ({ ...prev, issue: e.target.value }))}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00703C] resize-none"
                  placeholder="e.g. Broken faucet, leaking pipe, broken mop handle..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  disabled={reportSaving || !reportForm.location.trim() || !reportForm.issue.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#00703C] hover:bg-emerald-800 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {reportSaving ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
