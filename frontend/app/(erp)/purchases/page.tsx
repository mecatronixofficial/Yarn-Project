"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  IndianRupee,
  PackageCheck,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { money } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
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
      toast.success(successMessage);
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
      const validationMessage = "Select a supplier and complete every item code, name, quantity, and rate.";
      setMessage({ text: validationMessage, error: true });
      toast.warning(validationMessage, "Check purchase order");
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
      const validationMessage = "Select a purchase order and receiving warehouse.";
      setMessage({ text: validationMessage, error: true });
      toast.warning(validationMessage, "Check receipt");
      return;
    }
    const items = selectedPurchaseOrder.items
      .map((item) => ({ purchaseOrderItemId: item.id, quantity: Number(receiptQuantities[item.id] || 0) }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      const validationMessage = "Enter a received quantity for at least one item.";
      setMessage({ text: validationMessage, error: true });
      toast.warning(validationMessage, "Check receipt");
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
    {
      header: "Supplier",
      accessorFn: (row) => row.supplier.name,
      cell: ({ row }) => <span className="block max-w-32 truncate">{row.original.supplier.name}</span>,
    },
    {
      header: "Items / receipt progress",
      cell: ({ row }) => (
        <div className="w-56 max-w-56 space-y-1.5">
          {row.original.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-gray-700">{item.itemCode} · {item.itemName}</span>
              <span className="shrink-0 whitespace-nowrap font-medium">{receivedQuantity(item).toFixed(3)} / {Number(item.quantity).toFixed(3)} {item.unit}</span>
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
    <div className="purchases-page">
      <div className="purchases-page-header">
        <span className="purchases-page-icon">
          <Truck size={18} />
        </span>
        <div>
          <h2 className="text-lg font-bold md:text-xl">Purchases & Material Receiving</h2>
          <p className="text-xs text-gray-500">Create supplier POs, record full or partial GRNs, and post received material into inventory.</p>
        </div>
        <span className="purchases-header-badge"><Badge tone="info">{openPurchaseOrders.length} PO{openPurchaseOrders.length === 1 ? "" : "s"} awaiting material</Badge></span>
      </div>

      {message && (
        <div className={`purchases-message ${message.error ? "purchases-message--error" : "purchases-message--success"}`}>
          <CheckCircle2 size={15} />
          {message.text}
        </div>
      )}

      <div className="purchases-stats grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="purchases-stat-tile purchases-stat-tile--total">
          <div className="purchases-stat-icon"><ShoppingCart size={15} /></div>
          <div>
            <p className="purchases-stat-label">Total POs</p>
            <p className="purchases-stat-value">{rows.length}</p>
            <p className="purchases-stat-caption">{openPurchaseOrders.length} currently open</p>
          </div>
        </div>
        <div className="purchases-stat-tile purchases-stat-tile--partial">
          <div className="purchases-stat-icon"><CalendarClock size={15} /></div>
          <div>
            <p className="purchases-stat-label">Partial receipts</p>
            <p className="purchases-stat-value">{partialCount}</p>
            <p className="purchases-stat-caption">Material still pending</p>
          </div>
        </div>
        <div className="purchases-stat-tile purchases-stat-tile--received">
          <div className="purchases-stat-icon"><PackageCheck size={15} /></div>
          <div>
            <p className="purchases-stat-label">Fully received</p>
            <p className="purchases-stat-value">{receivedCount}</p>
            <p className="purchases-stat-caption">Completed purchase orders</p>
          </div>
        </div>
        <div className="purchases-stat-tile purchases-stat-tile--value">
          <div className="purchases-stat-icon"><IndianRupee size={15} /></div>
          <div>
            <p className="purchases-stat-label">Ordered value</p>
            <p className="purchases-stat-value">{money(totalValue)}</p>
            <p className="purchases-stat-caption">Excludes cancelled POs</p>
          </div>
        </div>
      </div>

      <Card className="purchases-card purchases-card--po">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="purchases-card-heading">
            <span className="purchases-step-badge purchases-step-badge--1"><ShoppingCart size={14} /></span>
            <div><h3 className="font-bold">Create Purchase Order</h3><p className="text-xs text-gray-500">Add one or more supplier items with commercial details.</p></div>
          </div>
          <div className="purchases-order-total"><p>Order total</p><p>{money(draftTotal)}</p></div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2.5 md:grid-cols-2">
            <label><span className="erp-label">Supplier</span><select className="erp-input" value={purchase.supplierId} onChange={(event) => setPurchase({ ...purchase, supplierId: event.target.value })}>
              <option value="">Select active supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>)}
            </select></label>
            <label><span className="erp-label">Expected delivery</span><Input type="date" value={purchase.expectedDate} onChange={(event) => setPurchase({ ...purchase, expectedDate: event.target.value })} /></label>
          </div>

          <div className="purchases-line-table overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[850px] text-sm">
              <thead><tr>
                <th className="px-3 py-2.5">Item code</th><th className="px-3 py-2.5">Item name</th><th className="px-3 py-2.5">Quantity</th><th className="px-3 py-2.5">Unit</th><th className="px-3 py-2.5">Rate</th><th className="px-3 py-2.5 text-right">Amount</th><th className="w-10" />
              </tr></thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="p-1.5"><Input value={line.itemCode} onChange={(event) => updateLine(index, "itemCode", event.target.value)} placeholder="YRN-30-C" /></td>
                    <td className="p-1.5"><Input value={line.itemName} onChange={(event) => updateLine(index, "itemName", event.target.value)} placeholder="30s Combed Yarn" /></td>
                    <td className="p-1.5"><Input min="0.001" step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} placeholder="0.000" /></td>
                    <td className="p-1.5"><select className="erp-input" value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)}><option>KG</option><option>CONE</option><option>BAG</option><option>LTR</option><option>PCS</option><option>ROLL</option></select></td>
                    <td className="p-1.5"><Input min="0" step="0.01" type="number" value={line.rate} onChange={(event) => updateLine(index, "rate", event.target.value)} placeholder="0.00" /></td>
                    <td className="p-2 text-right font-semibold">{money(Number(line.quantity || 0) * Number(line.rate || 0))}</td>
                    <td className="pr-1.5"><button type="button" aria-label="Remove item" className="purchases-row-action purchases-row-action--delete" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" className="purchases-action-btn purchases-action-btn--outline" onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={16} />Add Item</Button>
            <Button className="purchases-action-btn" disabled={busy || suppliers.length === 0} onClick={createPurchaseOrder}><ShoppingCart size={16} />{busy ? "Saving..." : "Create Purchase Order"}</Button>
          </div>
          {suppliers.length === 0 && <p className="text-xs text-amber-700">Create an active supplier in Masters before creating a purchase order.</p>}
        </CardContent>
      </Card>

      <Card className="purchases-card purchases-card--receive">
        <CardHeader>
          <div className="purchases-card-heading">
            <span className="purchases-step-badge purchases-step-badge--2"><ClipboardCheck size={14} /></span>
            <div><h3 className="font-bold">Receive Material (GRN)</h3><p className="text-xs text-gray-500">Enter only the quantity received today. Remaining quantities stay open automatically.</p></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
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
            <div className="purchases-line-table overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr><th className="px-3 py-2.5">Item</th><th className="px-3 py-2.5">Ordered</th><th className="px-3 py-2.5">Already received</th><th className="px-3 py-2.5">Remaining</th><th className="px-3 py-2.5">Receive now</th></tr></thead>
                <tbody>{selectedPurchaseOrder.items.map((item) => {
                  const received = receivedQuantity(item); const remaining = remainingQuantity(item);
                  return <tr key={item.id}>
                    <td className="px-3 py-2"><p className="font-semibold">{item.itemName}</p><p className="text-xs text-gray-400">{item.itemCode}</p></td>
                    <td className="px-3 py-2">{Number(item.quantity).toFixed(3)} {item.unit}</td>
                    <td className="px-3 py-2 text-blue-700">{received.toFixed(3)} {item.unit}</td>
                    <td className="px-3 py-2 font-semibold">{remaining.toFixed(3)} {item.unit}</td>
                    <td className="px-3 py-1.5"><Input className="max-w-44" type="number" min="0" max={remaining} step="0.001" disabled={remaining <= 0} value={receiptQuantities[item.id] || ""} onChange={(event) => setReceiptQuantities((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="0.000" /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : <div className="purchases-empty">Select an open purchase order to view pending material.</div>}

          <div className="flex justify-end"><Button className="purchases-action-btn" disabled={busy || !selectedPurchaseOrder} onClick={receiveMaterial}><ClipboardCheck size={16} />{busy ? "Posting..." : "Create Goods Receipt"}</Button></div>
        </CardContent>
      </Card>

      <Card className="purchases-card purchases-card--register purchases-register-card">
        <CardHeader>
          <div className="purchases-card-heading">
            <span className="purchases-step-badge purchases-step-badge--3"><PackageCheck size={14} /></span>
            <div><h3 className="font-bold">Purchase Register</h3><p className="text-xs text-gray-500">Complete PO, delivery, GRN, and line-level receiving history.</p></div>
          </div>
        </CardHeader>
        <CardContent><DataTable data={rows} columns={columns} searchPlaceholder="Search PO, supplier, item, status..." /></CardContent>
      </Card>
    </div>
  );
}
