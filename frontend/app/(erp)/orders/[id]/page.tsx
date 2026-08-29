"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [trace, setTrace] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      api<any>(`/orders/${id}`),
      api<any>(`/orders/${id}/traceability`),
    ]).then(([o, t]) => {
      setOrder(o);
      setTrace(t.data);
    });
  }, [id]);
  if (!order || !trace) return <Loading />;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {order.orderNo}
              </p>
              <h2 className="mt-1 text-2xl font-bold">{order.customer.name}</h2>
            </div>
            <Badge tone="warning">{order.status.replaceAll("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Ordered</p>
              <p className="mt-1 text-xl font-bold">{kg(trace.orderedKg)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Delivered</p>
              <p className="mt-1 text-xl font-bold">{kg(trace.deliveredKg)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Order Pending</p>
              <p className="mt-1 text-xl font-bold">
                {kg(trace.orderPendingKg)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-blue-700">Ready to Dispatch</p>
              <p className="mt-1 text-xl font-bold">
                {kg(trace.readyPendingDeliveryKg)}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-xs text-red-700">Production Shortfall</p>
              <p className="mt-1 text-xl font-bold">
                {kg(trace.productionShortfallKg)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {trace.stages.map((p: any) => (
        <Card key={p.productionNo}>
          <CardHeader>
            <h3 className="font-bold">{p.productionNo} — Production Balance</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="p-4">Stage</th>
                    <th className="p-4">Input</th>
                    <th className="p-4">Output</th>
                    <th className="p-4">Waste / Loss</th>
                    <th className="p-4">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {p.rows.map((r: any) => (
                    <tr key={r.stage}>
                      <td className="p-4 font-semibold">{r.stage}</td>
                      <td className="p-4">{kg(r.input)}</td>
                      <td className="p-4">{kg(r.output)}</td>
                      <td className="p-4 text-red-600">{kg(r.waste)}</td>
                      <td
                        className={`p-4 font-bold ${Math.abs(r.balance) > 0.01 ? "text-amber-600" : "text-emerald-700"}`}
                      >
                        {kg(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
