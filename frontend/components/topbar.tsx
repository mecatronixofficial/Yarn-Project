"use client";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <button
        onClick={onMenu}
        className="mr-3 grid h-10 w-10 place-items-center rounded-xl border lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div>
        <h1 className="text-base font-bold md:text-lg">
          Textile Production ERP
        </h1>
        <p className="hidden text-xs text-gray-500 sm:block">
          Order → Yarn → Knitting → Dyeing → QC → Delivery
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/notifications"
          className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100"
        >
          <Bell size={18} />
        </Link>
        <div className="hidden text-right md:block">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-[11px] text-gray-500">{user?.role}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
