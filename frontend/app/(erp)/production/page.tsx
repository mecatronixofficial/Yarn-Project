"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Droplets, Factory, Gauge, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { kg } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/loading";

export default function Production() {
  const [a, setA] = useState<any>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [yarn, setYarn] = useState({
    productionOrderId: "",
    processName: "Spinning + Auto Coner",
    lotNo: "",
    yarnCount: "30s",
    machineCode: "",
    shift: "A",
    inputKg: "",
    outputKg: "",
    wasteKg: "0",
  });
  const [knit, setKnit] = useState({
    productionOrderId: "",
    yarnLotNo: "",
    yarnCount: "30s",
    fabricType: "Single Jersey",
    gsm: "180",
    diameter: "34 inch",
    gauge: "24G",
    machineId: "",
    assignedWorkerId: "",
    yarnWarehouseId: "",
    yarnIssuedKg: "",
  });
  const [dye, setDye] = useState({
    productionOrderId: "",
    color: "Navy Blue",
    shade: "",
    plannedQtyKg: "",
    machineId: "",
    assignedWorkerId: "",
    greyWarehouseId: "",
    rollId: "",
  });
  const load = () =>
    Promise.all([
      api<any>("/production/approvals"),
      api<any>("/production/context"),
    ]).then(([approvals, context]) => {
      setA(approvals);
      setCtx(context);
      const yarnWh =
        context.warehouses.find((w: any) => w.code.includes("YARN"))?.id || "";
      const greyWh =
        context.warehouses.find((w: any) => w.code.includes("GREY"))?.id || "";
      setKnit((k) => ({ ...k, yarnWarehouseId: k.yarnWarehouseId || yarnWh }));
      setDye((d) => ({ ...d, greyWarehouseId: d.greyWarehouseId || greyWh }));
    });
  useEffect(() => {
    load();
  }, []);
  const selectedPo = useMemo(
    () =>
      ctx?.productionOrders.find((p: any) => p.id === knit.productionOrderId),
    [ctx, knit.productionOrderId],
  );
  useEffect(() => {
    if (selectedPo)
      setKnit((k) => ({
        ...k,
        yarnCount: selectedPo.salesOrderItem.yarnCount,
        fabricType: selectedPo.salesOrderItem.fabricType,
        gsm: String(selectedPo.salesOrderItem.gsm || ""),
        diameter: selectedPo.salesOrderItem.diameter || "",
      }));
  }, [selectedPo]);
  if (!a || !ctx) return <Loading />;
  const success = async (fn: () => Promise<any>) => {
    setMessage("");
    try {
      await fn();
      setMessage(
        "Saved successfully. Stock movement will follow the approval rules.",
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  };
  const approve = async (kind: string, row: any) => {
    if (kind === "Yarn") {
      const wh = ctx.warehouses.find((w: any) => w.code.includes("YARN"));
      return success(() =>
        api(`/production/yarn/entries/${row.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ warehouseId: wh?.id }),
        }),
      );
    }
    if (kind === "Knitting") {
      const wh = ctx.warehouses.find((w: any) => w.code.includes("GREY"));
      return success(() =>
        api(`/production/knitting/entries/${row.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ greyWarehouseId: wh?.id }),
        }),
      );
    }
    return success(() =>
      api(`/production/dyeing/entries/${row.id}/approve`, { method: "POST" }),
    );
  };
  const section = (title: string, rows: any[], kind: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            {kind === "Yarn" ? (
              <Gauge size={18} />
            ) : kind === "Knitting" ? (
              <Factory size={18} />
            ) : (
              <Droplets size={18} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold">{title}</h3>
            <p className="text-xs text-gray-500">
              Worker entries waiting for approval.
            </p>
          </div>
          <Badge tone={rows.length ? "warning" : "success"}>
            {rows.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-5 text-sm text-gray-500">No pending entries.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <p className="font-semibold">
                    {r.entryNo || r.knittingJob?.jobNo || r.batch?.batchNo}
                  </p>
                  <p className="text-xs text-gray-500">
                    Output {kg(r.outputKg)} • Waste/Loss{" "}
                    {kg(r.wasteKg ?? r.lossKg ?? 0)} • Balance {kg(r.balanceKg)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => approve(kind, r)}
                >
                  <CheckCircle2 size={15} />
                  Approve
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  const poOptions = (
    <>
      {<option value="">Select production order</option>}
      {ctx.productionOrders.map((p: any) => (
        <option key={p.id} value={p.id}>
          {p.productionNo} • {p.salesOrder.customer.name} •{" "}
          {p.salesOrderItem.fabricType}
        </option>
      ))}
    </>
  );
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Production Control</h2>
        <p className="text-sm text-gray-500">
          Create process jobs and approve worker output.
        </p>
      </div>
      {message && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="font-bold">Add Yarn Production</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="erp-input"
              value={yarn.productionOrderId}
              onChange={(e) =>
                setYarn({ ...yarn, productionOrderId: e.target.value })
              }
            >
              {poOptions}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Lot no"
                value={yarn.lotNo}
                onChange={(e) => setYarn({ ...yarn, lotNo: e.target.value })}
              />
              <Input
                placeholder="Yarn count"
                value={yarn.yarnCount}
                onChange={(e) =>
                  setYarn({ ...yarn, yarnCount: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Input KG"
                value={yarn.inputKg}
                onChange={(e) => setYarn({ ...yarn, inputKg: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Output KG"
                value={yarn.outputKg}
                onChange={(e) => setYarn({ ...yarn, outputKg: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Waste KG"
                value={yarn.wasteKg}
                onChange={(e) => setYarn({ ...yarn, wasteKg: e.target.value })}
              />
              <Input
                placeholder="Machine"
                value={yarn.machineCode}
                onChange={(e) =>
                  setYarn({ ...yarn, machineCode: e.target.value })
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                success(() =>
                  api("/production/yarn/entries", {
                    method: "POST",
                    body: JSON.stringify({
                      ...yarn,
                      inputKg: Number(yarn.inputKg),
                      outputKg: Number(yarn.outputKg),
                      wasteKg: Number(yarn.wasteKg),
                    }),
                  }),
                )
              }
            >
              <Plus size={15} />
              Submit Yarn Entry
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-bold">Create Knitting Job</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="erp-input"
              value={knit.productionOrderId}
              onChange={(e) =>
                setKnit({ ...knit, productionOrderId: e.target.value })
              }
            >
              {poOptions}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Yarn lot"
                value={knit.yarnLotNo}
                onChange={(e) =>
                  setKnit({ ...knit, yarnLotNo: e.target.value })
                }
              />
              <Input
                placeholder="Yarn count"
                value={knit.yarnCount}
                onChange={(e) =>
                  setKnit({ ...knit, yarnCount: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Issued KG"
                value={knit.yarnIssuedKg}
                onChange={(e) =>
                  setKnit({ ...knit, yarnIssuedKg: e.target.value })
                }
              />
              <Input
                placeholder="Gauge"
                value={knit.gauge}
                onChange={(e) => setKnit({ ...knit, gauge: e.target.value })}
              />
            </div>
            <select
              className="erp-input"
              value={knit.machineId}
              onChange={(e) => setKnit({ ...knit, machineId: e.target.value })}
            >
              <option value="">Select knitting machine</option>
              {ctx.machines
                .filter((m: any) => m.department === "Knitting")
                .map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.code} • {m.name}
                  </option>
                ))}
            </select>
            <select
              className="erp-input"
              value={knit.assignedWorkerId}
              onChange={(e) =>
                setKnit({ ...knit, assignedWorkerId: e.target.value })
              }
            >
              <option value="">Assign worker</option>
              {ctx.workers.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              onClick={() =>
                success(() =>
                  api("/production/knitting/jobs", {
                    method: "POST",
                    body: JSON.stringify({
                      ...knit,
                      gsm: Number(knit.gsm),
                      yarnIssuedKg: Number(knit.yarnIssuedKg),
                    }),
                  }),
                )
              }
            >
              <Plus size={15} />
              Issue Yarn & Create Job
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-bold">Create Dyeing Batch</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="erp-input"
              value={dye.productionOrderId}
              onChange={(e) =>
                setDye({ ...dye, productionOrderId: e.target.value })
              }
            >
              {poOptions}
            </select>
            <select
              className="erp-input"
              value={dye.rollId}
              onChange={(e) => {
                const r = ctx.greyRolls.find(
                  (x: any) => x.id === e.target.value,
                );
                setDye({
                  ...dye,
                  rollId: e.target.value,
                  plannedQtyKg: r ? String(r.weightKg) : dye.plannedQtyKg,
                });
              }}
            >
              <option value="">Select available grey roll</option>
              {ctx.greyRolls.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.rollNo} • {kg(r.weightKg)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Color"
                value={dye.color}
                onChange={(e) => setDye({ ...dye, color: e.target.value })}
              />
              <Input
                placeholder="Shade"
                value={dye.shade}
                onChange={(e) => setDye({ ...dye, shade: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Planned KG"
                value={dye.plannedQtyKg}
                onChange={(e) =>
                  setDye({ ...dye, plannedQtyKg: e.target.value })
                }
              />
            </div>
            <select
              className="erp-input"
              value={dye.machineId}
              onChange={(e) => setDye({ ...dye, machineId: e.target.value })}
            >
              <option value="">Select dyeing machine</option>
              {ctx.machines
                .filter((m: any) => m.department === "Dyeing")
                .map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.code} • {m.name}
                  </option>
                ))}
            </select>
            <select
              className="erp-input"
              value={dye.assignedWorkerId}
              onChange={(e) =>
                setDye({ ...dye, assignedWorkerId: e.target.value })
              }
            >
              <option value="">Assign worker</option>
              {ctx.workers.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              onClick={() =>
                success(() =>
                  api("/production/dyeing/batches", {
                    method: "POST",
                    body: JSON.stringify({
                      ...dye,
                      plannedQtyKg: Number(dye.plannedQtyKg),
                      rollIds: [dye.rollId],
                      rollId: undefined,
                    }),
                  }),
                )
              }
            >
              <Plus size={15} />
              Issue Grey & Create Batch
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {section("Yarn Approval", a.yarn, "Yarn")}
        {section("Knitting Approval", a.knitting, "Knitting")}
        {section("Dyeing Approval", a.dyeing, "Dyeing")}
      </div>
    </div>
  );
}
