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
type S = {
  id: string;
  code: string;
  name: string;
  company?: string;
  mobile?: string;
  materialCategory?: string;
  paymentTerms?: string;
};
const blankForm = {
  code: "",
  name: "",
  company: "",
  mobile: "",
  materialCategory: "Yarn / Cotton",
  paymentTerms: "30 Days",
};
export default function Suppliers() {
  const [rows, setRows] = useState<S[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(blankForm);
  const { message, run } = useApiAction();
  const load = () => api<S[]>("/masters/suppliers").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const startAdd = () => {
    setEditingId(null);
    setForm(blankForm);
    setShow(true);
  };
  const startEdit = (row: S) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      company: row.company || "",
      mobile: row.mobile || "",
      materialCategory: row.materialCategory || "",
      paymentTerms: row.paymentTerms || "",
    });
    setShow(true);
  };
  const closePanel = () => {
    setShow(false);
    setEditingId(null);
    setForm(blankForm);
  };
  const remove = async (row: S) => {
    if (!confirm(`Delete supplier "${row.name}"?`)) return;
    const ok = await run(
      () => api(`/masters/suppliers/${row.id}`, { method: "DELETE" }),
      `${row.name} deleted.`,
    );
    if (ok) load();
  };
  const cols = useMemo<ColumnDef<S>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { header: "Code", accessorKey: "code" },
      { header: "Supplier", accessorKey: "name" },
      { header: "Company", accessorKey: "company" },
      { header: "Mobile", accessorKey: "mobile" },
      { header: "Material", accessorKey: "materialCategory" },
      { header: "Terms", accessorKey: "paymentTerms" },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="suppliers-row-actions flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="suppliers-row-action suppliers-row-action--edit"
              onClick={() => startEdit(row.original)}
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="suppliers-row-action suppliers-row-action--delete"
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
    const successMessage = editingId ? "Supplier updated." : "Supplier created.";
    const ok = await run(
      () => editingId
        ? api(`/masters/suppliers/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(form),
          })
        : api("/masters/suppliers", {
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
    <div className="suppliers-list-page">
      <div className="suppliers-list-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Suppliers</h2>
          <p className="text-sm text-gray-500">
            Yarn, cotton, chemicals and consumable suppliers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="suppliers-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search supplier, code or material..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button className="suppliers-add-btn" onClick={startAdd}>
            <Plus size={16} />
            Add Supplier
          </Button>
        </div>
      </div>
      <InlineMessage message={message} />
      {show && (
        <div className="suppliers-add-panel">
          <div className="suppliers-add-panel__header">
            <h3>{editingId ? "Edit Supplier" : "Add Supplier"}</h3>
            <button
              type="button"
              className="suppliers-add-panel__close"
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
              <Button className="suppliers-save-btn w-full" onClick={save}>
                {editingId ? "Update Supplier" : "Save Supplier"}
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
