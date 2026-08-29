"use client";
import { useEffect, useState } from "react";
import { ReceiptIndianRupee, TrendingDown, WalletCards } from "lucide-react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
export default function Finance() {
  const [s, setS] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  useEffect(() => {
    api("/finance/summary").then(setS);
    api<any[]>("/finance/expenses").then(setExpenses);
  }, []);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Finance Overview</h2>
        <p className="text-sm text-gray-500">
          Invoices, collections and operational expenses.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          title="Invoiced"
          value={money(s?.invoiced)}
          icon={ReceiptIndianRupee}
        />
        <KpiCard
          title="Received"
          value={money(s?.received)}
          icon={WalletCards}
        />
        <KpiCard
          title="Outstanding"
          value={money(s?.outstanding)}
          icon={ReceiptIndianRupee}
        />
        <KpiCard
          title="Expenses"
          value={money(s?.expenses)}
          icon={TrendingDown}
        />
      </div>
      <Card>
        <CardHeader>
          <h3 className="font-bold">Recent Expenses</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="p-4 font-semibold">{e.expenseNo}</td>
                    <td className="p-4">{e.category}</td>
                    <td className="p-4">{e.description}</td>
                    <td className="p-4">{e.paymentMode}</td>
                    <td className="p-4 font-semibold">{money(e.amount)}</td>
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
