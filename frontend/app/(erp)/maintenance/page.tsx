"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function Maintenance() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api<any[]>("/operations/maintenance").then(setRows);
  useEffect(() => {
    load();
  }, []);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Machine Maintenance</h2>
        <p className="text-sm text-gray-500">
          Breakdown and preventive maintenance history.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {r.machine.code} • {r.machine.name}
                </p>
                <Badge tone={r.endedAt ? "success" : "warning"}>
                  {r.endedAt ? "Completed" : "Open"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-600">{r.complaint}</p>
              <p className="mt-2 text-xs text-gray-400">
                Technician: {r.technician || "-"} • Cost: {money(r.cost || 0)}
              </p>
            </div>
            {!r.endedAt && (
              <Button
                variant="outline"
                onClick={async () => {
                  await api(`/operations/maintenance/${r.id}/complete`, {
                    method: "PATCH",
                    body: JSON.stringify({ resolution: "Completed from ERP" }),
                  });
                  load();
                }}
              >
                Mark Complete
              </Button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            No maintenance records yet. Create them through Swagger/API or
            extend this page with your factory form.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
