"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, PackageCheck, ClipboardCheck, Search, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { kg } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/loading";

type DispatchRow = {
  id: string; dispatchNo: string; status: string; totalWeightKg: string; vehicle?: string; transporter?: string;
  salesOrder: { orderNo: string; customer: { name: string } };
  deliveries: Array<{ receivedKg: string }>;
};

export default function DispatchPage() {
  const [rows, setRows] = useState<DispatchRow[] | null>(null);
  const [context, setContext] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [pack, setPack] = useState({ salesOrderId: "", rollId: "", packingType: "Roll / Poly Pack", grossWeightKg: "" });
  const [shipment, setShipment] = useState({ salesOrderId: "", packingListId: "", invoiceId: "", warehouseId: "", vehicle: "", driver: "", transporter: "", lrNumber: "" });
  const [delivery, setDelivery] = useState({ dispatchId: "", receivedKg: "", shortageKg: "0", damagedKg: "0", returnedKg: "0", notes: "" });
  const [registerFilter, setRegisterFilter] = useState("");

  const load = () => Promise.all([api<DispatchRow[]>("/dispatch"), api<any>("/dispatch/context")]).then(([dispatchRows, dispatchContext]) => {
    setRows(dispatchRows);
    setContext(dispatchContext);
    const finishedWarehouse = dispatchContext.warehouses.find((warehouse: any) => warehouse.code.includes("FG"))?.id || "";
    setShipment((value) => ({ ...value, warehouseId: value.warehouseId || finishedWarehouse }));
  });
  useEffect(() => { load(); }, []);

  const act = async (request: () => Promise<unknown>, successMessage: string) => {
    setMessage("");
    try { await request(); setMessage(successMessage); toast.success(successMessage); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed"); }
  };

  const columns = useMemo<ColumnDef<DispatchRow>[]>(() => [
    { header: "Dispatch", accessorKey: "dispatchNo" },
    { header: "Order", accessorFn: (row) => row.salesOrder.orderNo },
    { header: "Customer", accessorFn: (row) => row.salesOrder.customer.name },
    { header: "Weight", cell: ({ row }) => kg(row.original.totalWeightKg) },
    { header: "Transport", accessorFn: (row) => row.transporter || "-" },
    { header: "Vehicle", accessorFn: (row) => row.vehicle || "-" },
    { header: "Received", cell: ({ row }) => kg(row.original.deliveries.reduce((sum, item) => sum + Number(item.receivedKg), 0)) },
    { header: "Status", cell: ({ row }) => <Badge tone={row.original.status === "DELIVERED" ? "success" : "warning"}>{row.original.status.replaceAll("_", " ")}</Badge> },
  ], []);

  if (!rows || !context) return <Loading />;
  const availableRolls = context.rolls.filter((roll: any) => !pack.salesOrderId || roll.productionOrder.salesOrderId === pack.salesOrderId);
  const availablePacking = context.packingLists.filter((packingList: any) => !shipment.salesOrderId || packingList.salesOrderId === shipment.salesOrderId);
  const availableInvoices = context.invoices.filter((invoice: any) => !shipment.salesOrderId || invoice.salesOrderId === shipment.salesOrderId);
  const awaitingDelivery = rows.filter((row) => ["DISPATCHED", "IN_TRANSIT"].includes(row.status));

  return (
    <div className="dispatch-page space-y-5">
      <div className="dispatch-page-header flex items-center gap-3">
        <span className="dispatch-page-icon">
          <Truck size={19} />
        </span>
        <div>
          <h2 className="text-xl font-bold md:text-2xl">Packing, Dispatch & Delivery</h2>
          <p className="text-sm text-gray-500">Pack QC-passed rolls, dispatch against an invoice, then record transport and proof of delivery.</p>
        </div>
      </div>
      {message && (
        <div className="dispatch-message flex items-center gap-2 rounded-xl p-3 text-sm">
          <CheckCircle2 size={16} />
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="dispatch-step-card">
          <CardHeader>
            <div className="dispatch-step-heading">
              <span className="dispatch-step-badge dispatch-step-badge--1">
                <PackageCheck size={16} />
              </span>
              <h3 className="font-bold">Pack Finished Roll</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="erp-input" value={pack.salesOrderId} onChange={(event) => setPack({ ...pack, salesOrderId: event.target.value, rollId: "" })}>
              <option value="">Select order</option>{context.orders.map((order: any) => <option key={order.id} value={order.id}>{order.orderNo} • {order.customer.name}</option>)}
            </select>
            <select className="erp-input" value={pack.rollId} onChange={(event) => setPack({ ...pack, rollId: event.target.value })}>
              <option value="">Select unpacked roll</option>{availableRolls.map((roll: any) => <option key={roll.id} value={roll.id}>{roll.rollNo} • {kg(roll.netWeightKg)}</option>)}
            </select>
            <Input value={pack.packingType} onChange={(event) => setPack({ ...pack, packingType: event.target.value })} placeholder="Packing type" />
            <Input type="number" value={pack.grossWeightKg} onChange={(event) => setPack({ ...pack, grossWeightKg: event.target.value })} placeholder="Gross KG (optional)" />
            <Button className="dispatch-action-btn w-full" onClick={() => act(() => api("/dispatch/packing", { method: "POST", body: JSON.stringify({
              salesOrderId: pack.salesOrderId, rollIds: [pack.rollId], packingType: pack.packingType,
              grossWeightKg: pack.grossWeightKg ? Number(pack.grossWeightKg) : undefined,
            }) }), "Packing list created.")}>Create Packing List</Button>
          </CardContent>
        </Card>

        <Card className="dispatch-step-card">
          <CardHeader>
            <div className="dispatch-step-heading">
              <span className="dispatch-step-badge dispatch-step-badge--2">
                <Truck size={16} />
              </span>
              <h3 className="font-bold">Dispatch Packed Goods</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="erp-input" value={shipment.salesOrderId} onChange={(event) => setShipment({ ...shipment, salesOrderId: event.target.value, packingListId: "", invoiceId: "" })}>
              <option value="">Select order</option>{context.orders.map((order: any) => <option key={order.id} value={order.id}>{order.orderNo} • {order.customer.name}</option>)}
            </select>
            <select className="erp-input" value={shipment.packingListId} onChange={(event) => setShipment({ ...shipment, packingListId: event.target.value })}>
              <option value="">Select packing list</option>{availablePacking.map((packingList: any) => <option key={packingList.id} value={packingList.id}>{packingList.packingNo} • {kg(packingList.netWeightKg)}</option>)}
            </select>
            <select className="erp-input" value={shipment.invoiceId} onChange={(event) => setShipment({ ...shipment, invoiceId: event.target.value })}>
              <option value="">Select issued invoice</option>{availableInvoices.map((invoice: any) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} • {invoice.status}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input value={shipment.vehicle} onChange={(event) => setShipment({ ...shipment, vehicle: event.target.value })} placeholder="Vehicle" />
              <Input value={shipment.driver} onChange={(event) => setShipment({ ...shipment, driver: event.target.value })} placeholder="Driver" />
              <Input value={shipment.transporter} onChange={(event) => setShipment({ ...shipment, transporter: event.target.value })} placeholder="Transporter" />
              <Input value={shipment.lrNumber} onChange={(event) => setShipment({ ...shipment, lrNumber: event.target.value })} placeholder="LR number" />
            </div>
            <Button className="dispatch-action-btn w-full" onClick={() => act(() => api("/dispatch", { method: "POST", body: JSON.stringify(shipment) }), "Goods dispatched and stock reduced.")}>Create Dispatch</Button>
          </CardContent>
        </Card>

        <Card className="dispatch-step-card">
          <CardHeader>
            <div className="dispatch-step-heading">
              <span className="dispatch-step-badge dispatch-step-badge--3">
                <ClipboardCheck size={16} />
              </span>
              <h3 className="font-bold">Record Delivery</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="erp-input" value={delivery.dispatchId} onChange={(event) => {
              const selected = awaitingDelivery.find((row) => row.id === event.target.value);
              setDelivery({ ...delivery, dispatchId: event.target.value, receivedKg: selected ? String(selected.totalWeightKg) : "" });
            }}>
              <option value="">Select active dispatch</option>{awaitingDelivery.map((row) => <option key={row.id} value={row.id}>{row.dispatchNo} • {row.status} • {kg(row.totalWeightKg)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={delivery.receivedKg} onChange={(event) => setDelivery({ ...delivery, receivedKg: event.target.value })} placeholder="Received KG" />
              <Input type="number" value={delivery.shortageKg} onChange={(event) => setDelivery({ ...delivery, shortageKg: event.target.value })} placeholder="Shortage KG" />
              <Input type="number" value={delivery.damagedKg} onChange={(event) => setDelivery({ ...delivery, damagedKg: event.target.value })} placeholder="Damaged KG" />
              <Input type="number" value={delivery.returnedKg} onChange={(event) => setDelivery({ ...delivery, returnedKg: event.target.value })} placeholder="Returned KG" />
            </div>
            <Input value={delivery.notes} onChange={(event) => setDelivery({ ...delivery, notes: event.target.value })} placeholder="POD / delivery notes" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="dispatch-action-btn dispatch-action-btn--outline" onClick={() => act(() => api(`/dispatch/${delivery.dispatchId}/in-transit`, { method: "POST" }), "Dispatch marked in transit.")}>Mark In Transit</Button>
              <Button className="dispatch-action-btn" onClick={() => act(() => api(`/dispatch/${delivery.dispatchId}/delivery`, { method: "POST", body: JSON.stringify({
                receivedKg: Number(delivery.receivedKg), shortageKg: Number(delivery.shortageKg), damagedKg: Number(delivery.damagedKg),
                returnedKg: Number(delivery.returnedKg), notes: delivery.notes || undefined,
              }) }), "Delivery recorded.")}>Record Delivery</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="dispatch-register-card">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Dispatch Register</h3>
          <div className="dispatch-register-search flex items-center gap-2">
            <Search className="text-gray-400" size={17} />
            <Input
              placeholder="Search dispatch, order or customer..."
              value={registerFilter}
              onChange={(event) => setRegisterFilter(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={columns}
            filter={registerFilter}
            onFilterChange={setRegisterFilter}
            hideSearch
          />
        </CardContent>
      </Card>
    </div>
  );
}
