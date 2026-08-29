"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  Droplets,
  Factory,
  FileText,
  Gauge,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { useAuth } from "./auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const all: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Gauge,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  { href: "/worker", label: "My Work", icon: Factory, roles: ["WORKER"] },
  {
    href: "/orders",
    label: "Sales Orders",
    icon: ShoppingCart,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/production",
    label: "Production",
    icon: Factory,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Boxes,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/quality",
    label: "Quality Control",
    icon: ClipboardCheck,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/dispatch",
    label: "Packing & Delivery",
    icon: Truck,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/masters/customers",
    label: "Customers",
    icon: Users,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/masters/suppliers",
    label: "Suppliers",
    icon: PackageCheck,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/masters/machines",
    label: "Machines",
    icon: Wrench,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/purchases",
    label: "Purchases",
    icon: ShoppingCart,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/finance",
    label: "Finance",
    icon: FileText,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["SUPERADMIN", "MANAGER"],
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["SUPERADMIN", "MANAGER", "WORKER"],
  },
  {
    href: "/admin/users",
    label: "Users & Access",
    icon: ShieldCheck,
    roles: ["SUPERADMIN"],
  },
  {
    href: "/admin/audit",
    label: "Audit Logs",
    icon: FileText,
    roles: ["SUPERADMIN"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["SUPERADMIN"],
  },
];
export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const path = usePathname();
  const { user } = useAuth();
  const nav = user ? all.filter((i) => i.roles.includes(user.role)) : [];
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/35 lg:hidden",
          open ? "block" : "hidden",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#143b32] text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d3a64c] text-[#143b32]">
            <Droplets size={22} />
          </div>
          <div>
            <p className="font-bold">YarnFlow ERP</p>
            <p className="text-xs text-white/50">Textile Manufacturing</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden">
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              onClick={onClose}
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white",
                path === href || path.startsWith(href + "/")
                  ? "bg-[#d3a64c]/15 text-[#f1c86c]"
                  : "",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/45">
          Input → Output → Waste → Balance
        </div>
      </aside>
    </>
  );
}
