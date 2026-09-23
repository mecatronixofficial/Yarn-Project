"use client";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
type NotificationRow = { isRead: boolean };
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      api<NotificationRow[]>("/notifications", { silent: true })
        .then((rows) => {
          if (!cancelled) setUnread(rows.filter((row) => !row.isRead).length);
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);
  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";
  return (
    <header className="app-topbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200/70 bg-white/90 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenu}
        className="app-topbar-burger grid h-10 w-10 place-items-center rounded-xl border border-gray-200 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="app-topbar-brand flex min-w-0 items-center gap-2.5 lg:hidden">
        <span className="app-topbar-icon">
          <img src={BRAND.logo} alt={BRAND.name} className="h-full w-full rounded-[10px] object-cover" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold leading-tight md:text-[15px]">
            {BRAND.name}
          </h1>
          <p className="hidden truncate text-[11px] text-gray-500 sm:block">
            {BRAND.tagline}
          </p>
        </div>
      </div>
      <p className="hidden truncate text-[13px] font-semibold text-gray-500 lg:block">
        Order → Yarn → Knitting → Dyeing → QC → Delivery
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/notifications"
          className="app-topbar-action app-topbar-bell relative grid h-10 w-10 place-items-center rounded-xl"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="app-topbar-bell-badge">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <div className="app-topbar-user hidden items-center gap-2.5 md:flex">
          <span className="app-topbar-avatar">{initials}</span>
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-[11px] text-gray-500">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="app-topbar-action"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
