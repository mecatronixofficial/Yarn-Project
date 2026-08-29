"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Factory, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@example.com", password: "Demo@12345" },
  });
  const submit = async (v: Form) => {
    setError("");
    try {
      const r = await api<{ data: { role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(v),
      });
      router.replace(r.data.role === "WORKER" ? "/worker" : "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-[#143b32] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d3a64c] text-[#143b32]">
            <Factory />
          </div>
          <div>
            <h1 className="text-xl font-bold">YarnFlow ERP</h1>
            <p className="text-sm text-white/55">
              Manufacturing control system
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.28em] text-[#d3a64c]">
            Complete Traceability
          </p>
          <h2 className="mt-4 max-w-xl text-5xl font-bold leading-tight">
            Every kilogram accounted for from yarn to customer delivery.
          </h2>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/8 p-4">Yarn & Stock</div>
            <div className="rounded-2xl bg-white/8 p-4">Knitting & Dyeing</div>
            <div className="rounded-2xl bg-white/8 p-4">QC & Delivery</div>
          </div>
        </div>
        <p className="text-xs text-white/40">Super Admin • Manager • Worker</p>
      </div>
      <div className="grid place-items-center p-5">
        <form
          onSubmit={handleSubmit(submit)}
          className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl md:p-9"
        >
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#a77a24]">
            Secure Login
          </p>
          <h2 className="mt-2 text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-500">
            Demo credentials are prefilled. Change them after setup.
          </p>
          <div className="mt-7">
            <label className="erp-label">Email</label>
            <Input {...register("email")} />
            <p className="mt-1 text-xs text-red-600">{errors.email?.message}</p>
          </div>
          <div className="mt-4">
            <label className="erp-label">Password</label>
            <Input type="password" {...register("password")} />
            <p className="mt-1 text-xs text-red-600">
              {errors.password?.message}
            </p>
          </div>
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <Button className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}Sign
            in
          </Button>
          <div className="mt-6 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            <b>Manager:</b> manager@example.com
            <br />
            <b>Worker:</b> worker@example.com
            <br />
            Password: Demo@12345
          </div>
        </form>
      </div>
    </div>
  );
}
