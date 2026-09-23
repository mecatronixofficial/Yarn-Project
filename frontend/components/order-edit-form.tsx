"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Customer = { id: string; code: string; name: string };
type EditableItem = {
  key: string;
  fabricType: string;
  yarnType: string;
  yarnCount: string;
  color: string;
  gsm: string;
  diameter: string;
  width: string;
  quantityKg: string;
  rate: string;
};
export type EditableOrder = {
  id: string;
  customer: { id: string };
  poNumber?: string;
  expectedDelivery?: string;
  notes?: string;
  items: Array<{
    id: string;
    fabricType: string;
    yarnType: string;
    yarnCount: string;
    color: string;
    gsm?: number;
    diameter?: string;
    width?: string;
    quantityKg: string;
    rate?: string;
  }>;
};

const emptyItem = (): EditableItem => ({
  key: `${Date.now()}-${Math.random()}`,
  fabricType: "",
  yarnType: "",
  yarnCount: "",
  color: "",
  gsm: "",
  diameter: "",
  width: "",
  quantityKg: "",
  rate: "",
});

export function OrderEditForm({
  order,
  onCancel,
  onSaved,
}: {
  order: EditableOrder;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(order.customer.id);
  const [poNumber, setPoNumber] = useState(order.poNumber || "");
  const [expectedDelivery, setExpectedDelivery] = useState(order.expectedDelivery?.slice(0, 10) || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [items, setItems] = useState<EditableItem[]>(() => order.items.map((item) => ({
    key: item.id,
    fabricType: item.fabricType,
    yarnType: item.yarnType,
    yarnCount: item.yarnCount,
    color: item.color,
    gsm: item.gsm ? String(item.gsm) : "",
    diameter: item.diameter || "",
    width: item.width || "",
    quantityKg: String(item.quantityKg),
    rate: item.rate ? String(item.rate) : "",
  })));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Customer[]>("/masters/customers")
      .then(setCustomers)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load customers."));
  }, []);

  const changeItem = (key: string, field: keyof Omit<EditableItem, "key">, value: string) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
  };

  const save = async () => {
    setError("");
    const reject = (message: string) => {
      setError(message);
      toast.warning(message, "Check sales order");
    };
    if (!customerId) { reject("Select a customer."); return; }
    if (items.length === 0) { reject("Add at least one order item."); return; }
    if (items.some((item) => !item.fabricType.trim() || !item.yarnType.trim() || !item.yarnCount.trim() || !item.color.trim())) {
      reject("Fabric type, yarn type, yarn count, and color are required for every item."); return;
    }
    if (items.some((item) => Number(item.quantityKg) <= 0 || Number(item.rate || 0) < 0)) {
      reject("Every item must have a positive quantity and a non-negative rate."); return;
    }
    setSaving(true);
    try {
      await api(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerId,
          poNumber: poNumber.trim() || null,
          expectedDelivery: expectedDelivery || null,
          notes: notes.trim() || null,
          items: items.map(({ key: _key, ...item }) => ({
            fabricType: item.fabricType.trim(),
            yarnType: item.yarnType.trim(),
            yarnCount: item.yarnCount.trim(),
            color: item.color.trim(),
            gsm: item.gsm ? Number(item.gsm) : undefined,
            diameter: item.diameter.trim() || undefined,
            width: item.width.trim() || undefined,
            quantityKg: Number(item.quantityKg),
            rate: item.rate ? Number(item.rate) : 0,
          })),
        }),
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Edit sales order</h3>
            <p className="mt-1 text-xs text-gray-500">Update commercial details and order lines before confirmation.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}><X size={16} />Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="erp-label">Customer</label>
            <select className="erp-input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {!customers.length && <option value={customerId}>Current customer</option>}
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.name}</option>)}
            </select>
          </div>
          <div><label className="erp-label">Customer PO</label><Input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} placeholder="Optional PO number" /></div>
          <div><label className="erp-label">Expected delivery</label><Input type="date" value={expectedDelivery} onChange={(event) => setExpectedDelivery(event.target.value)} /></div>
          <div><label className="erp-label">Notes</label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Order notes" /></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><h4 className="text-sm font-bold">Order items</h4><p className="text-xs text-gray-500">All existing lines are replaced when you save.</p></div>
            <Button size="sm" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}><Plus size={15} />Add item</Button>
          </div>
          {items.map((item, index) => (
            <div key={item.key} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Item {index + 1}</p>
                <Button size="sm" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}><Trash2 size={15} />Remove</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <div><label className="erp-label">Fabric type</label><Input value={item.fabricType} onChange={(event) => changeItem(item.key, "fabricType", event.target.value)} /></div>
                <div><label className="erp-label">Color</label><Input value={item.color} onChange={(event) => changeItem(item.key, "color", event.target.value)} /></div>
                <div><label className="erp-label">Yarn type</label><Input value={item.yarnType} onChange={(event) => changeItem(item.key, "yarnType", event.target.value)} /></div>
                <div><label className="erp-label">Yarn count</label><Input value={item.yarnCount} onChange={(event) => changeItem(item.key, "yarnCount", event.target.value)} /></div>
                <div><label className="erp-label">GSM</label><Input type="number" min="1" value={item.gsm} onChange={(event) => changeItem(item.key, "gsm", event.target.value)} /></div>
                <div><label className="erp-label">Diameter</label><Input value={item.diameter} onChange={(event) => changeItem(item.key, "diameter", event.target.value)} /></div>
                <div><label className="erp-label">Width</label><Input value={item.width} onChange={(event) => changeItem(item.key, "width", event.target.value)} /></div>
                <div><label className="erp-label">Quantity (KG)</label><Input type="number" min="0.001" step="0.001" value={item.quantityKg} onChange={(event) => changeItem(item.key, "quantityKg", event.target.value)} /></div>
                <div><label className="erp-label">Rate / KG</label><Input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => changeItem(item.key, "rate", event.target.value)} /></div>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200"><p className="text-[10px] font-semibold uppercase text-gray-500">Line value</p><p className="mt-1 font-bold">₹{(Number(item.quantityKg || 0) * Number(item.rate || 0)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save changes"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
