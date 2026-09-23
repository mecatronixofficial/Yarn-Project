"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { BarChart3, Download, FileText, Search } from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { kg } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [filter, setFilter] = useState("");
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
      {
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const upper = status.toUpperCase();
          const tone = /COMPLETE|CLOSED|DELIVERED|APPROVED/.test(upper)
            ? "success"
            : /CANCEL|REJECT|HOLD/.test(upper)
              ? "danger"
              : "warning";
          return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
        },
      },
    ],
    [],
  );
  return (
    <div className="reports-page">
      <div className="reports-list-header flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="reports-page-icon">
            <BarChart3 size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold md:text-xl">Production Output Register</h2>
            <p className="text-xs text-gray-500">Export the same report to Excel or PDF.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="reports-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search production, customer, fabric..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="reports-action-btn reports-action-btn--outline"
              onClick={() =>
                download("/reports/production.xlsx", "production-report.xlsx")
              }
            >
              <Download size={16} />
              Excel
            </Button>
            <Button
              className="reports-action-btn"
              onClick={() =>
                download("/reports/production.pdf", "production-report.pdf")
              }
            >
              <FileText size={16} />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={cols}
        filter={filter}
        onFilterChange={setFilter}
        hideSearch
      />
    </div>
  );
}
