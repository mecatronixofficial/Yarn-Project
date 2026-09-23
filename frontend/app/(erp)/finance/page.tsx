"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  CreditCard,
  Landmark,
  ReceiptIndianRupee,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";

export default function Finance() {
  const [summary, setSummary] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState({ salesOrderId: "", taxableValue: "", gstAmount: "", dueDate: "" });
  const [payment, setPayment] = useState({ invoiceId: "", amount: "", mode: "NEFT", referenceNo: "", bank: "" });

  const load = () => Promise.all([
    api<any>("/finance/summary"), api<any>("/finance/context"),
    api<any[]>("/finance/expenses"), api<any[]>("/finance/payments"),
  ]).then(([summaryData, contextData, expenseData, paymentData]) => {
    setSummary(summaryData); setContext(contextData); setExpenses(expenseData); setPayments(paymentData);
  });
  useEffect(() => { load(); }, []);

  const act = async (request: () => Promise<unknown>, successMessage: string) => {
    setMessage("");
    try { await request(); setMessage(successMessage); toast.success(successMessage); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed"); }
  };

  if (!summary || !context) return <Loading />;
  const selectedOrder = context.orders.find((order: any) => order.id === invoice.salesOrderId);
  const selectedInvoice = context.invoices.find((row: any) => row.id === payment.invoiceId);
  const invoicePaid = selectedInvoice?.payments.reduce((sum: number, row: any) => sum + Number(row.amount), 0) || 0;
  const invoiceOutstanding = selectedInvoice ? Math.max(0, Number(selectedInvoice.totalAmount) - invoicePaid) : 0;

  return (
    <div className="finance-page">
      <div className="finance-page-header">
        <span className="finance-page-icon">
          <Landmark size={18} />
        </span>
        <div>
          <h2 className="text-lg font-bold md:text-xl">Finance & Receivables</h2>
          <p className="text-xs text-gray-500">Issue invoices, record collections, track overdue balances, and close fully settled orders.</p>
        </div>
      </div>

      {message && (
        <div className="finance-message">
          <ClipboardList size={15} />
          {message}
        </div>
      )}

      <div className="finance-stats grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="finance-stat-tile finance-stat-tile--invoiced">
          <div className="finance-stat-icon"><ReceiptIndianRupee size={15} /></div>
          <div>
            <p className="finance-stat-label">Invoiced</p>
            <p className="finance-stat-value">{money(summary.invoiced)}</p>
          </div>
        </div>
        <div className="finance-stat-tile finance-stat-tile--received">
          <div className="finance-stat-icon"><WalletCards size={15} /></div>
          <div>
            <p className="finance-stat-label">Received</p>
            <p className="finance-stat-value">{money(summary.received)}</p>
          </div>
        </div>
        <div className="finance-stat-tile finance-stat-tile--outstanding">
          <div className="finance-stat-icon"><AlertTriangle size={15} /></div>
          <div>
            <p className="finance-stat-label">Outstanding</p>
            <p className="finance-stat-value">{money(summary.outstanding)}</p>
          </div>
        </div>
        <div className="finance-stat-tile finance-stat-tile--expenses">
          <div className="finance-stat-icon"><TrendingDown size={15} /></div>
          <div>
            <p className="finance-stat-label">Expenses</p>
            <p className="finance-stat-value">{money(summary.expenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="finance-card finance-card--invoice">
          <CardHeader>
            <div className="finance-card-heading">
              <span className="finance-step-badge finance-step-badge--1"><ReceiptIndianRupee size={14} /></span>
              <h3 className="font-bold">Issue Customer Invoice</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <select className="erp-input" value={invoice.salesOrderId} onChange={(event) => {
              const order = context.orders.find((row: any) => row.id === event.target.value);
              const taxableValue = order?.items.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) || 0;
              setInvoice({ ...invoice, salesOrderId: event.target.value, taxableValue: String(taxableValue), gstAmount: String(taxableValue * 0.12) });
            }}>
              <option value="">Select sales order</option>
              {context.orders.map((order: any) => <option key={order.id} value={order.id}>{order.orderNo} • {order.customer.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={invoice.taxableValue} onChange={(event) => setInvoice({ ...invoice, taxableValue: event.target.value })} placeholder="Taxable value" />
              <Input type="number" value={invoice.gstAmount} onChange={(event) => setInvoice({ ...invoice, gstAmount: event.target.value })} placeholder="GST amount" />
            </div>
            <Input type="date" value={invoice.dueDate} onChange={(event) => setInvoice({ ...invoice, dueDate: event.target.value })} />
            <Button className="finance-action-btn w-full" onClick={() => act(() => api("/finance/invoices", { method: "POST", body: JSON.stringify({
              customerId: selectedOrder?.customerId, salesOrderId: invoice.salesOrderId,
              taxableValue: Number(invoice.taxableValue), gstAmount: Number(invoice.gstAmount), dueDate: invoice.dueDate || undefined,
            }) }), "Invoice issued.")}>Issue Invoice</Button>
          </CardContent>
        </Card>

        <Card className="finance-card finance-card--payment">
          <CardHeader>
            <div className="finance-card-heading">
              <span className="finance-step-badge finance-step-badge--2"><CreditCard size={14} /></span>
              <h3 className="font-bold">Record Customer Payment</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <select className="erp-input" value={payment.invoiceId} onChange={(event) => {
              const selected = context.invoices.find((row: any) => row.id === event.target.value);
              const paid = selected?.payments.reduce((sum: number, row: any) => sum + Number(row.amount), 0) || 0;
              setPayment({ ...payment, invoiceId: event.target.value, amount: selected ? String(Math.max(0, Number(selected.totalAmount) - paid)) : "" });
            }}>
              <option value="">Select open invoice</option>
              {context.invoices.filter((row: any) => !["PAID", "CANCELLED", "DRAFT"].includes(row.status)).map((row: any) => (
                <option key={row.id} value={row.id}>{row.invoiceNo} • {row.customer.name} • {row.status}</option>
              ))}
            </select>
            {selectedInvoice && <div className="finance-outstanding-note">Outstanding: <b>{money(invoiceOutstanding)}</b></div>}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} placeholder="Amount" />
              <Input value={payment.mode} onChange={(event) => setPayment({ ...payment, mode: event.target.value })} placeholder="Payment mode" />
              <Input value={payment.referenceNo} onChange={(event) => setPayment({ ...payment, referenceNo: event.target.value })} placeholder="Reference / UTR" />
              <Input value={payment.bank} onChange={(event) => setPayment({ ...payment, bank: event.target.value })} placeholder="Bank" />
            </div>
            <Button className="finance-action-btn w-full" onClick={() => act(() => api("/finance/payments", { method: "POST", body: JSON.stringify({
              customerId: selectedInvoice?.customerId, invoiceId: payment.invoiceId, amount: Number(payment.amount),
              mode: payment.mode, referenceNo: payment.referenceNo || undefined, bank: payment.bank || undefined,
            }) }), "Payment recorded and invoice status updated.")}>Record Payment</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="finance-card finance-card--register">
        <CardHeader>
          <div className="finance-card-heading">
            <span className="finance-step-badge finance-step-badge--3"><ClipboardList size={14} /></span>
            <h3 className="font-bold">Invoice Register</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead><tr><th className="p-3">Invoice</th><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Status</th></tr></thead>
          <tbody>{context.invoices.map((row: any) => { const paid = row.payments.reduce((sum: number, item: any) => sum + Number(item.amount), 0); return (
            <tr key={row.id}><td className="p-3 font-semibold">{row.invoiceNo}</td><td className="p-3">{row.salesOrder?.orderNo || "-"}</td><td className="p-3">{row.customer.name}</td><td className="p-3">{money(row.totalAmount)}</td><td className="p-3">{money(paid)}</td><td className="p-3"><Badge tone={row.status === "PAID" ? "success" : "warning"}>{row.status.replaceAll("_", " ")}</Badge></td></tr>
          ); })}</tbody>
        </table></div></CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="finance-card finance-card--payments-list">
          <CardHeader>
            <div className="finance-card-heading">
              <span className="finance-step-badge finance-step-badge--4"><ArrowDownCircle size={14} /></span>
              <h3 className="font-bold">Recent Payments</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {payments.slice(0, 8).map((row) => (
              <div key={row.id} className="finance-list-row">
                <span className="finance-list-icon finance-list-icon--in"><ArrowDownCircle size={13} /></span>
                <span className="finance-list-text">{row.customer.name} • {row.invoice?.invoiceNo || "Advance"}</span>
                <b className="finance-list-amount">{money(row.amount)}</b>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="finance-card finance-card--expenses-list">
          <CardHeader>
            <div className="finance-card-heading">
              <span className="finance-step-badge finance-step-badge--5"><ArrowUpCircle size={14} /></span>
              <h3 className="font-bold">Recent Expenses</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {expenses.slice(0, 8).map((row) => (
              <div key={row.id} className="finance-list-row">
                <span className="finance-list-icon finance-list-icon--out"><ArrowUpCircle size={13} /></span>
                <span className="finance-list-text">{row.expenseNo} • {row.category}</span>
                <b className="finance-list-amount">{money(row.amount)}</b>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
