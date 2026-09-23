"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApiAction } from "@/lib/use-api-action";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
const schema = z.object({
  customerId: z.string().min(1),
  poNumber: z.string().optional(),
  expectedDelivery: z.string().optional(),
  fabricType: z.string().min(2),
  yarnType: z.string().min(2),
  yarnCount: z.string().min(1),
  color: z.string().min(2),
  gsm: z.coerce.number().positive(),
  diameter: z.string().optional(),
  width: z.string().optional(),
  quantityKg: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
});
type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;
export default function NewOrder() {
  const [customers, setCustomers] = useState<any[]>([]);
  const router = useRouter();
  const { message, run } = useApiAction();
  useEffect(() => {
    api<any[]>("/masters/customers").then(setCustomers);
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fabricType: "Single Jersey",
      yarnType: "Combed Cotton",
      yarnCount: "30s",
      color: "Navy Blue",
      gsm: 180,
      quantityKg: 10000,
      rate: 385,
    },
  });
  const submit = async (v: FormData) => {
    let created: any = null;
    const ok = await run(async () => {
      created = await api<any>("/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: v.customerId,
          poNumber: v.poNumber,
          expectedDelivery: v.expectedDelivery || undefined,
          items: [
            {
              fabricType: v.fabricType,
              yarnType: v.yarnType,
              yarnCount: v.yarnCount,
              color: v.color,
              gsm: v.gsm,
              diameter: v.diameter,
              width: v.width,
              quantityKg: v.quantityKg,
              rate: v.rate,
            },
          ],
        }),
      });
    }, "Sales order created successfully.");
    if (ok && created) router.push(`/orders/${created.id}`);
  };
  const field = (name: keyof FormInput, label: string, type = "text") => (
    <div>
      <label className="erp-label">{label}</label>
      <Input type={type} {...register(name)} />
      <p className="mt-1 text-xs text-red-600">
        {errors[name]?.message as string}
      </p>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Create Sales Order</h2>
        <p className="text-sm text-gray-500">
          This demo form creates one fabric item; the backend supports multiple
          items.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <InlineMessage message={message} />
        <form
          onSubmit={handleSubmit(submit, () =>
            toast.warning("Complete the required order fields before saving.", "Check sales order")
          )}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="erp-label">Customer</label>
            <select className="erp-input" {...register("customerId")}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {field("poNumber", "Customer PO")}
          {field("expectedDelivery", "Expected Delivery", "date")}
          {field("fabricType", "Fabric Type")}
          {field("yarnType", "Yarn Type")}
          {field("yarnCount", "Yarn Count")}
          {field("color", "Color")}
          {field("gsm", "GSM", "number")}
          {field("diameter", "Diameter")}
          {field("width", "Width")}
          {field("quantityKg", "Order Quantity KG", "number")}
          {field("rate", "Rate / KG", "number")}
          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting}>Create Order</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
