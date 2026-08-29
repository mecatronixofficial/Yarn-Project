"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type C = {
  id: string;
  code: string;
  name: string;
  company?: string;
  mobile?: string;
  city?: string;
  state?: string;
  paymentTerms?: string;
};
export default function Customers() {
  const [rows, setRows] = useState<C[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    company: "",
    mobile: "",
    city: "",
    state: "Tamil Nadu",
  });
  const load = () => api<C[]>("/masters/customers").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const cols = useMemo<ColumnDef<C>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Customer", accessorKey: "name" },
      { header: "Company", accessorKey: "company" },
      { header: "Mobile", accessorKey: "mobile" },
      { header: "City", accessorKey: "city" },
      { header: "State", accessorKey: "state" },
    ],
    [],
  );
  const save = async () => {
    await api("/masters/customers", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setShow(false);
    setForm({
      code: "",
      name: "",
      company: "",
      mobile: "",
      city: "",
      state: "Tamil Nadu",
    });
    load();
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Customers</h2>
            <p className="text-sm text-gray-500">
              Order, delivery and receivable master.
            </p>
          </div>
          <Button onClick={() => setShow(!show)}>Add Customer</Button>
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
                Save Customer
              </Button>
            </div>
          </CardContent>
        )}
        <CardContent>
          <DataTable data={rows} columns={cols} />
        </CardContent>
      </Card>
    </div>
  );
}
