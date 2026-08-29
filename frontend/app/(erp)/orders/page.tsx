"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { kg, money } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/loading";
type Order = {
  id: string;
  orderNo: string;
  status: string;
  expectedDelivery?: string;
  customer: { name: string };
  items: Array<{
    quantityKg: string;
    amount?: string;
    fabricType: string;
    color: string;
  }>;
  productionOrders: any[];
};
export default function Orders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  useEffect(() => {
    api<Order[]>("/orders").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order",
        accessorKey: "orderNo",
        cell: ({ row }) => (
          <Link
            className="font-semibold text-primary hover:underline"
            href={`/orders/${row.original.id}`}
          >
            {row.original.orderNo}
          </Link>
        ),
      },
      { header: "Customer", accessorFn: (r) => r.customer.name },
      {
        header: "Fabric",
        accessorFn: (r) => r.items.map((i) => i.fabricType).join(", "),
      },
      {
        header: "Color",
        accessorFn: (r) => r.items.map((i) => i.color).join(", "),
      },
      {
        header: "Qty",
        cell: ({ row }) =>
          kg(row.original.items.reduce((a, i) => a + Number(i.quantityKg), 0)),
      },
      {
        header: "Value",
        cell: ({ row }) =>
          money(
            row.original.items.reduce((a, i) => a + Number(i.amount || 0), 0),
          ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.status.includes("DELIVERED") ? "success" : "warning"
            }
          >
            {row.original.status.replaceAll("_", " ")}
          </Badge>
        ),
      },
    ],
    [],
  );
  if (!rows) return <Loading />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sales Orders</h2>
          <p className="text-sm text-gray-500">
            Customer demand connected to production orders.
          </p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus size={16} />
            New Order
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={cols}
          searchPlaceholder="Search order or customer..."
        />
      </CardContent>
    </Card>
  );
}
