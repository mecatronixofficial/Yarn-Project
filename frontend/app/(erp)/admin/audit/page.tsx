"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
type A = {
  id: string;
  action: string;
  module: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  actor?: { name: string; email: string };
};
export default function Audit() {
  const [rows, setRows] = useState<A[]>([]);
  useEffect(() => {
    api<A[]>("/admin/audit-logs").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<A>[]>(
    () => [
      {
        header: "Time",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      { header: "User", accessorFn: (r) => r.actor?.name || "System" },
      { header: "Action", accessorKey: "action" },
      { header: "Module", accessorKey: "module" },
      { header: "Entity", accessorKey: "entity" },
      { header: "Entity ID", accessorKey: "entityId" },
    ],
    [],
  );
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Audit Logs</h2>
        <p className="text-sm text-gray-500">
          Critical business and security actions are retained for traceability.
        </p>
      </CardHeader>
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
