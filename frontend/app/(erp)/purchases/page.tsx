"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  ClipboardCheck,
  IndianRupee,
  PackageCheck,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { Loading } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Supplier = { id: string; code: string; name: string; materialCategory?: string };
type Warehouse = { id: string; code: string; name: string };
type ReceiptItem = { quantity: string };
type PurchaseItem = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  receiptItems: ReceiptItem[];
};
type PurchaseReceipt = {
  id: string;
  receiptNo: string;
  receivedAt: string;
  lotNo?: string;
  warehouse: Warehouse;
};
type PurchaseOrder = {
  id: string;
  poNo: string;
  status: "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDate?: string;
  supplier: Supplier;
  items: PurchaseItem[];
  receipts: PurchaseReceipt[];
};
type PurchaseLineDraft = { itemCode: string; itemName: string; quantity: string; unit: string; rate: string };

const blankLine = (): PurchaseLineDraft => ({ itemCode: "", itemName: "", quantity: "", unit: "KG", rate: "" });
const receivedQuantity = (item: PurchaseItem) => item.receiptItems.reduce((sum, receipt) => sum + Number(receipt.quantity), 0);
const remainingQuantity = (item: PurchaseItem) => Math.max(0, Number(item.quantity) - receivedQuantity(item));
const statusTone = (status: PurchaseOrder["status"]): "success" | "warning" | "danger" | "info" => {
  if (status === "RECEIVED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "PARTIALLY_RECEIVED") return "info";
  return "warning";
};

export default function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseOrder[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [purchase, setPurchase] = useState({ supplierId: "", expectedDate: "" });
  const [lines, setLines] = useState<PurchaseLineDraft[]>([blankLine()]);
  const [receipt, setReceipt] = useState({ purchaseOrderId: "", warehouseId: "", category: "YARN", lotNo: "" });
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});

  const load = async () => {
    const [purchaseOrders, context] = await Promise.all([
      api<PurchaseOrder[]>("/procurement/purchase-orders"),
      api<{ suppliers: Supplier[]; warehouses: Warehouse[] }>("/procurement/context"),
    ]);
    setRows(purchaseOrders);
    setSuppliers(context.suppliers);
    setWarehouses(context.warehouses);
    setReceipt((current) => ({
      ...current,
      warehouseId: current.warehouseId || context.warehouses.find((warehouse) => warehouse.code.includes("YARN"))?.id || context.warehouses[0]?.id || "",
    }));
  };

  useEffect(() => {
    load().catch((error) => setMessage({ text: error instanceof Error ? error.message : "Could not load purchases", error: true }));
  }, []);

  const openPurchaseOrders = (rows || []).filter((row) => ["ORDERED", "PARTIALLY_RECEIVED"].includes(row.status));
  const selectedPurchaseOrder = openPurchaseOrders.find((row) => row.id === receipt.purchaseOrderId);

  useEffect(() => {
    if (!selectedPurchaseOrder) {
      setReceiptQuantities({});
      return;
    }
    setReceiptQuantities(Object.fromEntries(selectedPurchaseOrder.items.map((item) => [item.id, ""])));
  }, [receipt.purchaseOrderId]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
      setMessage({ text: successMessage, error: false });
      return true;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Action failed", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateLine = (index: number, field: keyof PurchaseLineDraft, value: string) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  };

  const createPurchaseOrder = async () => {
    const validLines = lines.filter((line) => line.itemCode.trim() || line.itemName.trim() || line.quantity || line.rate);
    if (!purchase.supplierId || validLines.length === 0 || validLines.some((line) => !line.itemCode.trim() || !line.itemName.trim() || Number(line.quantity) <= 0 || Number(line.rate) < 0)) {
      setMessage({ text: "Select a supplier and complete every item code, name, quantity, and rate.", error: true });
      return;
    }
    const created = await runAction(
      () => api("/procurement/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: purchase.supplierId,
          expectedDate: purchase.expectedDate || undefined,
          items: validLines.map((line) => ({
            itemCode: line.itemCode,
            itemName: line.itemName,
            quantity: Number(line.quantity),
            unit: line.unit,
            rate: Number(line.rate),
          })),
        }),
      }),
      "Purchase order created successfully.",
    );
    if (created) {
      setPurchase({ supplierId: "", expectedDate: "" });
      setLines([blankLine()]);
    }
  };

  const receiveMaterial = async () => {
    if (!selectedPurchaseOrder || !receipt.warehouseId) {
      setMessage({ text: "Select a purchase order and receiving warehouse.", error: true });
      return;
    }
    const items = selectedPurchaseOrder.items
      .map((item) => ({ purchaseOrderItemId: item.id, quantity: Number(receiptQuantities[item.id] || 0) }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      setMessage({ text: "Enter a received quantity for at least one item.", error: true });
      return;
    }
    const received = await runAction(
      () => api(`/procurement/purchase-orders/${selectedPurchaseOrder.id}/receive`, {
        method: "POST",
        body: JSON.stringify({ warehouseId: receipt.warehouseId, category: receipt.category, lotNo: receipt.lotNo || undefined, items }),
      }),
      "Goods receipt created and inventory updated.",
    );
    if (received) {
      setReceipt((current) => ({ ...current, purchaseOrderId: "", lotNo: "" }));
      setReceiptQuantities({});
    }
  };

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(() => [
    {
      header: "Purchase order",
      cell: ({ row }) => (
        <div><p className="font-semibold text-gray-900">{row.original.poNo}</p><p className="text-xs text-gray-400">{new Date(row.original.orderDate).toLocaleDateString()}</p></div>
      ),
    },
    { header: "Supplier", accessorFn: (row) => row.supplier.name },
    {
      header: "Items / receipt progress",
      cell: ({ row }) => (
        <div className="min-w-64 space-y-1.5">
          {row.original.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 text-xs">
              <span className="truncate text-gray-700">{item.itemCode} · {item.itemName}</span>
              <span className="whitespace-nowrap font-medium">{receivedQuantity(item).toFixed(3)} / {Number(item.quantity).toFixed(3)} {item.unit}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "PO value",
      cell: ({ row }) => <span className="font-semibold">{money(row.original.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0))}</span>,
    },
    {
      header: "Expected",
      cell: ({ row }) => row.original.expectedDate ? (
        <span className={new Date(row.original.expectedDate) < new Date() && row.original.status !== "RECEIVED" ? "font-medium text-red-600" : ""}>
          {new Date(row.original.expectedDate).toLocaleDateString()}
        </span>
      ) : "-",
    },
    {
      header: "Latest GRN",
      cell: ({ row }) => row.original.receipts[0] ? (
        <div><p className="font-medium">{row.original.receipts[0].receiptNo}</p><p className="text-xs text-gray-400">{row.original.receipts[0].warehouse.code}</p></div>
      ) : "-",
    },
    {
      header: "Status",
      cell: ({ row }) => <Badge tone={statusTone(row.original.status)}>{row.original.status.replaceAll("_", " ")}</Badge>,
    },
    {
      header: "Action",
      cell: ({ row }) => row.original.status === "ORDERED" && row.original.receipts.length === 0 ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => runAction(() => api(`/procurement/purchase-orders/${row.original.id}/cancel`, { method: "POST" }), "Purchase order cancelled.")}
        >Cancel</Button>
      ) : null,
    },
  ], [busy]);

  if (!rows) return <Loading />;

  const totalValue = rows.filter((row) => row.status !== "CANCELLED").reduce(
    (sum, row) => sum + row.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.rate), 0),
    0,
  );
  const partialCount = rows.filter((row) => row.status === "PARTIALLY_RECEIVED").length;
  const receivedCount = rows.filter((row) => row.status === "RECEIVED").length;
  const draftTotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Purchases & Material Receiving</h2>
          <p className="text-sm text-gray-500">Create supplier POs, record full or partial GRNs, and post received material into inventory.</p>
        </div>
        <Badge tone="info">{openPurchaseOrders.length} PO{openPurchaseOrders.length === 1 ? "" : "s"} awaiting material</Badge>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${message.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total POs" value={String(rows.length)} caption={`${openPurchaseOrders.length} currently open`} icon={ShoppingCart} />
        <KpiCard title="Partial receipts" value={String(partialCount)} caption="Material still pending" icon={CalendarClock} />
        <KpiCard title="Fully received" value={String(receivedCount)} caption="Completed purchase orders" icon={PackageCheck} />
        <KpiCard title="Ordered value" value={money(totalValue)} caption="Excludes cancelled POs" icon={IndianRupee} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-bold">Create Purchase Order</h3><p className="text-sm text-gray-500">Add one or more supplier items with commercial details.</p></div>
          <div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-400">Order total</p><p className="text-xl font-bold text-primary">{money(draftTotal)}</p></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label><span className="erp-label">Supplier</span><select className="erp-input" value={purchase.supplierId} onChange={(event) => setPurchase({ ...purchase, supplierId: event.target.value })}>
              <option value="">Select active supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>)}
            </select></label>
            <label><span className="erp-label">Expected delivery</span><Input type="date" value={purchase.expectedDate} onChange={(event) => setPurchase({ ...purchase, expectedDate: event.target.value })} /></label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr>
                <th className="px-3 py-3">Item code</th><th className="px-3 py-3">Item name</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3 text-right">Amount</th><th className="w-12" />
              </tr></thead>
              <tbody className="divide-y">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="p-2"><Input value={line.itemCode} onChange={(event) => updateLine(index, "itemCode", event.target.value)} placeholder="YRN-30-C" /></td>
                    <td className="p-2"><Input value={line.itemName} onChange={(event) => updateLine(index, "itemName", event.target.value)} placeholder="30s Combed Yarn" /></td>
                    <td className="p-2"><Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} placeholder="0.000" /></td>
                    <td className="p-2"><select className="erp-input" value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)}><option>KG</option><option>CONE</option><option>BAG</option><option>LTR</option><option>PCS</option><option>ROLL</option></select></td>
                    <td className="p-2"><Input min="0" step="0.01" type="number" value={line.rate} onChange={(event) => updateLine(index, "rate", event.target.value)} placeholder="0.00" /></td>
                    <td className="p-3 text-right font-semibold">{money(Number(line.quantity || 0) * Number(line.rate || 0))}</td>
                    <td className="pr-2"><Button aria-label="Remove item" size="sm" variant="ghost" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={15} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={16} />Add Item</Button>
            <Button disabled={busy || suppliers.length === 0} onClick={createPurchaseOrder}><ShoppingCart size={16} />{busy ? "Saving..." : "Create Purchase Order"}</Button>
          </div>
          {suppliers.length === 0 && <p className="text-sm text-amber-700">Create an active supplier in Masters before creating a purchase order.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-bold">Receive Material (GRN)</h3><p className="text-sm text-gray-500">Enter only the quantity received today. Remaining quantities stay open automatically.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="erp-label">Open purchase order</span><select className="erp-input" value={receipt.purchaseOrderId} onChange={(event) => setReceipt({ ...receipt, purchaseOrderId: event.target.value })}>
              <option value="">Select purchase order</option>{openPurchaseOrders.map((row) => <option key={row.id} value={row.id}>{row.poNo} · {row.supplier.name}</option>)}
            </select></label>
            <label><span className="erp-label">Receiving warehouse</span><select className="erp-input" value={receipt.warehouseId} onChange={(event) => setReceipt({ ...receipt, warehouseId: event.target.value })}>
              <option value="">Select warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
            </select></label>
            <label><span className="erp-label">Stock category</span><select className="erp-input" value={receipt.category} onChange={(event) => setReceipt({ ...receipt, category: event.target.value })}>
              <option>RAW_MATERIAL</option><option>YARN</option><option>CHEMICAL</option><option>PACKING</option><option>GREY_FABRIC</option><option>FINISHED_FABRIC</option>
            </select></label>
            <label><span className="erp-label">Supplier lot / batch</span><Input value={receipt.lotNo} onChange={(event) => setReceipt({ ...receipt, lotNo: event.target.value })} placeholder="Optional lot number" /></label>
          </div>

          {selectedPurchaseOrder ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Ordered</th><th className="px-4 py-3">Already received</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Receive now</th></tr></thead>
                <tbody className="divide-y">{selectedPurchaseOrder.items.map((item) => {
                  const received = receivedQuantity(item); const remaining = remainingQuantity(item);
                  return <tr key={item.id}>
                    <td className="px-4 py-3"><p className="font-semibold">{item.itemName}</p><p className="text-xs text-gray-400">{item.itemCode}</p></td>
                    <td className="px-4 py-3">{Number(item.quantity).toFixed(3)} {item.unit}</td>
                    <td className="px-4 py-3 text-blue-700">{received.toFixed(3)} {item.unit}</td>
                    <td className="px-4 py-3 font-semibold">{remaining.toFixed(3)} {item.unit}</td>
                    <td className="px-4 py-2"><Input className="max-w-44" type="number" min="0" max={remaining} step="0.001" disabled={remaining <= 0} value={receiptQuantities[item.id] || ""} onChange={(event) => setReceiptQuantities((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0.000" /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">Select an open purchase order to view pending material.</div>}

          <div className="flex justify-end"><Button disabled={busy || !selectedPurchaseOrder} onClick={receiveMaterial}><ClipboardCheck size={16} />{busy ? "Posting..." : "Create Goods Receipt"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-bold">Purchase Register</h3><p className="text-sm text-gray-500">Complete PO, delivery, GRN, and line-level receiving history.</p></CardHeader>
        <CardContent><DataTable data={rows} columns={columns} searchPlaceholder="Search PO, supplier, item, status..." /></CardContent>
      </Card>
    </div>
  );
}
