"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
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
import { BRAND } from "@/lib/brand";
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
          "app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="app-sidebar-brand flex h-16 items-center gap-2.5 px-4">
          <span className="app-sidebar-logo">
            <img src={BRAND.logo} alt={BRAND.name} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">{BRAND.name}</p>
            <p className="truncate text-[10px] text-white/50">{BRAND.tagline}</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden">
            <X size={18} />
          </button>
        </div>
        <nav className="app-sidebar-nav flex-1 overflow-y-auto p-2.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                onClick={onClose}
                key={href}
                href={href}
                className={cn(
                  "app-sidebar-link",
                  active ? "app-sidebar-link--active" : "",
                )}
              >
                <span className="app-sidebar-link-icon">
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar-footer">
          Input → Output → Waste → Balance
        </div>
      </aside>
    </>
  );
}
