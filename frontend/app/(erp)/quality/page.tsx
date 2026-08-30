"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/loading";

export default function Quality() {
  const [approvals, setApprovals] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [finishing, setFinishing] = useState({
    productionOrderId: "", processName: "Stenter + Compacting", inputKg: "", outputKg: "", lossKg: "0",
    gsmBefore: "", gsmAfter: "", widthBefore: "", widthAfter: "",
  });
  const [qc, setQc] = useState({
    productionOrderId: "", stage: "FINAL", inputKg: "", approvedKg: "", rejectedKg: "0", reworkKg: "0",
    warehouseId: "", rollNo: "", notes: "",
  });

  const load = () => Promise.all([api<any>("/production/approvals"), api<any>("/production/context")]).then(([approvalData, contextData]) => {
    setApprovals(approvalData);
    setContext(contextData);
    const finishedWarehouse = contextData.warehouses.find((warehouse: any) => warehouse.code.includes("FG"))?.id || "";
    setQc((value) => ({ ...value, warehouseId: value.warehouseId || finishedWarehouse }));
  });

  useEffect(() => { load(); }, []);

  const submit = async (request: () => Promise<unknown>, successMessage: string) => {
    setMessage("");
    try {
      await request();
      setMessage(successMessage);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    }
  };

  if (!approvals || !context) return <Loading />;
  const productionOptions = context.productionOrders.map((production: any) => (
    <option key={production.id} value={production.id}>
      {production.productionNo} • {production.salesOrder.customer.name} • {production.salesOrderItem.fabricType}
    </option>
  ));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Finishing & Quality Control</h2>
        <p className="text-sm text-gray-500">Approved dyeing output moves through finishing and quantity-balanced final QC.</p>
      </div>
      {message && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Yarn entries", approvals.yarn.length],
          ["Knitting entries", approvals.knitting.length],
          ["Dyeing entries", approvals.dyeing.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-amber-50 p-5">
            <p className="text-xs text-amber-700">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><h3 className="font-bold">Record Finishing</h3></CardHeader>
          <CardContent className="space-y-3">
            <select className="erp-input" value={finishing.productionOrderId} onChange={(event) => setFinishing({ ...finishing, productionOrderId: event.target.value })}>
              <option value="">Select production order</option>{productionOptions}
            </select>
            <Input value={finishing.processName} onChange={(event) => setFinishing({ ...finishing, processName: event.target.value })} placeholder="Process" />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" value={finishing.inputKg} onChange={(event) => setFinishing({ ...finishing, inputKg: event.target.value })} placeholder="Input KG" />
              <Input type="number" value={finishing.outputKg} onChange={(event) => setFinishing({ ...finishing, outputKg: event.target.value })} placeholder="Output KG" />
              <Input type="number" value={finishing.lossKg} onChange={(event) => setFinishing({ ...finishing, lossKg: event.target.value })} placeholder="Loss KG" />
              <Input type="number" value={finishing.gsmBefore} onChange={(event) => setFinishing({ ...finishing, gsmBefore: event.target.value })} placeholder="GSM before" />
              <Input type="number" value={finishing.gsmAfter} onChange={(event) => setFinishing({ ...finishing, gsmAfter: event.target.value })} placeholder="GSM after" />
              <Input value={finishing.widthAfter} onChange={(event) => setFinishing({ ...finishing, widthAfter: event.target.value })} placeholder="Final width" />
            </div>
            <Button className="w-full" onClick={() => submit(
              () => api("/production/finishing", { method: "POST", body: JSON.stringify({
                ...finishing, inputKg: Number(finishing.inputKg), outputKg: Number(finishing.outputKg), lossKg: Number(finishing.lossKg),
                gsmBefore: finishing.gsmBefore ? Number(finishing.gsmBefore) : undefined,
                gsmAfter: finishing.gsmAfter ? Number(finishing.gsmAfter) : undefined,
              }) }),
              "Finishing recorded. Output is ready for final QC.",
            )}>Save Finishing</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-bold">Final QC & Finished Stock</h3></CardHeader>
          <CardContent className="space-y-3">
            <select className="erp-input" value={qc.productionOrderId} onChange={(event) => setQc({ ...qc, productionOrderId: event.target.value })}>
              <option value="">Select production order</option>{productionOptions}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={qc.inputKg} onChange={(event) => setQc({ ...qc, inputKg: event.target.value })} placeholder="Input KG" />
              <Input type="number" value={qc.approvedKg} onChange={(event) => setQc({ ...qc, approvedKg: event.target.value })} placeholder="Approved KG" />
              <Input type="number" value={qc.rejectedKg} onChange={(event) => setQc({ ...qc, rejectedKg: event.target.value })} placeholder="Rejected KG" />
              <Input type="number" value={qc.reworkKg} onChange={(event) => setQc({ ...qc, reworkKg: event.target.value })} placeholder="Rework KG" />
              <Input value={qc.rollNo} onChange={(event) => setQc({ ...qc, rollNo: event.target.value })} placeholder="Finished roll no (optional)" />
              <Input value={qc.notes} onChange={(event) => setQc({ ...qc, notes: event.target.value })} placeholder="QC notes" />
            </div>
            <Button className="w-full" onClick={() => submit(
              () => api("/production/qc/final", { method: "POST", body: JSON.stringify({
                ...qc, inputKg: Number(qc.inputKg), approvedKg: Number(qc.approvedKg),
                rejectedKg: Number(qc.rejectedKg), reworkKg: Number(qc.reworkKg),
                rollNo: qc.rollNo || undefined, notes: qc.notes || undefined,
              }) }),
              "Final QC recorded. Approved quantity was posted to finished stock.",
            )}>Complete Final QC</Button>
            <p className="text-xs text-gray-500">Input KG must equal approved + rejected + rework KG.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
