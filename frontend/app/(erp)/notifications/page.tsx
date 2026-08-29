"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export default function Notifications() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api<any[]>("/notifications").then(setRows);
  useEffect(() => {
    load();
  }, []);
  const all = async () => {
    await api("/notifications/read-all", { method: "PATCH" });
    load();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notifications</h2>
          <p className="text-sm text-gray-500">
            Production, QC, stock, maintenance and delivery alerts.
          </p>
        </div>
        <Button variant="outline" onClick={all}>
          <CheckCheck size={16} />
          Mark all read
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((n) => (
          <button
            onClick={async () => {
              await api(`/notifications/${n.id}/read`, { method: "PATCH" });
              load();
            }}
            key={n.id}
            className={`w-full rounded-xl border p-4 text-left ${n.isRead ? "bg-white" : "bg-amber-50/60"}`}
          >
            <div className="flex gap-3">
              <Bell size={18} className="mt-1 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{n.title}</p>
                  <Badge
                    tone={
                      n.priority === "CRITICAL"
                        ? "danger"
                        : n.priority === "HIGH"
                          ? "warning"
                          : "default"
                    }
                  >
                    {n.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-gray-500">No notifications.</p>
        )}
      </CardContent>
    </Card>
  );
}
