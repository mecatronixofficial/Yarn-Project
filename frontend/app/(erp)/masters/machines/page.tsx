"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Factory,
  Pencil,
  Plus,
  PowerOff,
  Search,
  Trash2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApiAction } from "@/lib/use-api-action";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
import { kg } from "@/lib/utils";
type M = {
  id: string;
  code: string;
  name: string;
  department: string;
  type?: string;
  capacityKg?: string;
  manufacturer?: string;
  status: string;
  operator?: { name: string };
};
type Stats = {
  total: number;
  running: number;
  idle: number;
  maintenance: number;
  breakdown: number;
  disabled: number;
};
const blankStats: Stats = {
  total: 0,
  running: 0,
  idle: 0,
  maintenance: 0,
  breakdown: 0,
  disabled: 0,
};
const statuses = ["RUNNING", "IDLE", "MAINTENANCE", "BREAKDOWN", "DISABLED"];
const blankForm = {
  code: "",
  name: "",
  department: "",
  type: "",
  capacityKg: "",
  manufacturer: "",
  status: "IDLE",
};
export default function Machines() {
  const [rows, setRows] = useState<M[]>([]);
  const [stats, setStats] = useState<Stats>(blankStats);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(blankForm);
  const { message, run } = useApiAction();
  const load = () =>
    Promise.all([
      api<M[]>("/masters/machines"),
      api<Stats>("/masters/machines/stats"),
    ]).then(([machineRows, machineStats]) => {
      setRows(machineRows);
      setStats(machineStats);
    });
  useEffect(() => {
    load();
  }, []);
  const startAdd = () => {
    setEditingId(null);
    setForm(blankForm);
    setShow(true);
  };
  const startEdit = (row: M) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      department: row.department || "",
      type: row.type || "",
      capacityKg: row.capacityKg || "",
      manufacturer: row.manufacturer || "",
      status: row.status || "IDLE",
    });
    setShow(true);
  };
  const closePanel = () => {
    setShow(false);
    setEditingId(null);
    setForm(blankForm);
  };
  const remove = async (row: M) => {
    if (!confirm(`Delete machine "${row.name}"?`)) return;
    const ok = await run(
      () => api(`/masters/machines/${row.id}`, { method: "DELETE" }),
      `${row.name} deleted.`,
    );
    if (ok) load();
  };
  const save = async () => {
    const body = JSON.stringify({
      ...form,
      capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
    });
    const successMessage = editingId ? "Machine updated." : "Machine created.";
    const ok = await run(
      () => editingId
        ? api(`/masters/machines/${editingId}`, { method: "PATCH", body })
        : api("/masters/machines", { method: "POST", body }),
      successMessage,
    );
    if (ok) {
      closePanel();
      load();
    }
  };
  const cols = useMemo<ColumnDef<M>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { header: "Code", accessorKey: "code" },
      { header: "Machine", accessorKey: "name" },
      { header: "Department", accessorKey: "department" },
      {
        header: "Capacity",
        cell: ({ row }) =>
          row.original.capacityKg ? kg(row.original.capacityKg) : "-",
      },
      { header: "Operator", accessorFn: (r) => r.operator?.name || "-" },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.status === "RUNNING"
                ? "success"
                : row.original.status === "BREAKDOWN"
                  ? "danger"
                  : row.original.status === "DISABLED"
                    ? "default"
                    : "warning"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="machines-row-actions flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="machines-row-action machines-row-action--edit"
              onClick={() => startEdit(row.original)}
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="machines-row-action machines-row-action--delete"
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
  return (
    <div className="machines-list-page">
      <div className="machines-list-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Machines</h2>
          <p className="text-sm text-gray-500">
            Production capacity, operator and machine status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="machines-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search machine, code or department..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button className="machines-add-btn" onClick={startAdd}>
            <Plus size={16} />
            Add Machine
          </Button>
        </div>
      </div>
      <InlineMessage message={message} />
      <div className="machines-stats grid gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <div className="machines-stat-tile machines-stat-tile--total">
          <div className="machines-stat-icon">
            <Factory size={15} />
          </div>
          <div>
            <p className="machines-stat-label">Total Machines</p>
            <p className="machines-stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="machines-stat-tile machines-stat-tile--running">
          <div className="machines-stat-icon">
            <Zap size={15} />
          </div>
          <div>
            <p className="machines-stat-label">Working</p>
            <p className="machines-stat-value">{stats.running}</p>
          </div>
        </div>
        <Link
          href="/maintenance"
          className="machines-stat-tile machines-stat-tile--maintenance machines-stat-tile--link"
        >
          <div className="machines-stat-icon">
            <Wrench size={15} />
          </div>
          <div>
            <p className="machines-stat-label">Maintenance</p>
            <p className="machines-stat-value">{stats.maintenance}</p>
          </div>
        </Link>
        <div className="machines-stat-tile machines-stat-tile--breakdown">
          <div className="machines-stat-icon">
            <AlertTriangle size={15} />
          </div>
          <div>
            <p className="machines-stat-label">Breakdown</p>
            <p className="machines-stat-value">{stats.breakdown}</p>
          </div>
        </div>
        <div className="machines-stat-tile machines-stat-tile--disabled">
          <div className="machines-stat-icon">
            <PowerOff size={15} />
          </div>
          <div>
            <p className="machines-stat-label">Disabled</p>
            <p className="machines-stat-value">{stats.disabled}</p>
          </div>
        </div>
      </div>
      {show && (
        <div className="machines-add-panel">
          <div className="machines-add-panel__header">
            <h3>{editingId ? "Edit Machine" : "Add Machine"}</h3>
            <button
              type="button"
              className="machines-add-panel__close"
              onClick={closePanel}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="erp-label">code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">department</label>
              <Input
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">type</label>
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">capacity kg</label>
              <Input
                type="number"
                value={form.capacityKg}
                onChange={(e) =>
                  setForm({ ...form, capacityKg: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">manufacturer</label>
              <Input
                value={form.manufacturer}
                onChange={(e) =>
                  setForm({ ...form, manufacturer: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">status</label>
              <select
                className="erp-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="machines-save-btn w-full" onClick={save}>
                {editingId ? "Update Machine" : "Save Machine"}
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
