"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { money } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type MaintenanceRecordRow = {
  id: string;
  machine: { id: string; code: string; name: string; status: string };
  type: "PREVENTIVE" | "BREAKDOWN";
  complaint: string;
  technician?: string;
  spareParts?: string;
  cost?: string;
  startedAt: string;
  endedAt?: string;
  resolution?: string;
};
const machineStatuses = ["RUNNING", "IDLE", "MAINTENANCE", "BREAKDOWN", "DISABLED"];
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export default function Maintenance() {
  const [rows, setRows] = useState<MaintenanceRecordRow[]>([]);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "PREVENTIVE",
    complaint: "",
    technician: "",
    spareParts: "",
    cost: "",
    startedAt: "",
    endedAt: "",
    machineStatus: "",
  });
  const load = () => api<MaintenanceRecordRow[]>("/operations/maintenance").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const startView = (r: MaintenanceRecordRow) => {
    setEditingId(null);
    setViewingId(r.id);
  };
  const startEdit = (r: MaintenanceRecordRow) => {
    setViewingId(null);
    setEditingId(r.id);
    setForm({
      type: r.type || "PREVENTIVE",
      complaint: r.complaint || "",
      technician: r.technician || "",
      spareParts: r.spareParts || "",
      cost: r.cost || "",
      startedAt: toLocalInput(r.startedAt),
      endedAt: toLocalInput(r.endedAt),
      machineStatus: r.machine.status || "",
    });
  };
  const closePanel = () => setEditingId(null);
  const save = async () => {
    if (!editingId) return;
    await api(`/operations/maintenance/${editingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        type: form.type,
        complaint: form.complaint,
        technician: form.technician || undefined,
        spareParts: form.spareParts || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        startedAt: form.startedAt
          ? new Date(form.startedAt).toISOString()
          : undefined,
        endedAt: form.endedAt
          ? new Date(form.endedAt).toISOString()
          : null,
        machineStatus: form.machineStatus || undefined,
      }),
    });
    toast.success("Maintenance record updated.");
    closePanel();
    load();
  };
  const complete = async (r: MaintenanceRecordRow) => {
    await api(`/operations/maintenance/${r.id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ resolution: "Completed from ERP" }),
    });
    toast.success(`${r.machine.code} maintenance marked complete.`);
    load();
  };
  const editingRow = rows.find((r) => r.id === editingId);
  const viewingRow = rows.find((r) => r.id === viewingId);
  const cols = useMemo<ColumnDef<MaintenanceRecordRow>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      {
        header: "Machine",
        accessorFn: (r) => `${r.machine.code} ${r.machine.name}`,
        cell: ({ row }) => <span>{row.original.machine.code}</span>,
      },
      {
        header: "Type",
        cell: ({ row }) => (
          <Badge tone={row.original.type === "BREAKDOWN" ? "danger" : "info"}>
            {row.original.type === "BREAKDOWN" ? "Breakdown" : "Preventive"}
          </Badge>
        ),
      },
      {
        header: "Technician",
        accessorFn: (r) => r.technician || "-",
      },
      {
        header: "Cost",
        cell: ({ row }) => money(row.original.cost || 0),
      },
      {
        header: "Started",
        cell: ({ row }) =>
          new Date(row.original.startedAt).toLocaleDateString("en-IN"),
      },
      {
        header: "Ended",
        cell: ({ row }) =>
          row.original.endedAt
            ? new Date(row.original.endedAt).toLocaleDateString("en-IN")
            : "-",
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.endedAt ? "success" : "warning"}>
            {row.original.endedAt ? "Completed" : "Open"}
          </Badge>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="maintenance-row-actions flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="maintenance-row-action maintenance-row-action--view"
              onClick={() => startView(row.original)}
              aria-label={`View record for ${row.original.machine.code}`}
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="maintenance-row-action maintenance-row-action--edit"
              onClick={() => startEdit(row.original)}
              aria-label={`Edit record for ${row.original.machine.code}`}
            >
              <Pencil size={14} />
            </button>
            {!row.original.endedAt && (
              <button
                type="button"
                className="maintenance-row-action maintenance-row-action--complete"
                onClick={() => complete(row.original)}
                aria-label={`Mark complete for ${row.original.machine.code}`}
              >
                <CheckCircle2 size={14} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  );
  return (
    <div className="maintenance-page">
      <div className="maintenance-list-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Machine Maintenance</h2>
          <p className="text-sm text-gray-500">
            Breakdown and preventive maintenance history.
          </p>
        </div>
        <div className="maintenance-search flex items-center gap-2">
          <Search className="text-gray-400" size={17} />
          <Input
            placeholder="Search machine, complaint or technician..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      {viewingId && viewingRow && (
        <div className="maintenance-edit-panel">
          <div className="maintenance-edit-panel__header">
            <div className="flex items-center gap-2">
              <span className="maintenance-edit-panel__icon">
                {viewingRow.type === "BREAKDOWN" ? (
                  <AlertTriangle size={15} />
                ) : (
                  <Wrench size={15} />
                )}
              </span>
              <h3>
                View • {viewingRow.machine.code} • {viewingRow.machine.name}
              </h3>
            </div>
            <button
              type="button"
              className="maintenance-edit-panel__close"
              onClick={() => setViewingId(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="erp-label">type</label>
              <p className="maintenance-view-value">
                {viewingRow.type === "BREAKDOWN" ? "Breakdown" : "Preventive"}
              </p>
            </div>
            <div>
              <label className="erp-label">machine status</label>
              <p className="maintenance-view-value">{viewingRow.machine.status}</p>
            </div>
            <div>
              <label className="erp-label">technician</label>
              <p className="maintenance-view-value">
                {viewingRow.technician || "-"}
              </p>
            </div>
            <div>
              <label className="erp-label">cost</label>
              <p className="maintenance-view-value">
                {money(Number(viewingRow.cost || 0))}
              </p>
            </div>
            <div>
              <label className="erp-label">spare parts</label>
              <p className="maintenance-view-value">
                {viewingRow.spareParts || "-"}
              </p>
            </div>
            <div>
              <label className="erp-label">status</label>
              <p className="maintenance-view-value">
                {viewingRow.endedAt ? "Completed" : "Open"}
              </p>
            </div>
            <div>
              <label className="erp-label">started at</label>
              <p className="maintenance-view-value">
                {new Date(viewingRow.startedAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <label className="erp-label">ended at</label>
              <p className="maintenance-view-value">
                {viewingRow.endedAt
                  ? new Date(viewingRow.endedAt).toLocaleString("en-IN")
                  : "-"}
              </p>
            </div>
            <div className="md:col-span-3">
              <label className="erp-label">complaint</label>
              <p className="maintenance-view-value">{viewingRow.complaint}</p>
            </div>
            {viewingRow.resolution && (
              <div className="md:col-span-3">
                <label className="erp-label">resolution</label>
                <p className="maintenance-view-value">
                  {viewingRow.resolution}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {editingId && editingRow && (
        <div className="maintenance-edit-panel">
          <div className="maintenance-edit-panel__header">
            <div className="flex items-center gap-2">
              <span className="maintenance-edit-panel__icon">
                {form.type === "BREAKDOWN" ? (
                  <AlertTriangle size={15} />
                ) : (
                  <Wrench size={15} />
                )}
              </span>
              <h3>
                Edit • {editingRow.machine.code} • {editingRow.machine.name}
              </h3>
            </div>
            <button
              type="button"
              className="maintenance-edit-panel__close"
              onClick={closePanel}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="erp-label">type</label>
              <select
                className="erp-input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="BREAKDOWN">Breakdown</option>
              </select>
            </div>
            <div>
              <label className="erp-label">machine status</label>
              <select
                className="erp-input"
                value={form.machineStatus}
                onChange={(e) =>
                  setForm({ ...form, machineStatus: e.target.value })
                }
              >
                {machineStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="erp-label">technician</label>
              <Input
                value={form.technician}
                onChange={(e) =>
                  setForm({ ...form, technician: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">cost</label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="erp-label">complaint</label>
              <Input
                value={form.complaint}
                onChange={(e) =>
                  setForm({ ...form, complaint: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">spare parts</label>
              <Input
                value={form.spareParts}
                onChange={(e) =>
                  setForm({ ...form, spareParts: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">started at</label>
              <Input
                type="datetime-local"
                value={form.startedAt}
                onChange={(e) =>
                  setForm({ ...form, startedAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">ended at</label>
              <Input
                type="datetime-local"
                value={form.endedAt}
                onChange={(e) =>
                  setForm({ ...form, endedAt: e.target.value })
                }
              />
            </div>
            <div className="flex items-end md:col-span-3">
              <Button className="maintenance-save-btn w-full" onClick={save}>
                Update Record
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
