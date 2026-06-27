"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, XCircle, CheckCircle, MessageSquare, FlaskConical, Send, AlertTriangle, RefreshCw, FileText, ExternalLink } from "lucide-react";

interface LabRequestData {
  testName: string;
  testPanel: string | null;
  results: string | null;
  priority: string;
  clinicalNotes: string | null;
  criticalNote: string | null;
  isCritical: boolean;
  enteredByName: string | null;
  resultEnteredAt: string | null;
  validatedByName: string | null;
  validatedAt: string | null;
  specimenType: string | null;
  specimenId: string | null;
  attachments: { name: string; url: string; type: string }[];
  analyzerResults: string | null;
  analyzerType: string | null;
  analyzerModel: string | null;
  patientName: string;
  patientNumber: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  referenceId: number | null;
  referenceType: string | null;
  patientId: number | null;
  labRequest?: LabRequestData | null;
}

const NOTIF_ICONS: Record<string, any> = {
  CRITICAL_RESULT: AlertTriangle,
  RESULT_READY: FlaskConical,
  RESULT_SHARED: Send,
  COMMUNICATION: MessageSquare,
  REPEAT_REQUEST: XCircle,
  GENERAL: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  CRITICAL_RESULT: "bg-red-50 border-red-200 text-red-700",
  RESULT_READY: "bg-green-50 border-green-200 text-green-700",
  RESULT_SHARED: "bg-blue-50 border-blue-200 text-blue-700",
  COMMUNICATION: "bg-purple-50 border-purple-200 text-purple-700",
  REPEAT_REQUEST: "bg-orange-50 border-orange-200 text-orange-700",
  GENERAL: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function NotificationInbox({
  department,
  userId,
  maxHeight = "400px",
  showTitle = true,
  sidebar = false,
  onNotificationClick,
}: {
  department?: string;
  userId?: number;
  maxHeight?: string;
  showTitle?: boolean;
  sidebar?: boolean;
  onNotificationClick?: (notification: NotificationItem) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/laboratory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GET_NOTIFICATIONS",
          payload: { department, userId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: any) => !n.isRead).length);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [department, userId]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const markRead = async (id: number) => {
    try {
      await fetch("/api/laboratory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_NOTIF_READ", payload: { id } }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/laboratory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_ALL_NOTIF_READ",
          payload: { department },
        }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = (n: NotificationItem) => {
    if (!n.isRead) markRead(n.id);
    // For lab-related notifications with full data, show detail view
    if (
      n.labRequest &&
      (n.type === "RESULT_SHARED" || n.type === "RESULT_READY" || n.type === "CRITICAL_RESULT")
    ) {
      setSelectedNotif(n);
      return;
    }
    if (onNotificationClick) {
      onNotificationClick(n);
    } else if (n.patientId) {
      const targetMap: Record<string, string> = {
        CRITICAL_RESULT: "Doctors",
        RESULT_READY: "Doctors",
        RESULT_SHARED: "Doctors",
        COMMUNICATION: "receptionist",
      };
      const page = targetMap[n.type] || "receptionist";
      window.open(`/${page}?patientId=${n.patientId}`, "_blank");
    }
  };

  const handleViewPatient = (e: React.MouseEvent, patientId: number) => {
    e.stopPropagation();
    window.open(`/receptionist?patientId=${patientId}`, "_blank");
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diff < 1) return "Just now";
      if (diff < 60) return `${diff}m ago`;
      const hours = Math.floor(diff / 60);
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString("en-UG", { day: "2-digit", month: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <div className={`${sidebar ? "" : "relative"}`}>
      <style>{`
        @keyframes drop-fade-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .drop-fade-in {
          animation: drop-fade-in 0.15s ease-out;
        }
      `}</style>
      {/* Bell button — sidebar variant vs inline variant */}
      <button suppressHydrationWarning
        onClick={() => { setIsOpen(!isOpen); setSelectedNotif(null); }}
        className={`relative flex items-center gap-2 w-full transition-all duration-150 ${
          sidebar
            ? "px-3 py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10"
            : "bg-white border border-slate-200 hover:border-[#00703C] text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
        }`}
      >
        <Bell size={sidebar ? 14 : 15} />
        {showTitle && <span className="text-xs">Inbox</span>}
        {unreadCount > 0 && (
          <span className={`ml-auto ${sidebar ? "bg-white/25 text-white" : "bg-red-500 text-white"} text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — centered modal for both variants */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden drop-fade-in"
            style={{
              width: "min(480px, calc(100vw - 40px))",
              maxHeight: "min(620px, calc(100vh - 80px))",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00803F] to-[#00A651] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedNotif ? (
                  <button
                    onClick={() => setSelectedNotif(null)}
                    className="text-white/80 hover:text-white flex items-center gap-1 text-xs font-semibold"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m0 0l7-7m-7 7l7 7"/></svg>
                    Back
                  </button>
                ) : (
                  <>
                    <Bell size={15} className="text-white/90" />
                    <span className="font-bold text-xs text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-white/25 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[9px] font-bold text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                  <XCircle size={14} />
                </button>
              </div>
            </div>

            {/* Content: Detail View or List */}
            {selectedNotif && selectedNotif.labRequest ? (
              <div className="overflow-y-auto" style={{ maxHeight: "calc(460px - 52px)" }}>
                <div className="p-4 space-y-4">
                  {/* Patient header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Patient</p>
                      <p className="text-sm font-bold text-slate-800">{selectedNotif.labRequest.patientName}</p>
                      <p className="text-[10px] text-[#00803F] font-semibold">#{selectedNotif.labRequest.patientNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Test</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedNotif.labRequest.testName}</p>
                      {selectedNotif.labRequest.testPanel && (
                        <p className="text-[10px] text-slate-400">{selectedNotif.labRequest.testPanel}</p>
                      )}
                    </div>
                  </div>

                  {/* Priority & Specimen badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedNotif.labRequest.priority && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        selectedNotif.labRequest.priority === "STAT"
                          ? "bg-red-100 text-red-700"
                          : selectedNotif.labRequest.priority === "URGENT"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {selectedNotif.labRequest.priority}
                      </span>
                    )}
                    {selectedNotif.labRequest.specimenId && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                        Specimen: {selectedNotif.labRequest.specimenId}
                        {selectedNotif.labRequest.specimenType ? ` (${selectedNotif.labRequest.specimenType})` : ""}
                      </span>
                    )}
                  </div>

                  {selectedNotif.labRequest.isCritical && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Critical Result</p>
                        {selectedNotif.labRequest.criticalNote && (
                          <p className="text-[11px] text-red-600 mt-0.5">{selectedNotif.labRequest.criticalNote}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full results / findings */}
                  {selectedNotif.labRequest.results ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Laboratory Findings</p>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        {(() => {
                          try {
                            const parsed = JSON.parse(selectedNotif.labRequest.results);
                            if (Array.isArray(parsed)) {
                              return (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      {Object.keys(parsed[0] || {}).map((key) => (
                                        <th key={key} className="text-left px-2 py-1 text-[10px] text-slate-500 font-semibold uppercase">{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsed.map((row: any, i: number) => (
                                      <tr key={i} className={`border-b border-slate-100 last:border-0 ${row.flag === "critical" ? "bg-red-50/50" : row.flag === "high" || row.flag === "low" ? "bg-orange-50/50" : ""}`}>
                                        {Object.values(row).map((val: any, j: number) => (
                                          <td key={j} className={`px-2 py-1 ${Object.keys(parsed[0] || {})[j] === "flag" && val === "critical" ? "text-red-600 font-bold" : Object.keys(parsed[0] || {})[j] === "flag" && (val === "high" || val === "low") ? "text-orange-600 font-bold" : "text-slate-700"}`}>
                                            {String(val ?? "")}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              );
                            }
                            if (typeof parsed === "object" && parsed !== null) {
                              return (
                                <div className="space-y-1">
                                  {Object.entries(parsed).map(([key, val]) => (
                                    <div key={key} className="flex gap-2 text-xs">
                                      <span className="font-semibold text-slate-500 min-w-[100px]">{key.replace(/_/g, " ")}</span>
                                      <span className="text-slate-700">{String(val ?? "")}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                          } catch {}
                          return <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedNotif.labRequest.results}</p>;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                      <FlaskConical size={20} className="mx-auto mb-1 text-slate-300" />
                      <p className="text-xs text-slate-400">No detailed findings recorded for this test</p>
                    </div>
                  )}

                  {/* Analyzer results (if any and different from main results) */}
                  {selectedNotif.labRequest.analyzerResults && selectedNotif.labRequest.analyzerResults !== selectedNotif.labRequest.results && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Analyzer Data {selectedNotif.labRequest.analyzerType ? `(${selectedNotif.labRequest.analyzerType}${selectedNotif.labRequest.analyzerModel ? ` - ${selectedNotif.labRequest.analyzerModel}` : ""})` : ""}</p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        {(() => {
                          try {
                            const parsed = JSON.parse(selectedNotif.labRequest.analyzerResults);
                            if (Array.isArray(parsed)) {
                              return (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      {Object.keys(parsed[0] || {}).map((key) => (
                                        <th key={key} className="text-left px-2 py-1 text-[10px] text-gray-500 font-semibold uppercase">{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsed.map((row: any, i: number) => (
                                      <tr key={i} className="border-b border-gray-100 last:border-0">
                                        {Object.values(row).map((val: any, j: number) => (
                                          <td key={j} className="px-2 py-1 text-gray-700">{String(val ?? "")}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              );
                            }
                          } catch {}
                          return <p className="text-xs text-gray-700 whitespace-pre-wrap">{selectedNotif.labRequest.analyzerResults}</p>;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedNotif.labRequest.attachments.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Attachments ({selectedNotif.labRequest.attachments.length})</p>
                      <div className="space-y-1.5">
                        {selectedNotif.labRequest.attachments.map((att: any, i: number) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors text-xs"
                          >
                            <FileText size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="flex-1 min-w-0 truncate text-slate-700 font-medium">{att.name || att.url?.split("/").pop() || "Attachment"}</span>
                            <ExternalLink size={10} className="text-blue-500 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical notes */}
                  {selectedNotif.labRequest.clinicalNotes && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Clinical Notes</p>
                      <p className="text-xs text-slate-600 bg-yellow-50 border border-yellow-100 rounded-lg p-2.5">
                        {selectedNotif.labRequest.clinicalNotes}
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Entered by: {selectedNotif.labRequest.enteredByName || "N/A"}</span>
                      <span>{selectedNotif.labRequest.resultEnteredAt ? formatTime(selectedNotif.labRequest.resultEnteredAt) : ""}</span>
                    </div>
                    {selectedNotif.labRequest.validatedByName && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Validated by: {selectedNotif.labRequest.validatedByName}</span>
                        <span>{selectedNotif.labRequest.validatedAt ? formatTime(selectedNotif.labRequest.validatedAt) : ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Open patient button */}
                  {selectedNotif.patientId && (
                    <button
                      onClick={(e) => handleViewPatient(e, selectedNotif.patientId!)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00803F]/10 text-[#00803F] text-xs font-bold hover:bg-[#00803F]/20 transition-colors"
                    >
                      <ExternalLink size={12} /> Open Patient Record
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: "calc(460px - 52px)" }}>
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-slate-300">
                    <RefreshCw size={20} className="animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Bell size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="font-semibold text-slate-500">No notifications</p>
                    <p className="text-[11px] mt-1 text-slate-400">Updates and alerts will appear here</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = NOTIF_ICONS[n.type] || Bell;
                    const colorClass = NOTIF_COLORS[n.type] || NOTIF_COLORS.GENERAL;
                    const hasLabData = !!(n.labRequest && (n.type === "RESULT_SHARED" || n.type === "RESULT_READY" || n.type === "CRITICAL_RESULT"));
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition hover:bg-slate-50 active:bg-slate-100 ${
                          !n.isRead ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              !n.isRead ? "bg-[#00803F]/10" : "bg-slate-100"
                            }`}
                          >
                            <Icon
                              size={15}
                              className={!n.isRead ? "text-[#00803F]" : "text-slate-400"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-xs font-semibold truncate ${
                                  !n.isRead ? "text-slate-800" : "text-slate-500"
                                }`}
                              >
                                {n.title}
                              </p>
                              <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                {formatTime(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  !n.isRead
                                    ? "bg-[#00803F]/10 text-[#00803F]"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {n.type.replace(/_/g, " ")}
                              </span>
                              {hasLabData && (
                                <span className="text-[8px] bg-white border border-[#00803F] text-[#00803F] px-1.5 py-0.5 rounded-full font-bold">
                                  View Results
                                </span>
                              )}
                              {n.patientId && (
                                <button
                                  onClick={(e) => handleViewPatient(e, n.patientId!)}
                                  className="text-[9px] text-blue-600 font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                                >
                                  <ExternalLink size={9} /> View Patient
                                </button>
                              )}
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00803F] animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
