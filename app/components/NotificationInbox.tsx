"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, XCircle, CheckCircle, MessageSquare, FlaskConical, Send, AlertTriangle, RefreshCw, FileText, ExternalLink } from "lucide-react";

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
    if (onNotificationClick) {
      onNotificationClick(n);
    } else if (n.patientId) {
      // Navigate to a relevant page based on notification type
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
      <button
        onClick={() => setIsOpen(!isOpen)}
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
                <Bell size={15} className="text-white/90" />
                <span className="font-bold text-xs text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="bg-white/25 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
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

            {/* List */}
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
          </div>
        </>
      )}
    </div>
  );
}
