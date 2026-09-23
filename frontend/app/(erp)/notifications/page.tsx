"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, Inbox } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  isRead: boolean;
  createdAt: string;
};
export default function Notifications() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const load = () => api<NotificationRow[]>("/notifications").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const all = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH", silent: true });
      load();
    } catch {}
  };
  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH", silent: true });
      load();
    } catch {}
  };
  const unreadCount = useMemo(() => rows.filter((r) => !r.isRead).length, [rows]);
  const criticalCount = useMemo(
    () => rows.filter((r) => !r.isRead && (r.priority === "CRITICAL" || r.priority === "HIGH")).length,
    [rows],
  );
  return (
    <div className="notifications-page">
      <div className="notifications-list-header flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="notifications-page-icon">
            <Bell size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold md:text-xl">Notifications</h2>
            <p className="text-xs text-gray-500">
              Production, QC, stock, maintenance and delivery alerts.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="notifications-action-btn notifications-action-btn--outline"
          onClick={all}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={16} />
          Mark all read
        </Button>
      </div>

      <div className="notifications-stats grid gap-2.5 sm:grid-cols-3">
        <div className="notifications-stat-tile notifications-stat-tile--total">
          <div className="notifications-stat-icon">
            <Inbox size={15} />
          </div>
          <div>
            <p className="notifications-stat-label">Total</p>
            <p className="notifications-stat-value">{rows.length}</p>
          </div>
        </div>
        <div className="notifications-stat-tile notifications-stat-tile--unread">
          <div className="notifications-stat-icon">
            <Bell size={15} />
          </div>
          <div>
            <p className="notifications-stat-label">Unread</p>
            <p className="notifications-stat-value">{unreadCount}</p>
          </div>
        </div>
        <div className="notifications-stat-tile notifications-stat-tile--critical">
          <div className="notifications-stat-icon">
            <AlertTriangle size={15} />
          </div>
          <div>
            <p className="notifications-stat-label">High / Critical</p>
            <p className="notifications-stat-value">{criticalCount}</p>
          </div>
        </div>
      </div>

      <div className="notifications-list">
        {rows.map((n) => (
          <button
            onClick={() => markRead(n.id)}
            key={n.id}
            className={`notifications-row notifications-row--${n.priority.toLowerCase()} ${n.isRead ? "" : "notifications-row--unread"}`}
          >
            <span className="notifications-row-icon">
              <Bell size={15} />
            </span>
            <div className="notifications-row-body">
              <div className="notifications-row-heading">
                <p className="notifications-row-title">{n.title}</p>
                <Badge tone="info">{n.type.replaceAll("_", " ")}</Badge>
                <Badge
                  tone={
                    n.priority === "CRITICAL"
                      ? "danger"
                      : n.priority === "HIGH"
                        ? "warning"
                        : "default"
                  }
                >
                  {n.priority}
                </Badge>
                {!n.isRead && <span className="notifications-row-dot" />}
              </div>
              <p className="notifications-row-message">{n.message}</p>
              <p className="notifications-row-time">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="notifications-empty">
            <Inbox size={28} />
            <p>No notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
