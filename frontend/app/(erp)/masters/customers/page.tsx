"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useApiAction } from "@/lib/use-api-action";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
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
const blankForm = {
  code: "",
  name: "",
  company: "",
  mobile: "",
  city: "",
  state: "Tamil Nadu",
};
export default function Customers() {
  const [rows, setRows] = useState<C[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(blankForm);
  const { message, run } = useApiAction();
  const load = () => api<C[]>("/masters/customers").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const startAdd = () => {
    setEditingId(null);
    setForm(blankForm);
    setShow(true);
  };
  const startEdit = (row: C) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      company: row.company || "",
      mobile: row.mobile || "",
      city: row.city || "",
      state: row.state || "",
    });
    setShow(true);
  };
  const closePanel = () => {
    setShow(false);
    setEditingId(null);
    setForm(blankForm);
  };
  const remove = async (row: C) => {
    if (!confirm(`Delete customer "${row.name}"?`)) return;
    const ok = await run(
      () => api(`/masters/customers/${row.id}`, { method: "DELETE" }),
      `${row.name} deleted.`,
    );
    if (ok) load();
  };
  const cols = useMemo<ColumnDef<C>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { header: "Code", accessorKey: "code" },
      { header: "Customer", accessorKey: "name" },
      { header: "Company", accessorKey: "company" },
      { header: "Mobile", accessorKey: "mobile" },
      { header: "City", accessorKey: "city" },
      { header: "State", accessorKey: "state" },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="customers-row-actions flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="customers-row-action customers-row-action--edit"
              onClick={() => startEdit(row.original)}
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="customers-row-action customers-row-action--delete"
              onClick={() => remove(row.original)}
              aria-label={`Delete ${row.original.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );
  const save = async () => {
    const successMessage = editingId ? "Customer updated." : "Customer created.";
    const ok = await run(
      () => editingId
        ? api(`/masters/customers/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(form),
          })
        : api("/masters/customers", {
            method: "POST",
            body: JSON.stringify(form),
          }),
      successMessage,
    );
    if (ok) {
      closePanel();
      load();
    }
  };
  return (
    <div className="customers-list-page">
      <div className="customers-list-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-gray-500">
            Order, delivery and receivable master.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="customers-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search customer, code or city..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button className="customers-add-btn" onClick={startAdd}>
            <Plus size={16} />
            Add Customer
          </Button>
        </div>
      </div>
      <InlineMessage message={message} />
      {show && (
        <div className="customers-add-panel">
          <div className="customers-add-panel__header">
            <h3>{editingId ? "Edit Customer" : "Add Customer"}</h3>
            <button
              type="button"
              className="customers-add-panel__close"
              onClick={closePanel}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
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
              <Button className="customers-save-btn w-full" onClick={save}>
                {editingId ? "Update Customer" : "Save Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
