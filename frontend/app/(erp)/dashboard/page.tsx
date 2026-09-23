"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Factory,
  Gauge,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, kg } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/loading";
import { ProductionChart } from "@/components/production-chart";
import { QualityDonut } from "@/components/quality-donut";
import { useAuth } from "@/components/auth-provider";

const stageTone = (status: string): "success" | "danger" | "warning" | "info" =>
  status.includes("COMPLETED")
    ? "success"
    : status.includes("HOLD") || status.includes("REJECT")
      ? "danger"
      : status.includes("RUNNING") || status.includes("QC")
        ? "info"
        : "warning";

const priorityTone = (priority: string) =>
  priority === "HIGH" || priority === "URGENT" ? "text-rose-600" : "text-gray-500";

const relativeDueDate = (value: string | null) => {
  if (!value) return "No due date";
  const due = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function DashboardStatTile({
  title,
  value,
  caption,
  icon: Icon,
  tone = "green",
}: {
  title: string;
  value: string;
  caption?: string;
  icon: typeof AlertTriangle;
  tone?: "green" | "gold" | "blue" | "rose";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    gold: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="dashboard-stat-tile p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-[-.03em] text-gray-800">{value}</p>
          {caption && <p className="mt-1 truncate text-[10px] text-gray-400">{caption}</p>}
        </div>
        <div className={cn("dashboard-stat-icon h-10 w-10 shrink-0", tones[tone])}><Icon size={17} /></div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a24]">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-[#183b32]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError("");
    try {
      const response = await api<{ data: DashboardData }>("/dashboard");
      setData(response.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard could not be loaded");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "WORKER") {
      router.replace("/worker");
      return;
    }
    if (user) void load();
  }, [load, router, user]);

  const summary = useMemo(() => {
    if (!data) return null;
    const machineTotal = Object.values(data.machines).reduce((sum, count) => sum + count, 0);
    const running = data.machines.RUNNING || 0;
    return {
      machineTotal,
      running,
      utilization: machineTotal ? Math.round((running / machineTotal) * 100) : 0,
      pipelineTotal: data.pipeline.reduce((sum, stage) => sum + stage.count, 0),
    };
  }, [data]);

  if (!data && !error) return <Loading />;
  if (!data && error) {
    return (
      <Card className="mx-auto mt-16 max-w-lg p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </div>
        <h2 className="mt-4 text-lg font-bold">Dashboard unavailable</h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <Button className="mt-5" onClick={() => void load(true)}>
          <RefreshCw size={15} /> Retry
        </Button>
      </Card>
    );
  }

  const dashboard = data!;
  const k = dashboard.kpis;
  const s = summary!;

  return (
    <div className="dashboard-page mx-auto max-w-[1800px] space-y-6 pb-8">
      <section className="dashboard-hero overflow-hidden rounded-[20px] p-3.5 text-white md:p-4">
        <div className="relative z-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="dashboard-hero__monogram"><Gauge size={19} /></div>
            <div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-white/55">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Factory command centre
              </div>
              <h2 className="mt-1 text-xl font-black tracking-[-.03em] md:text-2xl">
                {greeting()}, {user?.name.split(" ")[0]}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[.06] px-3 py-2 backdrop-blur">
              <p className="text-[8px] font-bold uppercase tracking-[.14em] text-white/40">Last updated</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/85">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(dashboard.generatedAt))}
              </p>
            </div>
            <Button
              size="sm"
              className="border border-white/15 bg-white/10 text-white hover:bg-white/15"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh data
            </Button>
          </div>
        </div>
        <div className="dashboard-hero__meta relative z-10 mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["Overdue jobs", k.overdueOrders, AlertTriangle, k.overdueOrders ? "text-rose-300" : "text-emerald-300"],
            ["Due next 7 days", k.dueSoonOrders, CalendarClock, "text-amber-200"],
            ["Workers active", k.workersActive, Users, "text-sky-200"],
            ["Open maintenance", k.openMaintenance, Wrench, k.openMaintenance ? "text-rose-300" : "text-emerald-300"],
          ] as const).map(([label, value, Icon, tone]) => {
            const MetricIcon = Icon as typeof AlertTriangle;
            return (
              <div key={String(label)}>
                <div className="dashboard-hero-chip-icon"><MetricIcon size={16} className={String(tone)} /></div>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</p>
                  <p className="mt-0.5 text-base font-bold">{String(value || 0).padStart(2, "0")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{error}. Showing the last successfully loaded data.</span>
          <button className="font-bold" onClick={() => void load(true)}>Retry</button>
        </div>
      )}

      <section>
        <SectionTitle eyebrow="Core performance" title="Today at a glance" />
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatTile
            title="Open orders"
            value={String(k.openOrders || 0)}
            caption={`${k.activeProduction || 0} production jobs active`}
            icon={ShoppingCart}
          />
          <DashboardStatTile
            title="Finished stock"
            value={kg(k.FINISHED_FABRIC)}
            caption="QC-approved inventory"
            icon={PackageCheck}
            tone="gold"
          />
          <DashboardStatTile
            title="Ready to dispatch"
            value={kg(k.readyDispatchKg)}
            caption={`${k.readyDispatches || 0} consignments waiting`}
            icon={Truck}
            tone="blue"
          />
          <DashboardStatTile
            title="Waste today"
            value={kg(k.wasteTodayKg)}
            caption="Across recorded processes"
            icon={Trash2}
            tone="rose"
          />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.5fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow="Actual output" title="7-day production flow" />
            <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#236b59]" />Yarn</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#d3a64c]" />Knitting</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#4f7cac]" />Dyeing</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ProductionChart data={dashboard.productionTrend} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <SectionTitle eyebrow="Order movement" title="Fulfilment pipeline" />
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center justify-between overflow-hidden rounded-2xl bg-[#1b3c55] p-4 text-white">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/45">Orders in motion</p>
                <div className="mt-1 flex items-end gap-2">
                  <strong className="text-3xl font-bold tracking-[-.05em]">{s.pipelineTotal}</strong>
                  <span className="pb-1 text-[11px] text-white/45">active orders</span>
                </div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[#f0ce79]">
                <ShoppingCart size={20} />
              </div>
            </div>

            <div>
              {dashboard.pipeline.map((stage, index) => {
                const styles = [
                  { icon: CheckCircle2, iconClass: "bg-amber-100 text-amber-700", cardClass: "border-amber-100 bg-amber-50/55", description: "Approved customer orders" },
                  { icon: Factory, iconClass: "bg-emerald-100 text-emerald-700", cardClass: "border-emerald-100 bg-emerald-50/55", description: "On the production floor" },
                  { icon: PackageCheck, iconClass: "bg-blue-100 text-blue-700", cardClass: "border-blue-100 bg-blue-50/55", description: "Packed and awaiting vehicle" },
                  { icon: Truck, iconClass: "bg-violet-100 text-violet-700", cardClass: "border-violet-100 bg-violet-50/55", description: "Moving toward delivery" },
                ] as const;
                const meta = styles[index] || styles[0];
                const StageIcon = meta.icon;
                return (
                  <div key={stage.key} className="group flex gap-3">
                    <div className="flex w-10 shrink-0 flex-col items-center">
                      <div className={cn("dashboard-stat-icon relative z-10 h-10 w-10 ring-4 ring-white transition-transform group-hover:scale-105", meta.iconClass)}>
                        <StageIcon size={17} />
                      </div>
                      {index < dashboard.pipeline.length - 1 && <div className="-my-1 min-h-4 flex-1 border-l-2 border-dashed border-gray-200" />}
                    </div>
                    <div className={cn("mb-3 flex min-w-0 flex-1 items-center justify-between rounded-2xl border px-3.5 py-3 transition group-hover:translate-x-0.5", meta.cardClass)}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-extrabold uppercase tracking-[.14em] text-gray-400">Stage {index + 1}</span>
                          {stage.count > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
                        </div>
                        <p className="mt-1 truncate text-sm font-bold text-gray-800">{stage.label}</p>
                        <p className="mt-0.5 truncate text-[10px] text-gray-500">{meta.description}</p>
                      </div>
                      <div className="ml-3 grid h-11 min-w-11 place-items-center rounded-xl bg-white px-2 text-lg font-bold text-[#1b3c55] shadow-sm">
                        {stage.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/orders" className="flex items-center justify-between rounded-xl bg-[#f1f6f4] px-4 py-3 text-xs font-bold text-[#1d5b4b] transition hover:bg-[#e7f0ec]">
              Open sales order control
              <ArrowRight size={15} />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader>
            <SectionTitle eyebrow="Stock position" title="Material on hand" action={<Link href="/inventory" className="text-xs font-bold text-[#266956]">Inventory <ArrowRight className="ml-1 inline" size={13} /></Link>} />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 2xl:grid-cols-1">
            {([
              ["Yarn", k.YARN, Boxes, "bg-emerald-50 text-emerald-700"],
              ["Grey fabric", k.GREY_FABRIC, Factory, "bg-slate-100 text-slate-700"],
              ["Raw material", k.RAW_MATERIAL, Gauge, "bg-amber-50 text-amber-700"],
            ] as const).map(([label, value, Icon, tone]) => {
              const StockIcon = Icon as typeof Boxes;
              return (
                <div key={String(label)} className="dashboard-stat-tile flex items-center gap-3 p-3.5">
                  <div className={cn("dashboard-stat-icon h-10 w-10 shrink-0", String(tone))}><StockIcon size={17} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="mt-1 truncate text-base font-bold text-gray-800">{kg(Number(value))}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <SectionTitle eyebrow="Factory health" title="Machines & workforce" action={<Link href="/masters/machines" className="text-xs font-bold text-[#266956]">Machines <ArrowRight className="ml-1 inline" size={13} /></Link>} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5 rounded-2xl bg-[#1b3c55] p-4 text-white">
              <div className="dashboard-ring h-20 w-20 shrink-0" style={{ background: `conic-gradient(#d3a64c ${s.utilization * 3.6}deg, rgba(255,255,255,.14) 0deg)` }}>
                <span className="text-xl font-bold">{s.utilization}%</span>
              </div>
              <div>
                <p className="text-xs text-white/50">Machine availability</p>
                <p className="mt-1 text-xl font-bold">{s.running} of {s.machineTotal} running</p>
                <p className="mt-1 text-[11px] text-white/45">{k.workersActive || 0} active production workers</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {([
                ["Idle", dashboard.machines.IDLE || 0, "text-gray-700"],
                ["Maintenance", dashboard.machines.MAINTENANCE || 0, "text-amber-700"],
                ["Breakdown", dashboard.machines.BREAKDOWN || 0, "text-rose-700"],
              ] as const).map(([label, value, tone]) => (
                <div key={String(label)} className="rounded-xl bg-gray-50 px-2 py-3">
                  <p className={cn("text-lg font-bold", String(tone))}>{value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden lg:col-span-2 2xl:col-span-1">
          <CardHeader>
            <SectionTitle eyebrow="Quality pulse" title="Inspection outcome" action={<Link href="/quality" className="text-xs font-bold text-[#266956]">Quality <ArrowRight className="ml-1 inline" size={13} /></Link>} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <QualityDonut approvedKg={dashboard.quality.approvedKg} reworkKg={dashboard.quality.reworkKg} rejectedKg={dashboard.quality.rejectedKg} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="dashboard-stat-tile flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-800"><CheckCircle2 size={13} className="text-emerald-600" />Approved</span>
                  <span className="text-xs font-bold text-emerald-900">{kg(dashboard.quality.approvedKg)}</span>
                </div>
                <div className="dashboard-stat-tile flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-amber-800"><CircleDot size={13} className="text-amber-600" />Rework</span>
                  <span className="text-xs font-bold text-amber-900">{kg(dashboard.quality.reworkKg)}</span>
                </div>
                <div className="dashboard-stat-tile flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-rose-800"><AlertTriangle size={13} className="text-rose-600" />Rejected</span>
                  <span className="text-xs font-bold text-rose-900">{kg(dashboard.quality.rejectedKg)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.45fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <SectionTitle
              eyebrow="Shop floor"
              title="Active production orders"
              action={<Link href="/production" className="text-xs font-bold text-[#266956]">Production control <ArrowRight className="ml-1 inline" size={13} /></Link>}
            />
          </CardHeader>
          <CardContent className="p-0">
            {dashboard.activeProduction.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={22} /></div>
                <p className="mt-3 font-bold">No production jobs are currently active</p>
                <p className="mt-1 text-sm text-gray-500">Confirmed jobs will appear here when production is planned.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-[#f7f9f8] text-left text-[10px] font-bold uppercase tracking-[.1em] text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Production job</th>
                      <th className="px-5 py-3">Customer / fabric</th>
                      <th className="px-5 py-3">Progress</th>
                      <th className="px-5 py-3">Due date</th>
                      <th className="px-5 py-3">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboard.activeProduction.map((production) => {
                      const dueText = relativeDueDate(production.dueDate);
                      const overdue = dueText.includes("overdue") || dueText === "Due today";
                      return (
                        <tr key={production.id} className="transition hover:bg-[#fafcfb]">
                          <td className="px-5 py-4">
                            <Link href={`/orders/${production.salesOrderId}`} className="font-bold text-[#183b32] hover:underline">{production.productionNo}</Link>
                            <p className="mt-1 text-[11px] text-gray-400">{production.orderNo} · <span className={priorityTone(production.priority)}>{production.priority}</span></p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-700">{production.customer}</p>
                            <p className="mt-1 text-[11px] text-gray-400">{production.fabric} · {production.color}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-between text-[11px]"><span className="text-gray-500">{kg(production.outputKg)} / {kg(production.qtyKg)}</span><strong>{production.progressPct}%</strong></div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#3c6e91]" style={{ width: `${production.progressPct}%` }} /></div>
                          </td>
                          <td className="px-5 py-4">
                            <p className={cn("font-semibold", overdue ? "text-rose-600" : "text-gray-700")}>{dueText}</p>
                            {production.dueDate && <p className="mt-1 text-[11px] text-gray-400">{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(production.dueDate))}</p>}
                          </td>
                          <td className="px-5 py-4"><Badge tone={stageTone(production.status)}>{production.status.replaceAll("_", " ")}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <SectionTitle eyebrow="Needs attention" title="Operational alerts" action={<Link href="/notifications" className="relative text-gray-500"><BellRing size={17} />{k.unreadNotifications > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />}</Link>} />
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.alerts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                <p className="mt-3 text-sm font-bold">All clear</p>
                <p className="mt-1 text-xs text-gray-500">No unread operational alerts.</p>
              </div>
            ) : dashboard.alerts.map((alert) => (
              <div key={alert.id} className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
                <div className={cn("dashboard-stat-icon mt-0.5 h-8 w-8 shrink-0", alert.priority === "CRITICAL" || alert.priority === "HIGH" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                  {alert.priority === "CRITICAL" || alert.priority === "HIGH" ? <AlertTriangle size={15} /> : <CircleDot size={15} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-gray-800">{alert.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{alert.message}</p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">{alert.priority} · {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(alert.createdAt))}</p>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/dispatch" className="dashboard-stat-tile p-3 text-blue-800">
                <div className="dashboard-stat-icon h-8 w-8 bg-blue-100 text-blue-700"><Truck size={15} /></div>
                <p className="mt-2 text-lg font-bold">{k.inTransitDispatches || 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600">In transit</p>
              </Link>
              <Link href="/maintenance" className="dashboard-stat-tile p-3 text-amber-800">
                <div className="dashboard-stat-icon h-8 w-8 bg-amber-100 text-amber-700"><Wrench size={15} /></div>
                <p className="mt-2 text-lg font-bold">{k.openMaintenance || 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Open repairs</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
