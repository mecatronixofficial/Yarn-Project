"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type S = {
  id: string;
  code: string;
  name: string;
  company?: string;
  mobile?: string;
  materialCategory?: string;
  paymentTerms?: string;
};
export default function Suppliers() {
  const [rows, setRows] = useState<S[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    company: "",
    mobile: "",
    materialCategory: "Yarn / Cotton",
    paymentTerms: "30 Days",
  });
  const load = () => api<S[]>("/masters/suppliers").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const cols = useMemo<ColumnDef<S>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Supplier", accessorKey: "name" },
      { header: "Company", accessorKey: "company" },
      { header: "Mobile", accessorKey: "mobile" },
      { header: "Material", accessorKey: "materialCategory" },
      { header: "Terms", accessorKey: "paymentTerms" },
    ],
    [],
  );
  const save = async () => {
    await api("/masters/suppliers", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setShow(false);
    load();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Suppliers</h2>
          <p className="text-sm text-gray-500">
            Yarn, cotton, chemicals and consumable suppliers.
          </p>
        </div>
        <Button onClick={() => setShow(!show)}>Add Supplier</Button>
      </CardHeader>
      {show && (
        <CardContent className="grid gap-3 border-b md:grid-cols-3">
          {Object.entries(form).map(([k, v]) => (
            <div key={k}>
              <label className="erp-label">{k}</label>
              <Input
                value={v}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="flex items-end">
            <Button className="w-full" onClick={save}>
              Save Supplier
            </Button>
          </div>
        </CardContent>
      )}
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
