"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
type B = {
  category: string;
  itemCode: string;
  itemName: string;
  lotNo?: string;
  quantityIn: number;
  quantityOut: number;
  balanceKg: number;
};
export default function Inventory() {
  const [cat, setCat] = useState("YARN");
  const [rows, setRows] = useState<B[]>([]);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    api<B[]>(`/inventory/balances?category=${cat}`).then(setRows);
  }, [cat]);
  const cols = useMemo<ColumnDef<B>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { header: "Item", accessorKey: "itemName" },
      { header: "Code", accessorKey: "itemCode" },
      { header: "Lot", accessorKey: "lotNo" },
      { header: "In", cell: ({ row }) => kg(row.original.quantityIn) },
      { header: "Out", cell: ({ row }) => kg(row.original.quantityOut) },
      {
        header: "Balance",
        cell: ({ row }) => (
          <b
            className={
              row.original.balanceKg < 0 ? "text-red-600" : "text-emerald-700"
            }
          >
            {kg(row.original.balanceKg)}
          </b>
        ),
      },
    ],
    [],
  );
  return (
    <div className="inventory-list-page">
      <div className="inventory-list-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Inventory Balance</h2>
          <p className="text-sm text-gray-500">
            Calculated from immutable stock transactions.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="inventory-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search item, code or lot..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="erp-label">Stock Category</label>
            <select
              className="erp-input min-w-52"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              <option>RAW_MATERIAL</option>
              <option>YARN</option>
              <option>GREY_FABRIC</option>
              <option>CHEMICAL</option>
              <option>FINISHED_FABRIC</option>
            </select>
          </div>
        </div>
      </div>
      <DataTable
        columns={cols}
        data={rows}
        filter={filter}
        onFilterChange={setFilter}
        hideSearch
      />
    </div>
  );
}
