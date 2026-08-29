"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { kg } from "@/lib/utils";
type M = {
  id: string;
  code: string;
  name: string;
  department: string;
  type?: string;
  capacityKg?: string;
  status: string;
  operator?: { name: string };
};
export default function Machines() {
  const [rows, setRows] = useState<M[]>([]);
  useEffect(() => {
    api<M[]>("/masters/machines").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<M>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Machine", accessorKey: "name" },
      { header: "Department", accessorKey: "department" },
      {
        header: "Capacity",
        cell: ({ row }) =>
          row.original.capacityKg ? kg(row.original.capacityKg) : "-",
      },
      { header: "Operator", accessorFn: (r) => r.operator?.name || "-" },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.status === "RUNNING"
                ? "success"
                : row.original.status === "BREAKDOWN"
                  ? "danger"
                  : "warning"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [],
  );
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Machines</h2>
        <p className="text-sm text-gray-500">
          Production capacity, operator and machine status.
        </p>
      </CardHeader>
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
