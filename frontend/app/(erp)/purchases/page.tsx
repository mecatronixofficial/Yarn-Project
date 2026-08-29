"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/utils";
type P = {
  id: string;
  poNo: string;
  status: string;
  orderDate: string;
  supplier: { name: string };
  items: Array<{ quantity: string; rate: string; itemName: string }>;
};
export default function Purchases() {
  const [rows, setRows] = useState<P[]>([]);
  useEffect(() => {
    api<P[]>("/procurement/purchase-orders").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<P>[]>(
    () => [
      { header: "PO", accessorKey: "poNo" },
      { header: "Supplier", accessorFn: (r) => r.supplier.name },
      {
        header: "Items",
        accessorFn: (r) => r.items.map((i) => i.itemName).join(", "),
      },
      {
        header: "Value",
        cell: ({ row }) =>
          money(
            row.original.items.reduce(
              (a, i) => a + Number(i.quantity) * Number(i.rate),
              0,
            ),
          ),
      },
      {
        header: "Date",
        cell: ({ row }) =>
          new Date(row.original.orderDate).toLocaleDateString(),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={row.original.status === "RECEIVED" ? "success" : "warning"}
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
        <h2 className="text-xl font-bold">Purchase Orders</h2>
        <p className="text-sm text-gray-500">
          Material receipt API posts purchase inward directly to the stock
          ledger.
        </p>
      </CardHeader>
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
