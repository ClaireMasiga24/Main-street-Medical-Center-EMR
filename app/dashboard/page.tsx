"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserRound, Stethoscope, FlaskConical, Pill, CreditCard,
  ClipboardList, CalendarDays, Activity, FileText, Settings, ShieldCheck,
  LogOut, RefreshCw, Circle, Wifi, Phone, Clock, UserCheck, UserX,
  History, XCircle,
} from "lucide-react";

const modules = [
  { title: "Reception", icon: UserRound, path: "/receptionist" },
  { title: "Doctors", icon: Stethoscope, path: "/Doctors" },
  { title: "Dentists", icon: Stethoscope, path: "/Dentist" },
  { title: "Nurses & Midwives", icon: Activity, path: "/nurse_midwife" },
  { title: "Laboratory", icon: FlaskConical, path: "/laboratory" },
  { title: "Radiology", icon: ClipboardList, path: "/radiologist_sonographer" },
  { title: "Pharmacy", icon: Pill, path: "/pharmacy" },
  { title: "Staff Management", icon: Users, path: "/StaffManagement" },
  { title: "System Settings", icon: Settings, path: "/system settings" },
];

interface OnlineUser {
  id: number; name: string; username: string; role: string;
  department: string; phone: string; lastActive: string | null;
}

interface AuditEntry {
  id: number; action: string; details: string;
  userName: string; username: string; role: string; createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) { router.push("/"); return; }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "ADMINISTRATOR") { router.push("/"); return; }
    setUser(parsedUser);
  }, [router]);

  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch("/api/heartbeat");
      const data = await res.json();
      if (data.success) { setOnlineUsers(data.online); setOnlineCount(data.count); }
    } catch {} finally { setLoadingOnline(false); }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/auditlog?limit=50");
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs);
    } catch {} finally { setLoadingAudit(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Admin's own heartbeat
    fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, username: user.username }) }).catch(() => {});
    fetchOnline();
    fetchAuditLogs();
    const interval = setInterval(fetchOnline, 15000);
    const hb = setInterval(() => {
      fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) }).catch(() => {});
    }, 120000);
    return () => { clearInterval(interval); clearInterval(hb); };
  }, [user, fetchOnline, fetchAuditLogs]);

  const logout = async () => {
    try {
      const u = user;
      await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, username: u.username }),
      });
    } catch {} finally {
      localStorage.removeItem("user"); sessionStorage.removeItem("user"); router.push("/");
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diff < 1) return "Just now";
      if (diff < 60) return `${diff}m ago`;
      return d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-UG", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return iso; }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-100 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 z-40 h-screen w-72 bg-green-900 text-white transition-transform duration-300 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="p-5 border-b border-green-800">
          <div className="flex items-center gap-3">
            <Image src="/Images/LOGO.jpg" alt="Main Street EMR" width={44} height={44} className="rounded-full bg-white p-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">Main Street EMR</h1>
              <p className="text-[11px] text-green-200 truncate">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* ── Sidebar navigation buttons ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          <button onClick={() => setShowOnline(true)}
            className="w-full flex items-center justify-between gap-2 text-[11px] font-bold text-green-200 uppercase tracking-wider hover:text-white transition px-3 py-2.5 rounded-lg hover:bg-white/10">
            <span className="flex items-center gap-2"><Wifi size={14} /> Online Staff</span>
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{onlineCount}</span>
          </button>
          <button onClick={() => setShowHistory(true)}
            className="w-full flex items-center gap-2 text-[11px] font-bold text-green-200 uppercase tracking-wider hover:text-white transition px-3 py-2.5 rounded-lg hover:bg-white/10">
            <History size={14} /> Login History
          </button>
        </div>

        <div className="p-4 border-t border-green-800">
          <div className="bg-white/5 rounded-xl px-3 py-2 mb-3 text-center">
            <p className="text-[10px] text-green-200/60">Logged in as</p>
            <p className="text-xs font-bold text-white truncate">{user?.fullName || user?.username}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 py-2.5 rounded-xl font-semibold text-sm transition">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <section className="flex-1 md:ml-72 min-w-0">
        {/* Mobile header */}
        <div className="md:hidden bg-green-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="text-xl p-1">☰</button>
          <span className="font-bold text-sm">Admin Dashboard</span>
          <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{onlineCount} online</span>
        </div>

	        <div className="p-4 md:p-8">
	          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
	            <div className="min-w-0">
	              <h2 className="text-xl md:text-3xl font-bold text-gray-800 truncate">Welcome Back, {user.fullName || user.username}</h2>
	              <p className="text-gray-500 text-sm mt-1">Main Street Medical Center Administration</p>
	            </div>
	            <button onClick={() => { fetchOnline(); fetchAuditLogs(); }} className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-green-600 text-slate-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm self-start">
	              <RefreshCw size={15} /> Refresh
	            </button>
	          </div>

          {/* ── MODULE GRID ──────────────────────────────────────────────── */}
          <h3 className="text-base md:text-lg font-bold text-slate-700 mb-3">System Modules</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button key={module.title} onClick={() => module.path && router.push(module.path)}
                  className={`bg-white border border-gray-200 rounded-xl h-28 md:h-40 flex flex-col items-center justify-center transition-all ${module.path ? "hover:bg-green-50 hover:border-green-300 hover:shadow-md cursor-pointer active:scale-95" : "opacity-60 cursor-not-allowed"}`}>
                  <Icon size={28} className="md:size-10 text-green-700 mb-2 md:mb-4" />
                  <span className="text-xs md:text-base font-medium text-gray-700 text-center px-2 md:px-3 leading-tight">{module.title}</span>
                  {module.path && <span className="text-[10px] md:text-xs text-green-600 mt-0.5 md:mt-1 font-medium">Tap to open</span>}
                </button>
              );
            })}
          </div>
        </div>
	      </section>

	      {/* ── LOGIN HISTORY MODAL ───────────────────────────────────── */}
	      {showHistory && (
	        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={() => setShowHistory(false)}>
	          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
	            <div className="bg-[#00703C] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
	              <h2 className="text-lg font-bold flex items-center gap-2"><History size={20} /> Staff Login / Logout History</h2>
	              <button onClick={() => { setShowHistory(false); fetchAuditLogs(); }} className="text-white/80 hover:text-white"><XCircle size={20} /></button>
	            </div>

	            <div className="flex-1 overflow-y-auto p-6">
	              {loadingAudit ? (
	                <div className="flex items-center justify-center py-16 text-slate-300"><RefreshCw size={32} className="animate-spin" /></div>
	              ) : auditLogs.length === 0 ? (
	                <div className="text-center py-16 text-slate-400">
	                  <History size={48} className="mx-auto mb-3 text-slate-200" />
	                  <p className="font-bold text-lg">No records yet</p>
	                  <p className="text-sm mt-1">Staff login/logout activity will appear here</p>
	                </div>
	              ) : (
	                <div className="space-y-3">
	                  {auditLogs.map((log) => (
	                    <div key={log.id} className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition">
	                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${log.action === "LOGIN" ? "bg-green-100" : "bg-red-100"}`}>
	                        {log.action === "LOGIN" ? <UserCheck size={20} className="text-green-600" /> : <UserX size={20} className="text-red-500" />}
	                      </div>
	                      <div className="flex-1 min-w-0">
	                        <div className="flex items-start justify-between gap-3">
	                          <div>
	                            <p className="text-base font-bold text-slate-800">
	                              {log.userName}
	                            </p>
	                            <p className="text-xs font-mono text-slate-400 mt-0.5">@{log.username}</p>
	                          </div>
	                          <div className="text-right flex-shrink-0">
	                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${log.action === "LOGIN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
	                              {log.action}
	                            </span>
	                            <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(log.createdAt)}</p>
	                          </div>
	                        </div>
	                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
	                          <span className="bg-slate-100 px-2 py-0.5 rounded-full">{log.role.replace(/_/g, " ")}</span>
	                          <span className="text-slate-300">|</span>
	                          <span className="truncate">{log.details}</span>
	                        </div>
	                      </div>
	                    </div>
	                  ))}
	                </div>
	              )}
	            </div>

	            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
	              <span className="text-xs text-slate-400">{auditLogs.length} record{auditLogs.length !== 1 ? "s" : ""}</span>
	              <button onClick={() => { fetchAuditLogs(); }} className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] hover:text-green-700 transition">
	                <RefreshCw size={13} /> Refresh
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

	      {/* ── ONLINE STAFF MODAL ────────────────────────────────────── */}
	      {showOnline && (
	        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={() => setShowOnline(false)}>
	          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
	            <div className="bg-[#00703C] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
	              <h2 className="text-lg font-bold flex items-center gap-2"><Wifi size={20} /> Staff Currently Online <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{onlineCount}</span></h2>
	              <button onClick={() => { setShowOnline(false); fetchOnline(); }} className="text-white/80 hover:text-white"><XCircle size={20} /></button>
	            </div>

	            <div className="flex-1 overflow-y-auto p-6">
	              {loadingOnline ? (
	                <div className="flex items-center justify-center py-16 text-slate-300"><RefreshCw size={32} className="animate-spin" /></div>
	              ) : onlineUsers.length === 0 ? (
	                <div className="text-center py-16 text-slate-400">
	                  <Wifi size={48} className="mx-auto mb-3 text-slate-200" />
	                  <p className="font-bold text-lg">No staff currently online</p>
	                  <p className="text-sm mt-1">Staff appear here when they log into the system</p>
	                </div>
	              ) : (
	                <div className="overflow-x-auto">
	                  <table className="w-full text-sm">
	                    <thead>
	                      <tr className="bg-slate-50 border-b border-slate-200">
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Status</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Username</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Role</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Department</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Phone</th>
	                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Last Active</th>
	                      </tr>
	                    </thead>
	                    <tbody>
	                      {onlineUsers.map((ou) => (
	                        <tr key={ou.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
	                          <td className="px-4 py-3"><Circle size={8} className="text-green-500 fill-green-500 animate-pulse" /></td>
	                          <td className="px-4 py-3 font-semibold text-slate-800">{ou.name}</td>
	                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{ou.username}</td>
	                          <td className="px-4 py-3"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{ou.role}</span></td>
	                          <td className="px-4 py-3 text-xs text-slate-500">{ou.department}</td>
	                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{ou.phone !== "—" ? ou.phone : "—"}</td>
	                          <td className="px-4 py-3 text-xs text-slate-400">{formatTime(ou.lastActive)}</td>
	                        </tr>
	                      ))}
	                    </tbody>
	                  </table>
	                </div>
	              )}
	            </div>

	            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
	              <span className="text-xs text-slate-400">{onlineCount} staff online</span>
	              <button onClick={() => fetchOnline()} className="flex items-center gap-1.5 text-xs font-bold text-[#00703C] hover:text-green-700 transition">
	                <RefreshCw size={13} /> Refresh
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
	    </main>
	  );
	}
