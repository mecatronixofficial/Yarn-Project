"use client";
import { useEffect, useState } from "react";
import {
  Boxes,
  Factory,
  PackageCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";
import { ProductionChart } from "@/components/production-chart";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
const stageTone = (s: string) =>
  s.includes("COMPLETED")
    ? "success"
    : s.includes("HOLD") || s.includes("REJECT")
      ? "danger"
      : "warning";
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === "WORKER") {
      router.replace("/worker");
      return;
    }
    api<{ data: DashboardData }>("/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [user]);
  if (!data && !error) return <Loading />;
  if (error)
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>;
  const k = data!.kpis;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a77a24]">
          Operations overview
        </p>
        <h2 className="mt-1 text-2xl font-bold">Production Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Live material and order balance across the textile process.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard
          title="Open Orders"
          value={String(k.openOrders || 0)}
          icon={ShoppingCart}
        />
        <KpiCard title="Yarn Stock" value={kg(k.YARN)} icon={Boxes} />
        <KpiCard title="Grey Fabric" value={kg(k.GREY_FABRIC)} icon={Factory} />
        <KpiCard
          title="Finished Stock"
          value={kg(k.FINISHED_FABRIC)}
          icon={PackageCheck}
        />
        <KpiCard
          title="Pending Dispatch"
          value={kg(k.pendingDispatchKg)}
          icon={Truck}
        />
        <KpiCard title="Waste Today" value={kg(k.wasteTodayKg)} icon={Trash2} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <CardHeader>
            <h3 className="font-bold">7-day Production Trend</h3>
            <p className="text-xs text-gray-500">
              Demo chart; connect to time-series report endpoint for production
              use.
            </p>
          </CardHeader>
          <CardContent>
            <ProductionChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-bold">Factory Status</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Running Machines</p>
                <p className="mt-1 text-2xl font-bold">
                  {data!.machines.RUNNING || 0}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-600">Idle Machines</p>
                <p className="mt-1 text-2xl font-bold">
                  {data!.machines.IDLE || 0}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs text-amber-700">Maintenance</p>
                <p className="mt-1 text-2xl font-bold">
                  {data!.machines.MAINTENANCE || 0}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs text-blue-700">Workers Active</p>
                <p className="mt-1 text-2xl font-bold">
                  {k.workersActive || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Active Production Orders</h3>
              <p className="text-xs text-gray-500">
                Current customer jobs and factory stage.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">Production</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Fabric</th>
                  <th className="p-4">Color</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data!.activeProduction.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-semibold">{p.productionNo}</td>
                    <td className="p-4">{p.orderNo}</td>
                    <td className="p-4">{p.customer}</td>
                    <td className="p-4">{p.fabric}</td>
                    <td className="p-4">{p.color}</td>
                    <td className="p-4">{kg(p.qtyKg)}</td>
                    <td className="p-4">
                      <Badge tone={stageTone(p.status) as any}>
                        {p.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
