"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, History, ListTree, Users } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
type A = {
  id: string;
  action: string;
  module: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  actor?: { name: string; email: string };
};
const actionTone = (action: string): "success" | "warning" | "danger" | "info" | "default" => {
  const upper = action.toUpperCase();
  if (/CANCEL|DELETE|REJECT/.test(upper)) return "danger";
  if (/CREATE/.test(upper)) return "success";
  if (/UPDATE|EDIT|CONFIRM/.test(upper)) return "info";
  return "default";
};
export default function Audit() {
  const [rows, setRows] = useState<A[]>([]);
  useEffect(() => {
    api<A[]>("/admin/audit-logs").then(setRows);
  }, []);
  const cols = useMemo<ColumnDef<A>[]>(
    () => [
      {
        header: "Time",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      { header: "User", accessorFn: (r) => r.actor?.name || "System" },
      {
        header: "Action",
        cell: ({ row }) => (
          <Badge tone={actionTone(row.original.action)}>
            {row.original.action.replaceAll("_", " ")}
          </Badge>
        ),
      },
      { header: "Module", accessorKey: "module" },
      { header: "Entity", accessorKey: "entity" },
      { header: "Entity ID", accessorKey: "entityId" },
    ],
    [],
  );
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayCount = rows.filter((r) => new Date(r.createdAt) >= todayStart).length;
  const distinctActors = new Set(rows.map((r) => r.actor?.email || "system")).size;
  const distinctModules = new Set(rows.map((r) => r.module)).size;
  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <span className="audit-page-icon">
          <History size={18} />
        </span>
        <div>
          <h2 className="text-lg font-bold md:text-xl">Audit Logs</h2>
          <p className="text-xs text-gray-500">
            Critical business and security actions are retained for traceability.
          </p>
        </div>
      </div>

      <div className="audit-stats grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="audit-stat-tile audit-stat-tile--total">
          <div className="audit-stat-icon">
            <History size={15} />
          </div>
          <div>
            <p className="audit-stat-label">Total Events</p>
            <p className="audit-stat-value">{rows.length}</p>
          </div>
        </div>
        <div className="audit-stat-tile audit-stat-tile--today">
          <div className="audit-stat-icon">
            <CalendarClock size={15} />
          </div>
          <div>
            <p className="audit-stat-label">Today</p>
            <p className="audit-stat-value">{todayCount}</p>
          </div>
        </div>
        <div className="audit-stat-tile audit-stat-tile--actors">
          <div className="audit-stat-icon">
            <Users size={15} />
          </div>
          <div>
            <p className="audit-stat-label">Actors</p>
            <p className="audit-stat-value">{distinctActors}</p>
          </div>
        </div>
        <div className="audit-stat-tile audit-stat-tile--modules">
          <div className="audit-stat-icon">
            <ListTree size={15} />
          </div>
          <div>
            <p className="audit-stat-label">Modules</p>
            <p className="audit-stat-value">{distinctModules}</p>
          </div>
        </div>
      </div>

      <Card className="audit-card">
        <CardHeader>
          <div className="audit-card-heading">
            <span className="audit-step-badge">
              <ListTree size={14} />
            </span>
            <h3 className="font-bold">Event Trail</h3>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable data={rows} columns={cols} searchPlaceholder="Search user, action, module, entity..." />
        </CardContent>
      </Card>
    </div>
  );
}
