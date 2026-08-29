"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Download, FileText } from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { kg } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
type R = {
  productionNo: string;
  orderNo: string;
  customer: string;
  fabric: string;
  color: string;
  plannedKg: number;
  yarnOutputKg: number;
  knittingOutputKg: number;
  dyeingOutputKg: number;
  qcApprovedKg: number;
  status: string;
};
export default function Reports() {
  const [rows, setRows] = useState<R[]>([]);
  useEffect(() => {
    api<R[]>("/reports/production").then(setRows);
  }, []);
  const download = async (path: string, name: string) => {
    const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const cols = useMemo<ColumnDef<R>[]>(
    () => [
      { header: "Production", accessorKey: "productionNo" },
      { header: "Customer", accessorKey: "customer" },
      { header: "Fabric", accessorKey: "fabric" },
      { header: "Planned", cell: ({ row }) => kg(row.original.plannedKg) },
      { header: "Yarn", cell: ({ row }) => kg(row.original.yarnOutputKg) },
      {
        header: "Knitting",
        cell: ({ row }) => kg(row.original.knittingOutputKg),
      },
      { header: "Dyeing", cell: ({ row }) => kg(row.original.dyeingOutputKg) },
      { header: "QC", cell: ({ row }) => kg(row.original.qcApprovedKg) },
      { header: "Status", accessorKey: "status" },
    ],
    [],
  );
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Production Reports</h2>
          <p className="text-sm text-gray-500">
            Export the same report to Excel or PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              download("/reports/production.xlsx", "production-report.xlsx")
            }
          >
            <Download size={16} />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              download("/reports/production.pdf", "production-report.pdf")
            }
          >
            <FileText size={16} />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
