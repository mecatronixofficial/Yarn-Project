"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const load = () => api<U[]>("/users").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const cols = useMemo<ColumnDef<U>[]>(
    () => [
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
      { header: "Status", accessorKey: "status" },
    ],
    [],
  );
  const save = async () => {
    await api("/users", { method: "POST", body: JSON.stringify(f) });
    setShow(false);
    setF({ name: "", email: "", password: "", role: "WORKER" });
    load();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Users & Role Access</h2>
          <p className="text-sm text-gray-500">
            Super Admin controls Manager and Worker accounts.
          </p>
        </div>
        <Button onClick={() => setShow(!show)}>Create User</Button>
      </CardHeader>
      {show && (
        <CardContent className="grid gap-3 border-b md:grid-cols-4">
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
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={save}>Save User</Button>
          </div>
        </CardContent>
      )}
      <CardContent>
        <DataTable data={rows} columns={cols} />
      </CardContent>
    </Card>
  );
}
