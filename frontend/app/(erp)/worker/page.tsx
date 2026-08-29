"use client";

import { useEffect, useState } from "react";
import { Factory, PlusCircle } from "lucide-react";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/loading";

type EntryState = {
  jobId: string;
  kind: "Knitting" | "Dyeing";
  inputKg: string;
  outputKg: string;
  wasteKg: string;
  rejectedKg: string;
  processName: string;
  shift: string;
};
const blank: EntryState = {
  jobId: "",
  kind: "Knitting",
  inputKg: "",
  outputKg: "",
  wasteKg: "0",
  rejectedKg: "0",
  processName: "Dyeing",
  shift: "A",
};

export default function Worker() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any>(null);
  const [entry, setEntry] = useState<EntryState>(blank);
  const [message, setMessage] = useState("");
  const load = () => api<any>("/production/my-jobs").then(setJobs);
  useEffect(() => {
    if (user?.role === "WORKER") load();
  }, [user]);
  if (!jobs) return <Loading />;
  const list = [
    ...jobs.knitting.map((j: any) => ({
      ...j,
      kind: "Knitting",
      qty: j.yarnIssuedKg,
      customer: j.productionOrder.salesOrder.customer.name,
      detail: j.productionOrder.salesOrderItem.fabricType,
    })),
    ...jobs.dyeing.map((j: any) => ({
      ...j,
      kind: "Dyeing",
      qty: j.plannedQtyKg,
      customer: j.productionOrder.salesOrder.customer.name,
      detail: j.color,
    })),
  ];
  const open = (j: any) =>
    setEntry({
      jobId: j.id,
      kind: j.kind,
      inputKg: String(j.qty),
      outputKg: "",
      wasteKg: "0",
      rejectedKg: "0",
      processName: j.kind === "Dyeing" ? "Dyeing" : "",
      shift: "A",
    });
  const submit = async () => {
    setMessage("");
    try {
      if (entry.kind === "Knitting") {
        await api(`/production/knitting/jobs/${entry.jobId}/entries`, {
          method: "POST",
          body: JSON.stringify({
            outputKg: Number(entry.outputKg),
            wasteKg: Number(entry.wasteKg),
            shift: entry.shift,
          }),
        });
      } else {
        await api(`/production/dyeing/batches/${entry.jobId}/entries`, {
          method: "POST",
          body: JSON.stringify({
            processName: entry.processName,
            inputKg: Number(entry.inputKg),
            outputKg: Number(entry.outputKg),
            lossKg: Number(entry.wasteKg),
            rejectedKg: Number(entry.rejectedKg),
          }),
        });
      }
      setMessage(
        "Entry submitted. Manager approval is required before stock is posted.",
      );
      setEntry(blank);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit entry");
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a77a24]">
          Worker Dashboard
        </p>
        <h2 className="mt-1 text-2xl font-bold">Good day, {user?.name}</h2>
        <p className="text-sm text-gray-500">
          Only jobs assigned to your account are shown.
        </p>
      </div>
      {message && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}
      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No active jobs assigned.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((j: any) => (
            <Card key={j.id}>
              <CardHeader>
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{j.kind} Job</p>
                    <h3 className="mt-1 text-xl font-bold">
                      {j.jobNo || j.batchNo}
                    </h3>
                  </div>
                  <Badge tone="warning">{j.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="mt-1 font-semibold">{j.customer}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Target / Input</p>
                    <p className="mt-1 font-semibold">{kg(j.qty)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Process</p>
                    <p className="mt-1 font-semibold">{j.detail}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Machine</p>
                    <p className="mt-1 font-semibold">
                      {j.machine?.code || "Assigned"}
                    </p>
                  </div>
                </div>
                <Button className="mt-4 w-full" onClick={() => open(j)}>
                  <PlusCircle size={16} />
                  Add Production Entry
                </Button>
                <p className="mt-3 text-xs text-gray-400">
                  Submitted quantities remain pending until Manager/Super Admin
                  approval.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {entry.jobId && (
        <Card>
          <CardHeader>
            <h3 className="font-bold">Submit {entry.kind} Entry</h3>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {entry.kind === "Dyeing" && (
              <>
                <div>
                  <label className="erp-label">Process</label>
                  <Input
                    value={entry.processName}
                    onChange={(e) =>
                      setEntry({ ...entry, processName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="erp-label">Input KG</label>
                  <Input
                    type="number"
                    value={entry.inputKg}
                    onChange={(e) =>
                      setEntry({ ...entry, inputKg: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            <div>
              <label className="erp-label">Output KG</label>
              <Input
                type="number"
                value={entry.outputKg}
                onChange={(e) =>
                  setEntry({ ...entry, outputKg: e.target.value })
                }
              />
            </div>
            <div>
              <label className="erp-label">Waste / Loss KG</label>
              <Input
                type="number"
                value={entry.wasteKg}
                onChange={(e) =>
                  setEntry({ ...entry, wasteKg: e.target.value })
                }
              />
            </div>
            {entry.kind === "Dyeing" && (
              <div>
                <label className="erp-label">Rejected KG</label>
                <Input
                  type="number"
                  value={entry.rejectedKg}
                  onChange={(e) =>
                    setEntry({ ...entry, rejectedKg: e.target.value })
                  }
                />
              </div>
            )}
            {entry.kind === "Knitting" && (
              <div>
                <label className="erp-label">Shift</label>
                <Input
                  value={entry.shift}
                  onChange={(e) =>
                    setEntry({ ...entry, shift: e.target.value })
                  }
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button className="flex-1" onClick={submit}>
                <Factory size={16} />
                Submit
              </Button>
              <Button variant="outline" onClick={() => setEntry(blank)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
