"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { kg } from "@/lib/utils";
export default function Quality() {
  const [a, setA] = useState<any>(null);
  useEffect(() => {
    api<any>("/production/approvals").then(setA);
  }, []);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Quality & Approval Center</h2>
        <p className="text-sm text-gray-500">
          QC uses stage inspections; production approval queues are surfaced
          here for control.
        </p>
      </CardHeader>
      <CardContent>
        {!a ? (
          <p>Loading...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-amber-50 p-5">
              <p className="text-xs text-amber-700">Yarn entries</p>
              <p className="mt-1 text-3xl font-bold">{a.yarn.length}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-5">
              <p className="text-xs text-amber-700">Knitting entries</p>
              <p className="mt-1 text-3xl font-bold">{a.knitting.length}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-5">
              <p className="text-xs text-amber-700">Dyeing entries</p>
              <p className="mt-1 text-3xl font-bold">{a.dyeing.length}</p>
            </div>
          </div>
        )}
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">
          <b>Final QC rule:</b> Input KG = Approved KG + Rejected KG + Rework
          KG. Only approved quantity can create finished-fabric stock.
        </div>
      </CardContent>
    </Card>
  );
}
