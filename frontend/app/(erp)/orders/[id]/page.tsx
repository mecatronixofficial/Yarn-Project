"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Factory,
  FileText,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { cn, kg, money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/empty";
import { Loading } from "@/components/loading";
import { OrderEditForm } from "@/components/order-edit-form";

type OrderStatus =
  | "DRAFT" | "CONFIRMED" | "PLANNING" | "IN_PRODUCTION"
  | "PARTIALLY_COMPLETED" | "READY" | "PARTIALLY_DISPATCHED"
  | "DISPATCHED" | "PARTIALLY_DELIVERED" | "DELIVERED" | "CLOSED" | "CANCELLED";

type OrderItem = {
  id: string; fabricType: string; yarnType: string; yarnCount: string; color: string;
  gsm?: number; diameter?: string; width?: string; quantityKg: string; rate?: string; amount?: string;
};
type ProductionOrder = {
  id: string; productionNo: string; salesOrderItemId: string; plannedQtyKg: string;
  requiredYarnKg: string; priority: string; startDate?: string; dueDate?: string; status: string;
};
type PackingList = { id: string; packingNo: string; netWeightKg: string };
type Dispatch = {
  id: string; dispatchNo: string; dispatchDate: string; vehicle?: string; transporter?: string;
  lrNumber?: string; totalWeightKg: string; status: string;
  deliveries: Array<{ id: string; receivedKg: string }>;
};
type Invoice = {
  id: string; invoiceNo: string; totalAmount: string; dueDate?: string; status: string;
  payments: Array<{ id: string; amount: string }>;
};
type SalesOrder = {
  id: string; orderNo: string; poNumber?: string; orderDate: string; expectedDelivery?: string;
  status: OrderStatus; notes?: string;
  customer: { id: string; code: string; name: string; contactPerson?: string; mobile?: string; email?: string; city?: string };
  items: OrderItem[]; productionOrders: ProductionOrder[]; packingLists: PackingList[];
  dispatches: Dispatch[]; invoices: Invoice[];
};
type TraceRow = { stage: string; input: number; output: number; waste: number; balance: number };
type Traceability = {
  orderedKg: number; qcApprovedKg: number; deliveredKg: number; orderPendingKg: number;
  readyPendingDeliveryKg: number; productionShortfallKg: number; invoicedAmount: number;
  paidAmount: number; paymentPendingAmount: number;
  stages: Array<{ productionNo: string; status: string; planned: number; rows: TraceRow[] }>;
};
type ProductionForm = {
  salesOrderItemId: string; plannedQtyKg: string; requiredYarnKg: string;
  priority: string; startDate: string; dueDate: string;
};
type Notice = { tone: "success" | "error"; text: string } | null;

const plannableStatuses: OrderStatus[] = ["CONFIRMED", "PLANNING", "IN_PRODUCTION", "PARTIALLY_COMPLETED"];
const workflowSteps = [
  { label: "Order", icon: FileText }, { label: "Planned", icon: CalendarDays },
  { label: "Production", icon: Factory }, { label: "Ready", icon: PackageCheck },
  { label: "Dispatch", icon: Truck }, { label: "Delivered", icon: CheckCircle2 },
  { label: "Closed", icon: Check },
];

const num = (value: string | number | null | undefined) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};
const label = (value: string) => value.replaceAll("_", " ");
const date = (value?: string) => {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not set"
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const tone = (status: string): "default" | "success" | "warning" | "danger" | "info" => {
  if (["CLOSED", "DELIVERED", "PAID", "COMPLETED", "PASSED"].includes(status)) return "success";
  if (["CANCELLED", "REJECTED", "RETURNED", "OVERDUE"].includes(status)) return "danger";
  if (["DRAFT", "WAITING", "HOLD"].includes(status)) return "default";
  if (["CONFIRMED", "READY", "ISSUED", "DISPATCHED", "IN_TRANSIT"].includes(status)) return "info";
  return "warning";
};

function Field({ children }: { children: ReactNode }) {
  return <label className="erp-label">{children}</label>;
}
function Metric({ label: title, value, helper, icon: Icon, color = "slate" }: {
  label: string; value: string; helper?: string; icon: LucideIcon;
  color?: "slate" | "green" | "amber" | "blue" | "red" | "violet";
}) {
  const icons = {
    slate: "bg-slate-100 text-slate-600", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700", red: "bg-red-100 text-red-700", violet: "bg-violet-100 text-violet-700",
  };
  return <div className={cn("order-metric", `order-metric--${color}`)}>
    <div className="flex items-center gap-3">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", icons[color])}><Icon size={17} /></div>
      <div className="min-w-0"><p className="truncate text-xs font-medium text-gray-500">{title}</p>
        <p className="mt-0.5 truncate text-xl font-bold tracking-tight text-gray-950">{value}</p></div>
    </div>
    {helper && <p className="mt-3 border-t border-black/5 pt-2 text-[11px] font-medium text-gray-500">{helper}</p>}
  </div>;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [trace, setTrace] = useState<Traceability | null>(null);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const [production, setProduction] = useState<ProductionForm>({
    salesOrderItemId: "", plannedQtyKg: "", requiredYarnKg: "", priority: "NORMAL", startDate: "", dueDate: "",
  });

  const remainingFor = useCallback((data: SalesOrder, itemId: string) => {
    const ordered = num(data.items.find((item) => item.id === itemId)?.quantityKg);
    const planned = data.productionOrders
      .filter((row) => row.salesOrderItemId === itemId)
      .reduce((sum, row) => sum + num(row.plannedQtyKg), 0);
    return Math.max(0, ordered - planned);
  }, []);

  const applyPlanningDefaults = useCallback((data: SalesOrder, preferredId?: string) => {
    const itemId = data.items.find((item) => item.id === preferredId)?.id
      || data.items.find((item) => remainingFor(data, item.id) > 0)?.id || data.items[0]?.id || "";
    const remaining = remainingFor(data, itemId);
    setProduction((current) => ({ ...current, salesOrderItemId: itemId,
      plannedQtyKg: remaining ? String(remaining) : "",
      requiredYarnKg: remaining ? String(Number((remaining * 1.08).toFixed(3))) : "" }));
  }, [remainingFor]);

  const load = useCallback(async () => {
    if (!id) return;
    setPageError("");
    try {
      const [orderData, traceData] = await Promise.all([
        api<SalesOrder>(`/orders/${id}`), api<{ data: Traceability }>(`/orders/${id}/traceability`),
      ]);
      setOrder(orderData); setTrace(traceData.data);
      setProduction((current) => {
        if (current.salesOrderItemId && orderData.items.some((item) => item.id === current.salesOrderItemId)) return current;
        const itemId = orderData.items.find((item) => remainingFor(orderData, item.id) > 0)?.id || orderData.items[0]?.id || "";
        const remaining = remainingFor(orderData, itemId);
        return { ...current, salesOrderItemId: itemId, plannedQtyKg: remaining ? String(remaining) : "",
          requiredYarnKg: remaining ? String(Number((remaining * 1.08).toFixed(3))) : "" };
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load this sales order.");
    }
  }, [id, remainingFor]);
  useEffect(() => { void load(); }, [load]);

  const selectedItem = useMemo(() => order?.items.find((item) => item.id === production.salesOrderItemId), [order, production.salesOrderItemId]);
  const remaining = order ? remainingFor(order, production.salesOrderItemId) : 0;
  const total = order?.items.reduce((sum, item) => sum + num(item.amount), 0) ?? 0;
  const producedPct = trace?.orderedKg ? Math.min(100, trace.qcApprovedKg / trace.orderedKg * 100) : 0;
  const deliveredPct = trace?.orderedKg ? Math.min(100, trace.deliveredKg / trace.orderedKg * 100) : 0;

  const orderAction = async (action: "confirm" | "cancel" | "close") => {
    if (action === "cancel" && !window.confirm("Cancel this sales order? This action cannot be undone.")) return;
    setNotice(null); setBusy(action);
    try {
      await api(`/orders/${id}/${action}`, { method: "POST" });
      const successMessage = action === "confirm" ? "Order confirmed and ready for planning."
        : action === "cancel" ? "Sales order cancelled." : "Sales order closed successfully.";
      setNotice({ tone: "success", text: successMessage });
      toast.success(successMessage);
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Action failed." });
    } finally { setBusy(""); }
  };

  const createProduction = async () => {
    if (!order) return;
    const planned = num(production.plannedQtyKg), yarn = num(production.requiredYarnKg);
    let error = "";
    if (!production.salesOrderItemId) error = "Select an order item to plan.";
    else if (planned <= 0 || yarn <= 0) error = "Planned quantity and required yarn must be greater than zero.";
    else if (planned > remaining + 0.001) error = `Only ${kg(remaining)} remains unplanned for this item.`;
    else if (production.startDate && production.dueDate && production.dueDate < production.startDate) error = "Due date cannot be earlier than start date.";
    if (error) {
      setNotice({ tone: "error", text: error });
      toast.warning(error, "Check production plan");
      return;
    }
    setNotice(null); setBusy("production");
    try {
      await api(`/orders/${id}/production-orders`, { method: "POST", body: JSON.stringify({
        ...production, plannedQtyKg: planned, requiredYarnKg: yarn,
        startDate: production.startDate || undefined, dueDate: production.dueDate || undefined,
      }) });
      const [orderData, traceData] = await Promise.all([
        api<SalesOrder>(`/orders/${id}`), api<{ data: Traceability }>(`/orders/${id}/traceability`),
      ]);
      setOrder(orderData); setTrace(traceData.data); applyPlanningDefaults(orderData, production.salesOrderItemId);
      setNotice({ tone: "success", text: "Production order created successfully." });
      toast.success("Production order created successfully.");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Unable to create production order." });
    } finally { setBusy(""); }
  };

  const deleteOrder = async () => {
    if (!order || !window.confirm(`Permanently delete ${order.orderNo}? This cannot be undone.`)) return;
    setNotice(null); setBusy("delete");
    try {
      await api(`/orders/${id}`, { method: "DELETE" });
      toast.success(`${order.orderNo} deleted.`);
      router.push("/orders");
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Unable to delete the order." });
      setBusy("");
    }
  };

  if (!order || !trace) {
    if (!pageError) return <Loading />;
    return <Card className="mx-auto max-w-2xl"><CardContent className="py-14 text-center">
      <AlertCircle className="mx-auto text-red-500" size={34} /><h2 className="mt-4 text-lg font-bold">Could not load sales order</h2>
      <p className="mt-1 text-sm text-gray-500">{pageError}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/orders" className="inline-flex h-11 items-center rounded-xl border px-4 text-sm font-semibold">Back to orders</Link>
        <Button onClick={() => void load()}><RotateCcw size={16} />Retry</Button>
      </div>
    </CardContent></Card>;
  }

  const workflowIndex = order.status === "DRAFT" || order.status === "CONFIRMED" ? 0
    : order.status === "PLANNING" ? 1 : ["IN_PRODUCTION", "PARTIALLY_COMPLETED"].includes(order.status) ? 2
    : order.status === "READY" ? 3 : ["PARTIALLY_DISPATCHED", "DISPATCHED"].includes(order.status) ? 4
    : ["PARTIALLY_DELIVERED", "DELIVERED"].includes(order.status) ? 5 : order.status === "CLOSED" ? 6 : -1;
  const trackingProgress = workflowIndex < 0 ? 0 : Math.round((workflowIndex + 1) / workflowSteps.length * 100);
  const currentStage = workflowIndex >= 0 ? workflowSteps[workflowIndex].label : "Cancelled";
  const nextStage = workflowIndex >= 0 && workflowIndex < workflowSteps.length - 1 ? workflowSteps[workflowIndex + 1].label : null;
  const trackingMessage = order.status === "DRAFT" ? "Waiting for order confirmation."
    : order.status === "CONFIRMED" ? "Confirmed and ready for production planning."
    : order.status === "PLANNING" ? "Production requirements are being planned."
    : ["IN_PRODUCTION", "PARTIALLY_COMPLETED"].includes(order.status) ? "Fabric is moving through production."
    : order.status === "READY" ? "Finished goods are ready for packing."
    : ["PARTIALLY_DISPATCHED", "DISPATCHED"].includes(order.status) ? "Goods are moving through dispatch."
    : ["PARTIALLY_DELIVERED", "DELIVERED"].includes(order.status) ? "Delivery is being completed."
    : order.status === "CLOSED" ? "Order, delivery, and payment are complete." : "This order is no longer active.";

  return <div className="sales-order-page -m-4 min-h-[calc(100vh-5rem)] bg-[#f3f6fb] p-4 md:-m-6 md:p-6">
  <div className="mx-auto max-w-[1600px] space-y-5">
    <section className="order-hero overflow-hidden">
      <div className="order-hero__rule" />
      <div className="p-5 md:p-7">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div>
          <Link href="/orders" className="order-back-link"><ArrowLeft size={15} />Sales orders</Link>
          <div className="mt-5 flex flex-wrap items-start gap-4">
            <div className="order-monogram">SO</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5"><p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white/60">{order.orderNo}</p><Badge tone={tone(order.status)}>{label(order.status)}</Badge></div>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl">{order.customer.name}</h1>
              <p className="mt-1 text-sm text-white/55">Customer order workspace and fulfilment record</p>
            </div>
          </div>
          <div className="order-meta-grid mt-6">
            <div><span>Customer code</span><strong><UserRound size={14} />{order.customer.code}</strong></div>
            <div><span>Order date</span><strong><CalendarDays size={14} />{date(order.orderDate)}</strong></div>
            <div><span>Expected delivery</span><strong><Truck size={14} />{date(order.expectedDelivery)}</strong></div>
            <div><span>Customer PO</span><strong>{order.poNumber || "Not provided"}</strong></div>
          </div>
        </div>
        <div className="order-actions-panel">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Order controls</p>
          <div className="flex flex-wrap gap-2">
            {order.status === "DRAFT" && <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" disabled={Boolean(busy)} onClick={() => setEditing((value) => !value)}><Pencil size={16} />{editing ? "Close editor" : "Edit order"}</Button>}
            {order.status === "DRAFT" && <Button className="bg-white text-[#151b2f] hover:bg-white/90" disabled={Boolean(busy)} onClick={() => void orderAction("confirm")}><CheckCircle2 size={16} />{busy === "confirm" ? "Confirming..." : "Confirm order"}</Button>}
            {["DRAFT", "CONFIRMED"].includes(order.status) && <Button variant="danger" disabled={Boolean(busy)} onClick={() => void orderAction("cancel")}>{busy === "cancel" ? "Cancelling..." : "Cancel order"}</Button>}
            {order.status === "DELIVERED" && <Button className="bg-white text-[#151b2f] hover:bg-white/90" disabled={Boolean(busy)} onClick={() => void orderAction("close")}><Check size={16} />{busy === "close" ? "Closing..." : "Close order"}</Button>}
            {["DRAFT", "CANCELLED"].includes(order.status) && <Button variant="danger" disabled={Boolean(busy)} onClick={() => void deleteOrder()}><Trash2 size={16} />{busy === "delete" ? "Deleting..." : "Delete order"}</Button>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10">
            <div className="bg-white/[0.04] p-3"><p className="text-[10px] uppercase tracking-wide text-white/45">Order value</p><p className="mt-1 text-lg font-bold text-white">{money(total)}</p></div>
            <div className="bg-white/[0.04] p-3"><p className="text-[10px] uppercase tracking-wide text-white/45">Line items</p><p className="mt-1 text-lg font-bold text-white">{order.items.length}</p></div>
          </div>
        </div>
      </div>
      </div>
    </section>

    <nav className="order-section-nav" aria-label="Sales order sections">
      <a href="#overview">Overview</a>
      <a href="#production">Production</a>
      {trace.stages.length > 0 && <a href="#traceability">Traceability</a>}
      <a href="#fulfilment">Fulfilment & finance</a>
    </nav>

    {notice && <div role="status" className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700")}>
      {notice.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{notice.text}</span>
    </div>}

    {editing && order.status === "DRAFT" && <OrderEditForm order={order} onCancel={() => setEditing(false)} onSaved={async () => {
      await load(); setEditing(false); setNotice({ tone: "success", text: "Sales order updated successfully." }); toast.success("Sales order updated successfully.");
    }} />}

    <section className="scroll-mt-36" id="overview">
    {order.status === "CANCELLED" ? <Card className="order-tracker border-red-200 bg-red-50">
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700"><AlertCircle size={20} /></div>
        <div className="flex-1"><h2 className="font-bold text-red-900">Order cancelled</h2><p className="mt-1 text-sm text-red-700">Tracking has stopped and no further activity can be added.</p></div><Badge tone="danger">Cancelled</Badge>
      </CardContent>
    </Card> : <Card className="order-tracker">
      <CardContent className="p-0">
        <div className="tracker-layout">
          <aside className="tracker-summary">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/55"><Truck size={15} />Live order status</div>
            <div className="tracker-summary-main">
              <div className="tracker-ring" style={{ background: `conic-gradient(#d3a64c ${trackingProgress}%, rgba(255,255,255,.12) 0)` }}>
                <div><strong>{trackingProgress}%</strong><span>complete</span></div>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/50">Current stage</p>
                <h2 className="mt-1 text-xl font-bold text-white">{currentStage}</h2>
                <p className="mt-2 text-xs leading-5 text-white/60">{trackingMessage}</p>
              </div>
            </div>
            <div className="tracker-summary-meta">
              <div><span>Next</span><strong>{nextStage || "Complete"}</strong></div>
              <div><span>Expected</span><strong>{date(order.expectedDelivery)}</strong></div>
            </div>
          </aside>
          <div className="tracker-timeline">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Order journey</p><h3 className="mt-1 text-lg font-bold text-primary">Track order</h3></div>
              <p className="text-xs text-gray-500">Updated from production and dispatch activity</p>
            </div>
            <div className="tracker-stage-grid">
              {workflowSteps.map(({ label: step, icon: Icon }, index) => {
                const complete = workflowIndex > index, active = workflowIndex === index;
                return <div key={step} className={cn("tracker-stage", complete && "is-complete", active && "is-active")}>
                  <div className="flex items-start justify-between gap-2"><span className="tracker-stage-number">{String(index + 1).padStart(2, "0")}</span><div className="tracker-stage-icon">{complete ? <Check size={16} /> : <Icon size={16} />}</div></div>
                  <p className="mt-4 text-xs font-bold text-gray-800">{step}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{complete ? "Done" : active ? "In progress" : "Waiting"}</p>
                </div>;
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>}
    </section>

    <Card className="order-metrics overflow-hidden"><CardContent className="p-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <Metric label="Ordered" value={kg(trace.orderedKg)} icon={FileText} />
        <Metric label="QC approved" value={kg(trace.qcApprovedKg)} helper={`${producedPct.toFixed(0)}% of order`} icon={PackageCheck} color="green" />
        <Metric label="Ready to dispatch" value={kg(trace.readyPendingDeliveryKg)} icon={Truck} color="blue" />
        <Metric label="Delivered" value={kg(trace.deliveredKg)} helper={`${deliveredPct.toFixed(0)}% fulfilled`} icon={CheckCircle2} color="green" />
        <Metric label="Order pending" value={kg(trace.orderPendingKg)} icon={Clock3} color="amber" />
        <Metric label="Production shortfall" value={kg(trace.productionShortfallKg)} icon={Factory} color="red" />
        <Metric label="Payment pending" value={money(trace.paymentPendingAmount)} helper={`${money(trace.paidAmount)} paid`} icon={CircleDollarSign} color="violet" />
    </div></CardContent></Card>

    <div className="scroll-mt-36 space-y-5" id="overview-details">
      <Card className="order-items-card"><CardHeader className="flex flex-row items-center justify-between"><div><h3 className="font-bold">Order items</h3><p className="mt-1 text-xs text-gray-500">Fabric specification, quantity, and value.</p></div><Badge tone="info">{order.items.length} {order.items.length === 1 ? "item" : "items"}</Badge></CardHeader>
        <CardContent className="p-0"><div className="order-items-table-wrap"><table className="order-items-table w-full table-fixed text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Fabric</th><th className="px-4 py-3">Yarn</th><th className="px-4 py-3">Specification</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3 text-right">Rate / KG</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y">{order.items.map((item) => <tr key={item.id} className="hover:bg-gray-50/60">
            <td data-label="Fabric" className="px-5 py-4"><div><p className="font-semibold">{item.fabricType}</p><p className="mt-0.5 text-xs text-gray-500">{item.color}</p></div></td>
            <td data-label="Yarn" className="px-4 py-4"><div><p className="font-medium">{item.yarnType}</p><p className="mt-0.5 text-xs text-gray-500">Count {item.yarnCount}</p></div></td>
            <td data-label="Specification" className="px-4 py-4 text-gray-600">{[item.gsm ? `${item.gsm} GSM` : "", item.diameter, item.width].filter(Boolean).join(" · ") || "—"}</td>
            <td data-label="Quantity" className="px-4 py-4 text-right font-semibold">{kg(item.quantityKg)}</td><td data-label="Rate / KG" className="px-4 py-4 text-right">{item.rate ? money(item.rate) : "—"}</td><td data-label="Amount" className="px-5 py-4 text-right font-bold">{item.amount ? money(item.amount) : "—"}</td>
          </tr>)}</tbody>
          <tfoot className="border-t bg-gray-50"><tr><td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Order value</td><td className="px-5 py-3 text-right text-base font-bold">{money(total)}</td></tr></tfoot>
        </table></div></CardContent>
      </Card>
      <Card className="order-information-card"><CardHeader><h3 className="font-bold">Order information</h3><p className="mt-1 text-xs text-gray-500">Commercial and contact details.</p></CardHeader><CardContent className="order-information-grid text-sm">
        <div><p className="text-xs text-gray-500">Order value</p><p className="mt-1 font-bold">{money(total)}</p></div><div><p className="text-xs text-gray-500">Invoiced</p><p className="mt-1 font-bold">{money(trace.invoicedAmount)}</p></div>
        <div><p className="text-xs text-gray-500">Contact</p><p className="mt-1 font-semibold">{order.customer.mobile || "Not provided"}</p></div><div><p className="text-xs text-gray-500">Email</p><p className="mt-1 truncate font-semibold">{order.customer.email || "Not provided"}</p></div>
        <div className="order-notes"><p className="text-xs text-gray-500">Notes</p><p className="mt-1.5 leading-6 text-gray-700">{order.notes || "No notes added to this order."}</p></div>
      </CardContent></Card>
    </div>

    <div className="scroll-mt-36 space-y-5" id="production">
    {plannableStatuses.includes(order.status) && <Card className="production-planner"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Factory size={19} /></div><div><h3 className="font-bold">Production planning</h3><p className="mt-1 text-xs text-gray-500">Create a plan from the remaining unplanned quantity.</p></div></div>
      <Badge tone={remaining > 0 ? "warning" : "success"}>{remaining > 0 ? `${kg(remaining)} unplanned` : "Fully planned"}</Badge>
    </div></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <div className="md:col-span-2 xl:col-span-2"><Field>Order item</Field><select className="erp-input" value={production.salesOrderItemId} onChange={(event) => {
        const itemId = event.target.value, available = remainingFor(order, itemId);
        setProduction((current) => ({ ...current, salesOrderItemId: itemId, plannedQtyKg: available ? String(available) : "", requiredYarnKg: available ? String(Number((available * 1.08).toFixed(3))) : "" }));
      }}>{order.items.map((item) => <option key={item.id} value={item.id}>{item.fabricType} · {item.color} · {kg(remainingFor(order, item.id))} remaining</option>)}</select></div>
      <div><Field>Planned quantity (KG)</Field><Input type="number" min="0.001" step="0.001" max={remaining || undefined} value={production.plannedQtyKg} onChange={(event) => {
        const plannedQtyKg = event.target.value, required = num(plannedQtyKg) * 1.08;
        setProduction((current) => ({ ...current, plannedQtyKg, requiredYarnKg: plannedQtyKg ? String(Number(required.toFixed(3))) : "" }));
      }} placeholder="0.000" /></div>
      <div><Field>Required yarn (KG)</Field><Input type="number" min="0.001" step="0.001" value={production.requiredYarnKg} onChange={(event) => setProduction((current) => ({ ...current, requiredYarnKg: event.target.value }))} /></div>
      <div><Field>Priority</Field><select className="erp-input" value={production.priority} onChange={(event) => setProduction((current) => ({ ...current, priority: event.target.value }))}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
      <div><Field>Start date</Field><Input type="date" value={production.startDate} onChange={(event) => setProduction((current) => ({ ...current, startDate: event.target.value }))} /></div>
      <div className="xl:col-start-5"><Field>Due date</Field><Input type="date" min={production.startDate || undefined} value={production.dueDate} onChange={(event) => setProduction((current) => ({ ...current, dueDate: event.target.value }))} /></div>
      <div className="flex items-end xl:col-span-2"><Button className="w-full" disabled={Boolean(busy) || remaining <= 0 || !selectedItem} onClick={() => void createProduction()}><Plus size={16} />{busy === "production" ? "Creating..." : "Create production order"}</Button></div>
    </div></CardContent></Card>}

    <Card className="production-orders-card"><CardHeader className="flex flex-row items-center justify-between gap-3"><div><h3 className="font-bold">Production orders</h3><p className="mt-1 text-xs text-gray-500">Plans created against this sales order.</p></div><Link href="/production" className="text-xs font-semibold text-primary hover:underline">Open production</Link></CardHeader>
      <CardContent className={order.productionOrders.length ? "p-0" : ""}>{order.productionOrders.length === 0 ? <Empty title="No production orders" description={order.status === "DRAFT" ? "Confirm this order before production planning." : "Create the first production plan above."} />
      : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500"><tr><th className="px-5 py-3">Production order</th><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-right">Planned</th><th className="px-4 py-3 text-right">Yarn required</th><th className="px-4 py-3">Schedule</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{order.productionOrders.map((row) => { const item = order.items.find((value) => value.id === row.salesOrderItemId); return <tr key={row.id} className="hover:bg-gray-50/60">
          <td className="px-5 py-4"><p className="font-bold text-primary">{row.productionNo}</p><p className="mt-0.5 text-xs text-gray-500">{label(row.priority)} priority</p></td><td className="px-4 py-4"><p className="font-medium">{item?.fabricType || "Order item"}</p><p className="text-xs text-gray-500">{item?.color || "—"}</p></td>
          <td className="px-4 py-4 text-right font-semibold">{kg(row.plannedQtyKg)}</td><td className="px-4 py-4 text-right">{kg(row.requiredYarnKg)}</td><td className="px-4 py-4 text-xs text-gray-600">{date(row.startDate)} – {date(row.dueDate)}</td><td className="px-5 py-4"><Badge tone={tone(row.status)}>{label(row.status)}</Badge></td>
        </tr>; })}</tbody></table></div>}</CardContent>
    </Card>
    </div>

    {trace.stages.length > 0 && <div className="scroll-mt-36 space-y-4" id="traceability"><div className="order-section-heading"><span>03</span><div><h3>Material traceability</h3><p>Input, output, and process loss for every production order.</p></div></div>
      {trace.stages.map((stage) => <Card className="traceability-card" key={stage.productionNo}><CardHeader><div className="flex items-center justify-between gap-3"><div><h4 className="font-bold">{stage.productionNo}</h4><p className="mt-1 text-xs text-gray-500">Planned {kg(stage.planned)}</p></div><Badge tone={tone(stage.status)}>{label(stage.status)}</Badge></div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500"><tr><th className="px-5 py-3">Stage</th><th className="px-4 py-3 text-right">Input</th><th className="px-4 py-3 text-right">Output</th><th className="px-4 py-3 text-right">Waste / loss</th><th className="px-5 py-3 text-right">Balance</th></tr></thead>
          <tbody className="divide-y">{stage.rows.map((row) => <tr key={row.stage} className="hover:bg-gray-50/60"><td className="px-5 py-3.5 font-semibold">{row.stage}</td><td className="px-4 py-3.5 text-right">{kg(row.input)}</td><td className="px-4 py-3.5 text-right">{kg(row.output)}</td><td className="px-4 py-3.5 text-right text-red-600">{kg(row.waste)}</td><td className={cn("px-5 py-3.5 text-right font-bold", Math.abs(row.balance) > 0.01 ? "text-amber-600" : "text-emerald-700")}>{kg(row.balance)}</td></tr>)}</tbody>
        </table></div></CardContent></Card>)}</div>}

    <div className="scroll-mt-36" id="fulfilment"><div className="order-section-heading mb-4"><span>04</span><div><h3>Fulfilment & finance</h3><p>Delivery progress, invoicing, and collection status.</p></div></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><h3 className="font-bold">Packing & dispatch</h3><p className="mt-1 text-xs text-gray-500">Shipment and delivery status.</p></div><Link href="/dispatch" className="text-xs font-semibold text-primary hover:underline">Manage dispatch</Link></CardHeader><CardContent className="space-y-3">
        {order.dispatches.length === 0 ? <Empty title="No dispatches yet" description={`${order.packingLists.length} packing list${order.packingLists.length === 1 ? "" : "s"} created for this order.`} /> : order.dispatches.map((row) => {
          const received = row.deliveries.reduce((sum, delivery) => sum + num(delivery.receivedKg), 0);
          return <div key={row.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{row.dispatchNo}</p><p className="mt-1 text-xs text-gray-500">{date(row.dispatchDate)} · {row.transporter || "Transporter not set"}</p></div><Badge tone={tone(row.status)}>{label(row.status)}</Badge></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-gray-500">Dispatched</p><p className="mt-1 font-semibold">{kg(row.totalWeightKg)}</p></div><div><p className="text-xs text-gray-500">Received</p><p className="mt-1 font-semibold">{kg(received)}</p></div><div><p className="text-xs text-gray-500">Vehicle / LR</p><p className="mt-1 truncate font-semibold">{row.vehicle || row.lrNumber || "—"}</p></div></div>
          </div>;
        })}
      </CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><h3 className="font-bold">Invoices & payments</h3><p className="mt-1 text-xs text-gray-500">Receivables connected to this order.</p></div><Link href="/finance" className="text-xs font-semibold text-primary hover:underline">Open finance</Link></CardHeader><CardContent className="space-y-3">
        {order.invoices.length === 0 ? <Empty title="No invoices yet" description="Create an invoice from Finance when goods are ready." /> : order.invoices.map((invoice) => {
          const paid = invoice.payments.reduce((sum, payment) => sum + num(payment.amount), 0);
          return <div key={invoice.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{invoice.invoiceNo}</p><p className="mt-1 text-xs text-gray-500">Due {date(invoice.dueDate)}</p></div><Badge tone={tone(invoice.status)}>{label(invoice.status)}</Badge></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-gray-500">Invoice</p><p className="mt-1 font-semibold">{money(invoice.totalAmount)}</p></div><div><p className="text-xs text-gray-500">Paid</p><p className="mt-1 font-semibold text-emerald-700">{money(paid)}</p></div><div><p className="text-xs text-gray-500">Balance</p><p className="mt-1 font-semibold text-amber-700">{money(Math.max(0, num(invoice.totalAmount) - paid))}</p></div></div>
          </div>;
        })}
      </CardContent></Card>
    </div>
    </div>
  </div>
  </div>;
}
