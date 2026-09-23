"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, ShieldCheck, Users as UsersIcon, UserCog, X } from "lucide-react";
import { api } from "@/lib/api";
import { useApiAction } from "@/lib/use-api-action";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineMessage } from "@/components/ui/inline-message";
type U = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};
export default function Users() {
  const [rows, setRows] = useState<U[]>([]);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "WORKER",
  });
  const { message, run } = useApiAction();
  const load = () => api<U[]>("/users").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const cols = useMemo<ColumnDef<U>[]>(
    () => [
      {
        header: "#",
        id: "serial",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { header: "Name", accessorKey: "name" },
      { header: "Email", accessorKey: "email" },
      {
        header: "Role",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.role === "SUPERADMIN"
                ? "danger"
                : row.original.role === "MANAGER"
                  ? "info"
                  : "default"
            }
          >
            {row.original.role}
          </Badge>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "ACTIVE" ? "success" : "default"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [],
  );
  const save = async () => {
    const created = await run(
      () => api("/users", { method: "POST", body: JSON.stringify(f) }),
      "User created.",
    );
    if (created) {
      setShow(false);
      setF({ name: "", email: "", password: "", role: "WORKER" });
      load();
    }
  };
  const superadmins = rows.filter((r) => r.role === "SUPERADMIN").length;
  const managers = rows.filter((r) => r.role === "MANAGER").length;
  const workers = rows.filter((r) => r.role === "WORKER").length;
  return (
    <div className="users-page">
      <div className="users-list-header flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="users-page-icon">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold md:text-xl">Users & Role Access</h2>
            <p className="text-xs text-gray-500">
              Super Admin controls Manager and Worker accounts.
            </p>
          </div>
        </div>
        <Button className="users-add-btn" onClick={() => setShow(!show)}>
          <Plus size={16} />
          Create User
        </Button>
      </div>

      <InlineMessage message={message} />

      <div className="users-stats grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="users-stat-tile users-stat-tile--total">
          <div className="users-stat-icon">
            <UsersIcon size={15} />
          </div>
          <div>
            <p className="users-stat-label">Total Users</p>
            <p className="users-stat-value">{rows.length}</p>
          </div>
        </div>
        <div className="users-stat-tile users-stat-tile--superadmin">
          <div className="users-stat-icon">
            <ShieldCheck size={15} />
          </div>
          <div>
            <p className="users-stat-label">Superadmins</p>
            <p className="users-stat-value">{superadmins}</p>
          </div>
        </div>
        <div className="users-stat-tile users-stat-tile--manager">
          <div className="users-stat-icon">
            <UserCog size={15} />
          </div>
          <div>
            <p className="users-stat-label">Managers</p>
            <p className="users-stat-value">{managers}</p>
          </div>
        </div>
        <div className="users-stat-tile users-stat-tile--worker">
          <div className="users-stat-icon">
            <UsersIcon size={15} />
          </div>
          <div>
            <p className="users-stat-label">Workers</p>
            <p className="users-stat-value">{workers}</p>
          </div>
        </div>
      </div>

      {show && (
        <div className="users-add-panel">
          <div className="users-add-panel__header">
            <h3>Create User</h3>
            <button
              type="button"
              className="users-add-panel__close"
              onClick={() => setShow(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="erp-label">Name</label>
              <Input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">Email</label>
              <Input
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">Password</label>
              <Input
                type="password"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
            </div>
            <div>
              <label className="erp-label">Role</label>
              <select
                className="erp-input"
                value={f.role}
                onChange={(e) => setF({ ...f, role: e.target.value })}
              >
                <option>WORKER</option>
                <option>MANAGER</option>
                <option>SUPERADMIN</option>
              </select>
            </div>
            <div className="flex items-end md:col-span-4">
              <Button className="users-save-btn w-full" onClick={save}>
                Save User
              </Button>
            </div>
          </div>
        </div>
      )}

      <DataTable data={rows} columns={cols} searchPlaceholder="Search name, email, role..." />
    </div>
  );
}
