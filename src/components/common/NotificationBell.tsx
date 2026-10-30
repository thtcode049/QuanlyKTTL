"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ClipboardList,
  AlertCircle,
  Award,
  Sparkles,
  ExternalLink,
  X,
} from "lucide-react";
import { dataStore, NotificationData, resolveCanonicalCoachId } from "@/lib/data-store";

interface NotificationBellProps {
  currentUserId?: string;
  userRole?: "ADMIN" | "COACH";
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUserId, userRole }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    let uid = currentUserId;
    if (!uid) {
      try {
        const stored = localStorage.getItem("kttll_user");
        if (stored) {
          const u = JSON.parse(stored);
          uid = u.id || u.email;
        }
      } catch (e) {}
    }

    const list = dataStore.getUserNotifications(uid);
    setNotifications([...list]);
    const unread = list.filter((n) => !n.isRead).length;
    setUnreadCount(unread);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    dataStore.markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    let uid = currentUserId;
    if (!uid) {
      try {
        const stored = localStorage.getItem("kttll_user");
        if (stored) {
          const u = JSON.parse(stored);
          uid = u.id || u.email;
        }
      } catch (e) {}
    }
    dataStore.markAllNotificationsAsRead(uid);
    loadNotifications();
  };

  const handleNotificationClick = (notif: NotificationData) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 1) return "Vừa xong";
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return "Hôm qua";
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } catch (e) {
      return "Gần đây";
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <ClipboardList className="h-4 w-4 text-blue-600" />;
      case "TASK_SUBMITTED":
        return <CheckCircle2 className="h-4 w-4 text-amber-600" />;
      case "TASK_APPROVED":
        return <Award className="h-4 w-4 text-emerald-600" />;
      case "TASK_REJECTED":
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      default:
        return <Sparkles className="h-4 w-4 text-brand-primary" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "bg-blue-50 border-blue-100";
      case "TASK_SUBMITTED":
        return "bg-amber-50 border-amber-100";
      case "TASK_APPROVED":
        return "bg-emerald-50 border-emerald-100";
      case "TASK_REJECTED":
        return "bg-rose-50 border-rose-100";
      default:
        return "bg-brand-primary/10 border-brand-primary/20";
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-9 w-9 items-center justify-center rounded transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-brand-primary/10 text-brand-primary shadow-xs"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:scale-95"
        }`}
        title="Thông báo hệ thống"
        aria-label="Thông báo"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-200/90 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Thông Báo
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:text-brand-primary-hover transition-colors cursor-pointer"
                  title="Đã đọc tất cả"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Đọc hết</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-700">Không có thông báo nào</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Các thông báo nhiệm vụ và cập nhật mới sẽ hiển thị tại đây
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                    !notif.isRead ? "bg-emerald-50/30" : ""
                  }`}
                >
                  {/* Icon badge */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border ${getNotifBg(
                      notif.type
                    )}`}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${!notif.isRead ? "text-slate-900" : "text-slate-700"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      {notif.link && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-primary">
                          <span>Xem chi tiết</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="ml-auto text-[10px] font-semibold text-slate-400 hover:text-slate-700 underline"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(userRole === "ADMIN" ? "/admin/tasks" : "/coach/tasks");
              }}
              className="text-[11px] font-bold text-slate-600 hover:text-brand-primary transition-colors"
            >
              Xem tất cả Nhiệm vụ & KPI →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
