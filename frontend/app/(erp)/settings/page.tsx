"use client";
import { useEffect, useState } from "react";
import { Cog, Landmark } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useApiAction } from "@/lib/use-api-action";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
export default function Settings() {
  const [rows, setRows] = useState<any[]>([]);
  const [company, setCompany] = useState({
    name: BRAND.name,
    currency: "INR",
    timezone: "Asia/Kolkata",
    gst: "",
  });
  const { message, run } = useApiAction();
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
    const ok = await run(
      () =>
        api("/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ key: "company", value: company }),
        }),
      "Settings saved.",
    );
    if (ok) load();
  };
  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <span className="settings-page-icon">
          <Cog size={18} />
        </span>
        <div>
          <h2 className="text-lg font-bold md:text-xl">Settings</h2>
          <p className="text-xs text-gray-500">
            Company profile and system configuration.
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="settings-card settings-card--company">
          <CardHeader>
            <div className="settings-card-heading">
              <span className="settings-step-badge settings-step-badge--1">
                <Landmark size={14} />
              </span>
              <h3 className="font-bold">Company Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InlineMessage message={message} />
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
            <Button className="settings-action-btn w-full" onClick={save}>
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="settings-card settings-card--system">
          <CardHeader>
            <div className="settings-card-heading">
              <span className="settings-step-badge settings-step-badge--2">
                <Cog size={14} />
              </span>
              <h3 className="font-bold">System Configuration</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="settings-config-row">
                <p className="settings-config-key">{r.key}</p>
                <pre className="settings-config-value">
                  {JSON.stringify(r.value, null, 2)}
                </pre>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="settings-config-empty">No configuration entries yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
