"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
type D = {
  id: string;
  dispatchNo: string;
  status: string;
  totalWeightKg: string;
  vehicle?: string;
  transporter?: string;
  salesOrder: { orderNo: string; customer: { name: string } };
  deliveries: Array<{ receivedKg: string }>;
};
export default function Dispatch() {
  const [rows, setRows] = useState<D[]>([]);
  useEffect(() => {
    api<D[]>("/dispatch").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<D>[]>(
    () => [
      { header: "Dispatch", accessorKey: "dispatchNo" },
      { header: "Order", accessorFn: (r) => r.salesOrder.orderNo },
      { header: "Customer", accessorFn: (r) => r.salesOrder.customer.name },
      { header: "Weight", cell: ({ row }) => kg(row.original.totalWeightKg) },
      { header: "Transport", accessorFn: (r) => r.transporter || "-" },
      { header: "Vehicle", accessorFn: (r) => r.vehicle || "-" },
      {
        header: "Received",
        cell: ({ row }) =>
          kg(
            row.original.deliveries.reduce(
              (a, d) => a + Number(d.receivedKg),
              0,
            ),
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={row.original.status === "DELIVERED" ? "success" : "warning"}
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
        <h2 className="text-xl font-bold">Packing, Dispatch & Delivery</h2>
        <p className="text-sm text-gray-500">
          Only QC-approved finished rolls are eligible for packing and dispatch.
        </p>
      </CardHeader>
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
