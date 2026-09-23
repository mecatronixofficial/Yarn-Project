"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, subscribeToasts, ToastItem } from "@/lib/toast-store";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={`toast-card toast-card--${t.kind}`}
            role={t.kind === "error" || t.kind === "warning" ? "alert" : "status"}
            aria-live={t.kind === "error" || t.kind === "warning" ? "assertive" : "polite"}
            style={{ "--toast-duration": `${t.duration}ms` } as React.CSSProperties}
          >
            <span className="toast-icon">
              <Icon size={16} />
            </span>
            <div className="toast-body">
              {t.title && <p className="toast-title">{t.title}</p>}
              <p className="toast-message">{t.message}</p>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
            {t.duration > 0 && <span className="toast-progress" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
