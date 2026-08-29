"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Settings() {
  const [rows, setRows] = useState<any[]>([]);
  const [company, setCompany] = useState({
    name: "YarnFlow Textile ERP Demo",
    currency: "INR",
    timezone: "Asia/Kolkata",
    gst: "",
  });
  const load = () =>
    api<any[]>("/admin/settings").then((r) => {
      setRows(r);
      const c = r.find((x) => x.key === "company");
      if (c) setCompany(c.value);
    });
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    await api("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "company", value: company }),
    });
    load();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Company Settings</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(company).map(([k, v]) => (
            <div key={k}>
              <label className="erp-label">{k}</label>
              <Input
                value={String(v)}
                onChange={(e) =>
                  setCompany({ ...company, [k]: e.target.value })
                }
              />
            </div>
          ))}
          <Button onClick={save}>Save Settings</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-bold">System Configuration</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border p-4">
              <p className="font-semibold">{r.key}</p>
              <pre className="mt-2 overflow-auto text-xs text-gray-500">
                {JSON.stringify(r.value, null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
