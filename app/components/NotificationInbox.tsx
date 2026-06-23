"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, XCircle, CheckCircle, MessageSquare, FlaskConical, Send, AlertTriangle, RefreshCw, FileText } from "lucide-react";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  referenceId: number | null;
  referenceType: string | null;
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
}: {
  department?: string;
  userId?: number;
  maxHeight?: string;
  showTitle?: boolean;
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
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#00703C] text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="hidden md:inline">Inbox</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#00703C]" />
                <span className="font-bold text-sm text-slate-700">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-[#00703C] hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-500">
                  <XCircle size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight }}
            >
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-slate-300">
                  <RefreshCw size={20} className="animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Bell size={32} className="mx-auto mb-2 text-slate-200" />
                  <p className="font-semibold">No notifications</p>
                  <p className="text-xs mt-1">Lab results shared with your department will appear here</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = NOTIF_ICONS[n.type] || Bell;
                  const colorClass = NOTIF_COLORS[n.type] || NOTIF_COLORS.GENERAL;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition hover:bg-slate-50 ${
                        !n.isRead ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            !n.isRead ? "bg-[#00703C]/10" : "bg-slate-100"
                          }`}
                        >
                          <Icon
                            size={15}
                            className={!n.isRead ? "text-[#00703C]" : "text-slate-400"}
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
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                !n.isRead
                                  ? "bg-[#00703C]/10 text-[#00703C]"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {n.type.replace(/_/g, " ")}
                            </span>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
