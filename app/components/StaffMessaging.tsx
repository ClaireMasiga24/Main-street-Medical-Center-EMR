"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquareText, Send, X, Loader2, Building2, User, Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaffMsg {
  id: number;
  senderName: string;
  senderDept: string;
  message: string;
  targetDept: string | null;
  createdAt: string;
}

const DEPARTMENTS = [
  "Reception",
  "Triage",
  "Doctor",
  "Laboratory",
  "Radiology",
  "Sonography",
  "Pharmacy",
  "Dentist",
  "Billing",
  "Administration",
  "Ward",
  "Nurse/Midwife",
];

const DEPARTMENT_COLORS: Record<string, string> = {
  Reception: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Triage: "bg-pink-100 text-pink-800 border-pink-200",
  Doctor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Laboratory: "bg-amber-100 text-amber-800 border-amber-200",
  Radiology: "bg-violet-100 text-violet-800 border-violet-200",
  Sonography: "bg-blue-100 text-blue-800 border-blue-200",
  Pharmacy: "bg-teal-100 text-teal-800 border-teal-200",
  Dentist: "bg-cyan-100 text-cyan-800 border-cyan-200",
  Billing: "bg-orange-100 text-orange-800 border-orange-200",
  Administration: "bg-slate-100 text-slate-800 border-slate-200",
  Ward: "bg-rose-100 text-rose-800 border-rose-200",
  "Nurse/Midwife": "bg-purple-100 text-purple-800 border-purple-200",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString("en-UG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function StaffMessaging({
  currentUserName,
  currentUserDept,
}: {
  currentUserName?: string;
  currentUserDept?: string;
}) {
  const [messages, setMessages] = useState<StaffMsg[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [targetDept, setTargetDept] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState<number>(0);

  // Resolve user info from storage if not provided
  const [resolvedName, setResolvedName] = useState(currentUserName || "");
  const [resolvedDept, setResolvedDept] = useState(currentUserDept || "");

  useEffect(() => {
    if (currentUserName && currentUserDept) {
      setResolvedName(currentUserName);
      setResolvedDept(currentUserDept);
      return;
    }
    try {
      const r = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (r) {
        const u = JSON.parse(r);
        setResolvedName(u.fullName || u.username || "Staff");
        // Try to infer department from role
        const roleDept: Record<string, string> = {
          RECEPTIONIST: "Reception",
          CASHIER: "Billing",
          DOCTOR: "Doctor",
          LAB_TECHNICIAN: "Laboratory",
          NURSE: "Triage",
          NURSE_MIDWIFE: "Nurse/Midwife",
          MIDWIFE: "Nurse/Midwife",
          PHARMACIST: "Pharmacy",
          DENTIST: "Dentist",
          SONOGRAPHER: "Sonography",
          RADIOLOGIST: "Radiology",
          RADIOLOGIST_SONOGRAPHER: "Radiology",
          ADMINISTRATOR: "Administration",
        };
        setResolvedDept(u.department || roleDept[u.role] || "Reception");
      }
    } catch {}
  }, [currentUserName, currentUserDept]);

  // ── Fetch messages ──────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const params = filterDept !== "ALL" ? `?department=${encodeURIComponent(filterDept)}` : "";
      const res = await fetch(`/api/staff-messages${params}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        // Track unread: messages newer than lastSeenId
        if (data.messages.length > 0) {
          const maxId = Math.max(...data.messages.map((m: StaffMsg) => m.id));
          if (!isOpen) {
            setUnreadCount((prev) => Math.max(prev, data.messages.filter((m: StaffMsg) => m.id > lastSeenId).length));
          }
          setLastSeenId(maxId);
        }
      }
    } catch {}
  }, [filterDept, lastSeenId, isOpen]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Reset unread when panel opens
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, isOpen]);

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await fetch("/api/staff-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: resolvedName,
          senderDept: resolvedDept,
          message: text,
          targetDept: targetDept !== "ALL" ? targetDept : null,
        }),
      });
      setMessageText("");
      await fetchMessages();
    } catch {
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative">
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 bg-white border border-slate-200 hover:border-[#00703C] text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
      >
        <MessageSquareText size={15} />
        <span>Messages</span>
        {unreadCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Modal panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{
              width: "min(440px, calc(100vw - 32px))",
              maxHeight: "min(580px, calc(100vh - 100px))",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00703C] to-emerald-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText size={18} className="text-white/90" />
                <span className="font-bold text-sm text-white">Staff Messages</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <Building2 size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-[#00703C]"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={fetchMessages}
                className="text-[10px] font-bold text-[#00703C] hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition"
              >
                Refresh
              </button>
            </div>

            {/* Messages list */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(580px - 200px)" }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <MessageSquareText size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-300 mt-1">Send a note to another department</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00703C]/10 flex items-center justify-center text-[11px] font-extrabold text-[#00703C] flex-shrink-0 mt-0.5">
                        {msg.senderName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-bold text-slate-800 truncate">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              DEPARTMENT_COLORS[msg.senderDept] || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {msg.senderDept}
                          </span>
                          {msg.targetDept && (
                            <>
                              <span className="text-[9px] text-slate-300">→</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  DEPARTMENT_COLORS[msg.targetDept] || "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {msg.targetDept}
                              </span>
                            </>
                          )}
                          {!msg.targetDept && (
                            <span className="text-[9px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">
                              Facility-wide
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={listEndRef} />
            </div>

            {/* Compose area */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold outline-none focus:border-[#00703C]"
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.filter((d) => d !== resolvedDept).map((d) => (
                    <option key={d} value={d}>{d} only</option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-400">
                  {resolvedName} · {resolvedDept}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message for staff…"
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-[12px] font-medium outline-none transition focus:border-[#00703C]"
                  maxLength={500}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#00703C] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
