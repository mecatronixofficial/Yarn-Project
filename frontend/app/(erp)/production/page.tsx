"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  Factory,
  PackageCheck,
  Plus,
  RefreshCw,
  Scale,
  Shirt,
  Sparkles,
  Truck,
  Warehouse,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, kg, money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";

type FlowStatus = "PURCHASED" | "KNITTING" | "DYEING" | "COMPACTING" | "AT_OFFICE" | "DELIVERED";
type StageKey = "purchase" | "knitting" | "dyeing" | "compacting" | "final";

type FlowMetrics = {
  currentWeightKg: number;
  yarnAmount: number;
  yarnLossKg: number;
  knittingLossKg: number;
  dyeingLossKg: number;
  compactingLossKg: number;
  balanceFabricKg: number;
  totalLossKg: number;
  lossPct: number;
  totalSpent: number;
  profit: number;
};

type FabricFlow = {
  id: string;
  flowNo: string;
  status: FlowStatus;
  purchaseDate: string;
  piNo: string;
  partyDetails: string;
  millDetails: string;
  yarnCount: string;
  bagCount: number;
  purchasedWeightKg: number;
  yarnRatePerKg: number;
  purchaseOtherCost: number;
  deliveryPlace: string;
  knittingDate: string | null;
  knittingPiNo: string | null;
  knittingPartyDetails: string | null;
  knittingMillDetails: string | null;
  yarnReceivedKg: number | null;
  dailyProductivityKg: number | null;
  knittingDeliveryKg: number | null;
  knittingExpense: number;
  dyeingDeliveryKg: number | null;
  dyeingDate: string | null;
  dyeingPiNo: string | null;
  dyeingPartyDetails: string | null;
  dyeingMillDetails: string | null;
  fabricReceivedKg: number | null;
  color: string | null;
  dyeingCount: string | null;
  gg: string | null;
  ll: string | null;
  rollCount: number | null;
  dyeingOutputWeightKg: number | null;
  dyeingExpense: number;
  compactingDeliveryKg: number | null;
  compactingDate: string | null;
  compactingReceivedKg: number | null;
  officeDeliveryKg: number | null;
  compactingExpense: number;
  finalDate: string | null;
  finalDeliveredKg: number | null;
  collectedAmount: number;
  otherExpense: number;
  notes: string | null;
  metrics: FlowMetrics;
};

type FlowResponse = {
  data: FabricFlow[];
  summary: {
    activeBatches: number;
    purchasedKg: number;
    currentKg: number;
    totalLossKg: number;
    totalSpent: number;
    collectedAmount: number;
    profit: number;
  };
};

const stages = [
  { key: "purchase" as const, number: "01", label: "Yarn purchase", caption: "Purchase & inward", icon: Boxes, tone: "amber" },
  { key: "knitting" as const, number: "02", label: "Knitting", caption: "Yarn to grey fabric", icon: Factory, tone: "emerald" },
  { key: "dyeing" as const, number: "03", label: "Dyeing", caption: "Colour & rolls", icon: Droplets, tone: "blue" },
  { key: "compacting" as const, number: "04", label: "Compacting", caption: "Finish & office", icon: Sparkles, tone: "violet" },
  { key: "final" as const, number: "05", label: "Final delivery", caption: "Collection & profit", icon: Truck, tone: "rose" },
] as const;

const statusOrder: Record<FlowStatus, number> = {
  PURCHASED: 0,
  KNITTING: 1,
  DYEING: 2,
  COMPACTING: 3,
  AT_OFFICE: 4,
  DELIVERED: 5,
};

const stageTone = {
  amber: { icon: "bg-amber-100 text-amber-700", active: "border-amber-300 bg-amber-50", rail: "bg-amber-500" },
  emerald: { icon: "bg-emerald-100 text-emerald-700", active: "border-emerald-300 bg-emerald-50", rail: "bg-emerald-500" },
  blue: { icon: "bg-blue-100 text-blue-700", active: "border-blue-300 bg-blue-50", rail: "bg-blue-500" },
  violet: { icon: "bg-violet-100 text-violet-700", active: "border-violet-300 bg-violet-50", rail: "bg-violet-500" },
  rose: { icon: "bg-rose-100 text-rose-700", active: "border-rose-300 bg-rose-50", rail: "bg-rose-500" },
};

const localDate = (value?: string | null) => {
  if (value) return value.slice(0, 10);
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const numeric = (value: string) => Number(value || 0);

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-gray-500">
        {label}{hint && <span className="font-medium normal-case tracking-normal text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value, icon: Icon, tone, note }: { label: string; value: string; icon: typeof Scale; tone: string; note: string }) {
  return (
    <Card className="group p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-gray-400">{label}</p><p className="mt-2 text-xl font-bold tracking-[-.04em] text-gray-800">{value}</p><p className="mt-1 text-[10px] text-gray-400">{note}</p></div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tone)}><Icon size={17} /></div>
      </div>
    </Card>
  );
}

export default function Production() {
  const [result, setResult] = useState<FlowResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [activeStage, setActiveStage] = useState<StageKey>("purchase");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [purchase, setPurchase] = useState({ purchaseDate: localDate(), piNo: "", partyDetails: "", millDetails: "", yarnCount: "", bagCount: "", purchasedWeightKg: "", yarnRatePerKg: "", purchaseOtherCost: "0", deliveryPlace: "", notes: "" });
  const [knitting, setKnitting] = useState({ knittingDate: localDate(), knittingPiNo: "", knittingPartyDetails: "", knittingMillDetails: "", yarnReceivedKg: "", dailyProductivityKg: "", knittingDeliveryKg: "", knittingExpense: "0", dyeingDeliveryKg: "" });
  const [dyeing, setDyeing] = useState({ dyeingDate: localDate(), dyeingPiNo: "", dyeingPartyDetails: "", dyeingMillDetails: "", fabricReceivedKg: "", color: "", dyeingCount: "", gg: "", ll: "", rollCount: "", dyeingOutputWeightKg: "", dyeingExpense: "0", compactingDeliveryKg: "" });
  const [compacting, setCompacting] = useState({ compactingDate: localDate(), compactingReceivedKg: "", officeDeliveryKg: "", compactingExpense: "0" });
  const [finalEntry, setFinalEntry] = useState({ finalDate: localDate(), finalDeliveredKg: "", collectedAmount: "", otherExpense: "0", notes: "" });

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoadingError("");
    try {
      const response = await api<FlowResponse>("/production/fabric-flows");
      setResult(response);
      setSelectedId((current) => current && response.data.some((flow) => flow.id === current) ? current : response.data[0]?.id || "");
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "Fabric production data could not be loaded");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => result?.data.find((flow) => flow.id === selectedId) || null, [result, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setKnitting({
      knittingDate: localDate(selected.knittingDate),
      knittingPiNo: selected.knittingPiNo || selected.piNo,
      knittingPartyDetails: selected.knittingPartyDetails || selected.partyDetails,
      knittingMillDetails: selected.knittingMillDetails || selected.millDetails,
      yarnReceivedKg: String(selected.yarnReceivedKg ?? selected.purchasedWeightKg),
      dailyProductivityKg: String(selected.dailyProductivityKg ?? ""),
      knittingDeliveryKg: String(selected.knittingDeliveryKg ?? ""),
      knittingExpense: String(selected.knittingExpense || 0),
      dyeingDeliveryKg: String(selected.dyeingDeliveryKg ?? ""),
    });
    setDyeing({
      dyeingDate: localDate(selected.dyeingDate),
      dyeingPiNo: selected.dyeingPiNo || selected.piNo,
      dyeingPartyDetails: selected.dyeingPartyDetails || selected.partyDetails,
      dyeingMillDetails: selected.dyeingMillDetails || selected.millDetails,
      fabricReceivedKg: String(selected.fabricReceivedKg ?? selected.dyeingDeliveryKg ?? ""),
      color: selected.color || "",
      dyeingCount: selected.dyeingCount || selected.yarnCount,
      gg: selected.gg || "",
      ll: selected.ll || "",
      rollCount: String(selected.rollCount ?? ""),
      dyeingOutputWeightKg: String(selected.dyeingOutputWeightKg ?? ""),
      dyeingExpense: String(selected.dyeingExpense || 0),
      compactingDeliveryKg: String(selected.compactingDeliveryKg ?? ""),
    });
    setCompacting({ compactingDate: localDate(selected.compactingDate), compactingReceivedKg: String(selected.compactingReceivedKg ?? selected.compactingDeliveryKg ?? ""), officeDeliveryKg: String(selected.officeDeliveryKg ?? ""), compactingExpense: String(selected.compactingExpense || 0) });
    setFinalEntry({ finalDate: localDate(selected.finalDate), finalDeliveredKg: String(selected.finalDeliveredKg ?? selected.officeDeliveryKg ?? ""), collectedAmount: String(selected.collectedAmount || ""), otherExpense: String(selected.otherExpense || 0), notes: selected.notes || "" });
  }, [selected]);

  if (!result) {
    if (loadingError) return <Card className="mx-auto mt-16 max-w-lg p-8 text-center"><AlertTriangle className="mx-auto text-rose-600" size={28} /><h2 className="mt-4 text-lg font-bold">Production ledger unavailable</h2><p className="mt-1 text-sm text-gray-500">{loadingError}</p><Button className="mt-5" onClick={() => void load(true)}><RefreshCw size={15} /> Retry</Button></Card>;
    return <Loading />;
  }

  const run = async (action: () => Promise<FabricFlow>, next?: StageKey) => {
    setSaving(true); setNotice(null);
    try {
      const saved = await action();
      setSelectedId(saved.id);
      if (next) setActiveStage(next);
      setNotice({ tone: "success", text: `${saved.flowNo} saved. Weight, loss, cost and profit were recalculated.` });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save this stage" });
    } finally { setSaving(false); }
  };

  const statusTone = (status: FlowStatus) => status === "DELIVERED" ? "success" : status === "AT_OFFICE" ? "info" : "warning";
  const selectBatch = (id: string) => setSelectedId(id);
  const stageReady = activeStage === "purchase" || !!selected && (
    activeStage === "knitting" ||
    activeStage === "dyeing" && selected.dyeingDeliveryKg !== null ||
    activeStage === "compacting" && selected.compactingDeliveryKg !== null ||
    activeStage === "final" && selected.officeDeliveryKg !== null
  );

  return (
    <div className="production-page mx-auto max-w-[1800px] space-y-6 pb-8">
      <section className="production-hero overflow-hidden rounded-[28px] p-5 text-white md:p-7">
        <div className="relative z-10 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Own material production</div>
            <h2 className="mt-4 text-2xl font-bold tracking-[-.04em] md:text-4xl">Yarn to finished fabric</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Track purchased yarn through knitting, dyeing, compacting and final delivery. Every kilogram and rupee stays accountable.</p>
          </div>
          <Button className="border border-white/15 bg-white/10 text-white hover:bg-white/15" disabled={refreshing} onClick={() => void load(true)}><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh ledger</Button>
        </div>
        <div className="relative z-10 mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["Active batches", result.summary.activeBatches, Boxes, "text-amber-200"],
            ["Purchased yarn", kg(result.summary.purchasedKg), Scale, "text-emerald-300"],
            ["Current material", kg(result.summary.currentKg), Shirt, "text-sky-200"],
            ["Recorded loss", kg(result.summary.totalLossKg), AlertTriangle, "text-rose-300"],
          ] as const).map(([label, value, Icon, tone]) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-black/10 px-4 py-3"><Icon size={17} className={tone} /><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div></div>)}
        </div>
      </section>

      {notice && <div className={cn("flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{notice.tone === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{notice.text}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total production spend" value={money(result.summary.totalSpent)} icon={Banknote} tone="bg-amber-50 text-amber-700" note="Yarn and every process expense" />
        <Metric label="Delivery collection" value={money(result.summary.collectedAmount)} icon={CircleDollarSign} tone="bg-blue-50 text-blue-700" note="Amount collected after delivery" />
        <Metric label="Net profit" value={money(result.summary.profit)} icon={result.summary.profit >= 0 ? CheckCircle2 : AlertTriangle} tone={result.summary.profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"} note="Collection minus total spend" />
        <Metric label="Overall yield" value={`${result.summary.purchasedKg ? ((result.summary.currentKg / result.summary.purchasedKg) * 100).toFixed(1) : "0.0"}%`} icon={Scale} tone="bg-violet-50 text-violet-700" note="Current material from purchased yarn" />
      </section>

      <section>
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a24]">Main process</p><h3 className="mt-1 text-xl font-bold tracking-tight text-[#183b32]">Select the stage to record</h3></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage, index) => {
            const Icon = stage.icon; const tone = stageTone[stage.tone]; const active = activeStage === stage.key;
            const exactCount = result.data.filter((flow) => index === 0 ? flow.status === "PURCHASED" : statusOrder[flow.status] === index).length;
            return <button key={stage.key} onClick={() => setActiveStage(stage.key)} className={cn("relative overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", active ? tone.active : "border-gray-200")}><div className="flex items-center gap-3"><div className={cn("grid h-10 w-10 place-items-center rounded-2xl", tone.icon)}><Icon size={18} /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-gray-400">Stage {stage.number}</p><p className="mt-1 truncate text-sm font-bold text-gray-800">{stage.label}</p><p className="mt-0.5 truncate text-[10px] text-gray-400">{stage.caption}</p></div><span className="grid h-7 min-w-7 place-items-center rounded-lg bg-white px-1.5 text-[10px] font-bold shadow-sm">{exactCount}</span></div>{active && <span className={cn("absolute inset-x-0 bottom-0 h-1", tone.rail)} />}</button>;
          })}
        </div>
      </section>

      <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <Card className="production-workspace overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 bg-[#f7faf8]">
            <div><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a77a24]">Stage entry</p><h3 className="mt-1 text-lg font-bold text-[#183b32]">{stages.find((stage) => stage.key === activeStage)?.label}</h3></div>
            {activeStage !== "purchase" && <select className="erp-input max-w-md" value={selectedId} onChange={(event) => selectBatch(event.target.value)}><option value="">Select fabric batch</option>{result.data.map((flow) => <option key={flow.id} value={flow.id}>{flow.flowNo} · {flow.piNo} · {flow.partyDetails}</option>)}</select>}
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            {!stageReady && <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><div><p className="font-bold">Previous stage is incomplete</p><p className="mt-1 text-xs">Select this batch’s previous process and record its delivered weight first.</p></div></div>}

            {activeStage === "purchase" && <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Purchase date"><Input type="date" value={purchase.purchaseDate} onChange={(e) => setPurchase({ ...purchase, purchaseDate: e.target.value })} /></Field>
                <Field label="PI number" hint="Required"><Input placeholder="PI / invoice reference" value={purchase.piNo} onChange={(e) => setPurchase({ ...purchase, piNo: e.target.value })} /></Field>
                <Field label="Yarn count"><Input placeholder="e.g. 30s" value={purchase.yarnCount} onChange={(e) => setPurchase({ ...purchase, yarnCount: e.target.value })} /></Field>
                <Field label="Party details" className="md:col-span-2"><Input placeholder="Supplier / party name and contact" value={purchase.partyDetails} onChange={(e) => setPurchase({ ...purchase, partyDetails: e.target.value })} /></Field>
                <Field label="Mill details"><Input placeholder="Yarn mill" value={purchase.millDetails} onChange={(e) => setPurchase({ ...purchase, millDetails: e.target.value })} /></Field>
                <Field label="Number of bags"><Input type="number" min="1" placeholder="0" value={purchase.bagCount} onChange={(e) => setPurchase({ ...purchase, bagCount: e.target.value })} /></Field>
                <Field label="Purchased weight" hint="KG"><Input type="number" min="0" step="0.001" placeholder="1000.000" value={purchase.purchasedWeightKg} onChange={(e) => setPurchase({ ...purchase, purchasedWeightKg: e.target.value })} /></Field>
                <Field label="Yarn rate" hint="₹ / KG"><Input type="number" min="0" step="0.01" placeholder="0.00" value={purchase.yarnRatePerKg} onChange={(e) => setPurchase({ ...purchase, yarnRatePerKg: e.target.value })} /></Field>
                <Field label="Other purchase cost" hint="₹"><Input type="number" min="0" step="0.01" value={purchase.purchaseOtherCost} onChange={(e) => setPurchase({ ...purchase, purchaseOtherCost: e.target.value })} /></Field>
                <Field label="Delivery place" className="md:col-span-2"><Input placeholder="Where the yarn is delivered" value={purchase.deliveryPlace} onChange={(e) => setPurchase({ ...purchase, deliveryPlace: e.target.value })} /></Field>
                <Field label="Notes"><Input placeholder="Optional" value={purchase.notes} onChange={(e) => setPurchase({ ...purchase, notes: e.target.value })} /></Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Calculated yarn amount</p><p className="mt-1 text-xl font-bold text-amber-900">{money(numeric(purchase.purchasedWeightKg) * numeric(purchase.yarnRatePerKg) + numeric(purchase.purchaseOtherCost))}</p></div><Button disabled={saving || !purchase.piNo || !purchase.partyDetails || !purchase.millDetails || !purchase.yarnCount || !purchase.bagCount || !purchase.purchasedWeightKg || !purchase.deliveryPlace} onClick={() => void run(() => api<FabricFlow>("/production/fabric-flows", { method: "POST", body: JSON.stringify({ ...purchase, bagCount: numeric(purchase.bagCount), purchasedWeightKg: numeric(purchase.purchasedWeightKg), yarnRatePerKg: numeric(purchase.yarnRatePerKg), purchaseOtherCost: numeric(purchase.purchaseOtherCost) }) }), "knitting")}>{saving ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} Create yarn batch</Button></div>
            </div>}

            {activeStage === "knitting" && <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Date"><Input type="date" value={knitting.knittingDate} onChange={(e) => setKnitting({ ...knitting, knittingDate: e.target.value })} /></Field><Field label="PI number"><Input value={knitting.knittingPiNo} onChange={(e) => setKnitting({ ...knitting, knittingPiNo: e.target.value })} /></Field><Field label="Yarn received" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.yarnReceivedKg} onChange={(e) => setKnitting({ ...knitting, yarnReceivedKg: e.target.value })} /></Field>
                <Field label="Party details" className="md:col-span-2"><Input value={knitting.knittingPartyDetails} onChange={(e) => setKnitting({ ...knitting, knittingPartyDetails: e.target.value })} /></Field><Field label="Mill details"><Input value={knitting.knittingMillDetails} onChange={(e) => setKnitting({ ...knitting, knittingMillDetails: e.target.value })} /></Field>
                <Field label="Daily productivity" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.dailyProductivityKg} onChange={(e) => setKnitting({ ...knitting, dailyProductivityKg: e.target.value })} /></Field><Field label="Knitted output" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.knittingDeliveryKg} onChange={(e) => setKnitting({ ...knitting, knittingDeliveryKg: e.target.value })} /></Field><Field label="Daily/process expense" hint="₹"><Input type="number" min="0" step="0.01" value={knitting.knittingExpense} onChange={(e) => setKnitting({ ...knitting, knittingExpense: e.target.value })} /></Field>
                <Field label="Delivered to dyeing" hint="KG" className="md:col-span-2 xl:col-span-3"><Input type="number" min="0" step="0.001" value={knitting.dyeingDeliveryKg} onChange={(e) => setKnitting({ ...knitting, dyeingDeliveryKg: e.target.value })} /></Field>
              </div>
              <StageEstimate input={numeric(knitting.yarnReceivedKg)} output={numeric(knitting.dyeingDeliveryKg)} expense={numeric(knitting.knittingExpense)} label="Knitting" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !knitting.knittingPiNo || !knitting.knittingPartyDetails || !knitting.knittingMillDetails || !knitting.yarnReceivedKg || !knitting.knittingDeliveryKg || !knitting.dyeingDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/knitting`, { method: "POST", body: JSON.stringify({ ...knitting, yarnReceivedKg: numeric(knitting.yarnReceivedKg), dailyProductivityKg: numeric(knitting.dailyProductivityKg), knittingDeliveryKg: numeric(knitting.knittingDeliveryKg), knittingExpense: numeric(knitting.knittingExpense), dyeingDeliveryKg: numeric(knitting.dyeingDeliveryKg) }) }), "dyeing")}>Save knitting & continue <ArrowRight size={15} /></Button></div>
            </div>}

            {activeStage === "dyeing" && <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Date"><Input type="date" value={dyeing.dyeingDate} onChange={(e) => setDyeing({ ...dyeing, dyeingDate: e.target.value })} /></Field><Field label="PI number"><Input value={dyeing.dyeingPiNo} onChange={(e) => setDyeing({ ...dyeing, dyeingPiNo: e.target.value })} /></Field><Field label="Fabric received" hint="KG"><Input type="number" min="0" step="0.001" value={dyeing.fabricReceivedKg} onChange={(e) => setDyeing({ ...dyeing, fabricReceivedKg: e.target.value })} /></Field>
                <Field label="Party details" className="md:col-span-2"><Input value={dyeing.dyeingPartyDetails} onChange={(e) => setDyeing({ ...dyeing, dyeingPartyDetails: e.target.value })} /></Field><Field label="Mill details"><Input value={dyeing.dyeingMillDetails} onChange={(e) => setDyeing({ ...dyeing, dyeingMillDetails: e.target.value })} /></Field>
                <Field label="Colour"><Input placeholder="Fabric colour" value={dyeing.color} onChange={(e) => setDyeing({ ...dyeing, color: e.target.value })} /></Field><Field label="Count"><Input value={dyeing.dyeingCount} onChange={(e) => setDyeing({ ...dyeing, dyeingCount: e.target.value })} /></Field><Field label="Number of rolls"><Input type="number" min="0" value={dyeing.rollCount} onChange={(e) => setDyeing({ ...dyeing, rollCount: e.target.value })} /></Field>
                <Field label="GG"><Input value={dyeing.gg} onChange={(e) => setDyeing({ ...dyeing, gg: e.target.value })} /></Field><Field label="LL"><Input value={dyeing.ll} onChange={(e) => setDyeing({ ...dyeing, ll: e.target.value })} /></Field><Field label="Dyeing output" hint="KG"><Input type="number" min="0" step="0.001" value={dyeing.dyeingOutputWeightKg} onChange={(e) => setDyeing({ ...dyeing, dyeingOutputWeightKg: e.target.value })} /></Field>
                <Field label="Dyeing expense" hint="₹"><Input type="number" min="0" step="0.01" value={dyeing.dyeingExpense} onChange={(e) => setDyeing({ ...dyeing, dyeingExpense: e.target.value })} /></Field><Field label="Delivered to compacting" hint="KG" className="md:col-span-1 xl:col-span-2"><Input type="number" min="0" step="0.001" value={dyeing.compactingDeliveryKg} onChange={(e) => setDyeing({ ...dyeing, compactingDeliveryKg: e.target.value })} /></Field>
              </div>
              <StageEstimate input={numeric(dyeing.fabricReceivedKg)} output={numeric(dyeing.compactingDeliveryKg)} expense={numeric(dyeing.dyeingExpense)} label="Dyeing" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !dyeing.dyeingPiNo || !dyeing.dyeingPartyDetails || !dyeing.dyeingMillDetails || !dyeing.fabricReceivedKg || !dyeing.color || !dyeing.dyeingCount || !dyeing.rollCount || !dyeing.dyeingOutputWeightKg || !dyeing.compactingDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/dyeing`, { method: "POST", body: JSON.stringify({ ...dyeing, fabricReceivedKg: numeric(dyeing.fabricReceivedKg), rollCount: numeric(dyeing.rollCount), dyeingOutputWeightKg: numeric(dyeing.dyeingOutputWeightKg), dyeingExpense: numeric(dyeing.dyeingExpense), compactingDeliveryKg: numeric(dyeing.compactingDeliveryKg) }) }), "compacting")}>Save dyeing & continue <ArrowRight size={15} /></Button></div>
            </div>}

            {activeStage === "compacting" && <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2"><Field label="Date"><Input type="date" value={compacting.compactingDate} onChange={(e) => setCompacting({ ...compacting, compactingDate: e.target.value })} /></Field><Field label="Received weight" hint="KG"><Input type="number" min="0" step="0.001" value={compacting.compactingReceivedKg} onChange={(e) => setCompacting({ ...compacting, compactingReceivedKg: e.target.value })} /></Field><Field label="Delivered to office" hint="KG"><Input type="number" min="0" step="0.001" value={compacting.officeDeliveryKg} onChange={(e) => setCompacting({ ...compacting, officeDeliveryKg: e.target.value })} /></Field><Field label="Compacting expense" hint="₹"><Input type="number" min="0" step="0.01" value={compacting.compactingExpense} onChange={(e) => setCompacting({ ...compacting, compactingExpense: e.target.value })} /></Field></div>
              <StageEstimate input={numeric(compacting.compactingReceivedKg)} output={numeric(compacting.officeDeliveryKg)} expense={numeric(compacting.compactingExpense)} label="Compacting" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !compacting.compactingReceivedKg || !compacting.officeDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/compacting`, { method: "POST", body: JSON.stringify({ ...compacting, compactingReceivedKg: numeric(compacting.compactingReceivedKg), officeDeliveryKg: numeric(compacting.officeDeliveryKg), compactingExpense: numeric(compacting.compactingExpense) }) }), "final")}>Deliver to office <Warehouse size={15} /></Button></div>
            </div>}

            {activeStage === "final" && <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2"><Field label="Final delivery date"><Input type="date" value={finalEntry.finalDate} onChange={(e) => setFinalEntry({ ...finalEntry, finalDate: e.target.value })} /></Field><Field label="Final delivered weight" hint="KG"><Input type="number" min="0" step="0.001" value={finalEntry.finalDeliveredKg} onChange={(e) => setFinalEntry({ ...finalEntry, finalDeliveredKg: e.target.value })} /></Field><Field label="Collected amount" hint="₹"><Input type="number" min="0" step="0.01" value={finalEntry.collectedAmount} onChange={(e) => setFinalEntry({ ...finalEntry, collectedAmount: e.target.value })} /></Field><Field label="Other expense" hint="₹"><Input type="number" min="0" step="0.01" value={finalEntry.otherExpense} onChange={(e) => setFinalEntry({ ...finalEntry, otherExpense: e.target.value })} /></Field><Field label="Final notes" className="md:col-span-2"><Input placeholder="Delivery, payment or balance notes" value={finalEntry.notes} onChange={(e) => setFinalEntry({ ...finalEntry, notes: e.target.value })} /></Field></div>
              <div className="grid gap-3 rounded-2xl bg-[#143b32] p-4 text-white sm:grid-cols-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Final total loss</p><p className="mt-1 text-lg font-bold">{kg(Math.max(0, (selected?.purchasedWeightKg || 0) - numeric(finalEntry.finalDeliveredKg)))}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Balance fabric</p><p className="mt-1 text-lg font-bold">{kg(Math.max(0, (selected?.officeDeliveryKg || 0) - numeric(finalEntry.finalDeliveredKg)))}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Estimated profit</p><p className={cn("mt-1 text-lg font-bold", numeric(finalEntry.collectedAmount) - ((selected?.metrics.totalSpent || 0) + numeric(finalEntry.otherExpense)) >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(numeric(finalEntry.collectedAmount) - ((selected?.metrics.totalSpent || 0) + numeric(finalEntry.otherExpense)))}</p></div></div>
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !finalEntry.finalDeliveredKg || !finalEntry.collectedAmount} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/final`, { method: "POST", body: JSON.stringify({ ...finalEntry, finalDeliveredKg: numeric(finalEntry.finalDeliveredKg), collectedAmount: numeric(finalEntry.collectedAmount), otherExpense: numeric(finalEntry.otherExpense) }) }))}>Complete delivery <CheckCircle2 size={15} /></Button></div>
            </div>}
          </CardContent>
        </Card>

        <Card className="overflow-hidden 2xl:sticky 2xl:top-24">
          <CardHeader><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a77a24]">Live batch calculation</p><h3 className="mt-1 font-bold text-[#183b32]">Weight & profitability</h3></CardHeader>
          <CardContent>
            {!selected ? <div className="py-10 text-center"><Scale className="mx-auto text-gray-300" size={30} /><p className="mt-3 text-sm font-bold text-gray-600">No batch selected</p><p className="mt-1 text-xs text-gray-400">Create or select a yarn batch to see its calculation.</p></div> : <BatchCalculation flow={selected} />}
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a24]">Complete register</p><h3 className="mt-1 text-xl font-bold tracking-tight text-[#183b32]">Yarn-to-fabric batches</h3></div><span className="text-xs text-gray-400">{result.data.length} total batches</span></CardHeader>
        <CardContent className="p-0">
          {result.data.length === 0 ? <div className="px-5 py-14 text-center"><PackageCheck className="mx-auto text-gray-300" size={30} /><p className="mt-3 font-bold">No yarn batches yet</p><p className="mt-1 text-sm text-gray-500">Use Yarn purchase above to start the first batch.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-[#f7f9f8] text-left text-[9px] font-extrabold uppercase tracking-[.12em] text-gray-400"><tr><th className="px-5 py-3">Batch / PI</th><th className="px-5 py-3">Party & mill</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3">Current weight</th><th className="px-5 py-3">Total loss</th><th className="px-5 py-3">Spend</th><th className="px-5 py-3">Profit</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-gray-100">{result.data.map((flow) => <tr key={flow.id} className={cn("transition hover:bg-[#fafcfb]", selectedId === flow.id && "bg-emerald-50/40")}><td className="px-5 py-4"><p className="font-bold text-[#183b32]">{flow.flowNo}</p><p className="mt-1 text-[11px] text-gray-400">{flow.piNo} · {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(flow.purchaseDate))}</p></td><td className="px-5 py-4"><p className="font-semibold text-gray-700">{flow.partyDetails}</p><p className="mt-1 text-[11px] text-gray-400">{flow.millDetails}</p></td><td className="px-5 py-4 font-semibold">{kg(flow.purchasedWeightKg)}</td><td className="px-5 py-4 font-semibold text-emerald-700">{kg(flow.metrics.currentWeightKg)}</td><td className="px-5 py-4"><p className="font-semibold text-rose-600">{kg(flow.metrics.totalLossKg)}</p><p className="mt-1 text-[10px] text-gray-400">{flow.metrics.lossPct.toFixed(2)}%</p></td><td className="px-5 py-4 font-semibold">{money(flow.metrics.totalSpent)}</td><td className={cn("px-5 py-4 font-bold", flow.metrics.profit >= 0 ? "text-emerald-700" : "text-rose-600")}>{money(flow.metrics.profit)}</td><td className="px-5 py-4"><Badge tone={statusTone(flow.status)}>{flow.status.replaceAll("_", " ")}</Badge></td><td className="px-5 py-4"><button onClick={() => { selectBatch(flow.id); setActiveStage(flow.status === "PURCHASED" ? "knitting" : flow.status === "KNITTING" ? "dyeing" : flow.status === "DYEING" || flow.status === "COMPACTING" ? "compacting" : "final"); window.scrollTo({ top: 640, behavior: "smooth" }); }} className="inline-flex items-center gap-1 text-xs font-bold text-[#266956]">Open <ArrowRight size={13} /></button></td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function StageEstimate({ input, output, expense, label }: { input: number; output: number; expense: number; label: string }) {
  const loss = Math.max(0, input - output);
  return <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label} input</p><p className="mt-1 text-base font-bold text-gray-800">{kg(input)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Calculated loss</p><p className="mt-1 text-base font-bold text-rose-700">{kg(loss)} <span className="text-[10px] font-medium">({input ? ((loss / input) * 100).toFixed(2) : "0.00"}%)</span></p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Stage expense</p><p className="mt-1 text-base font-bold text-amber-800">{money(expense)}</p></div></div>;
}

function BatchCalculation({ flow }: { flow: FabricFlow }) {
  const weights = [
    { label: "Yarn purchased", value: flow.purchasedWeightKg, loss: flow.metrics.yarnLossKg, icon: Boxes },
    { label: "After knitting", value: flow.dyeingDeliveryKg, loss: flow.metrics.knittingLossKg, icon: Factory },
    { label: "After dyeing", value: flow.compactingDeliveryKg, loss: flow.metrics.dyeingLossKg, icon: Droplets },
    { label: "At office", value: flow.officeDeliveryKg, loss: flow.metrics.compactingLossKg, icon: Warehouse },
    { label: "Final delivered", value: flow.finalDeliveredKg, loss: flow.metrics.balanceFabricKg, icon: Truck },
  ];
  return <div>
    <div className="rounded-2xl bg-[#143b32] p-4 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{flow.piNo}</p><p className="mt-1 text-lg font-bold">{flow.flowNo}</p><p className="mt-1 text-[11px] text-white/45">{flow.partyDetails} · {flow.yarnCount}</p></div><Badge tone={flow.status === "DELIVERED" ? "success" : "warning"}>{flow.status.replaceAll("_", " ")}</Badge></div></div>
    <div className="mt-5">
      {weights.map((item, index) => { const Icon = item.icon; return <div key={item.label} className="flex gap-3"><div className="flex w-9 shrink-0 flex-col items-center"><div className={cn("relative z-10 grid h-9 w-9 place-items-center rounded-xl", item.value === null ? "bg-gray-100 text-gray-400" : "bg-emerald-100 text-emerald-700")}><Icon size={15} /></div>{index < weights.length - 1 && <div className="-my-1 min-h-5 flex-1 border-l-2 border-dashed border-gray-200" />}</div><div className="mb-3 flex min-w-0 flex-1 items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-xs font-bold text-gray-700">{item.label}</p>{index > 0 && <p className="mt-1 text-[9px] font-bold uppercase text-rose-400">Loss {kg(item.loss)}</p>}</div><strong className={item.value === null ? "text-gray-300" : "text-gray-800"}>{item.value === null ? "—" : kg(item.value)}</strong></div></div>; })}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-rose-50 p-3"><p className="text-[9px] font-bold uppercase text-rose-500">Total loss</p><p className="mt-1 text-sm font-bold text-rose-800">{kg(flow.metrics.totalLossKg)}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-[9px] font-bold uppercase text-blue-500">Balance fabric</p><p className="mt-1 text-sm font-bold text-blue-800">{kg(flow.metrics.balanceFabricKg)}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-bold uppercase text-amber-600">Total spent</p><p className="mt-1 text-sm font-bold text-amber-900">{money(flow.metrics.totalSpent)}</p></div><div className={cn("rounded-xl p-3", flow.metrics.profit >= 0 ? "bg-emerald-50" : "bg-rose-50")}><p className={cn("text-[9px] font-bold uppercase", flow.metrics.profit >= 0 ? "text-emerald-600" : "text-rose-500")}>Net profit</p><p className={cn("mt-1 text-sm font-bold", flow.metrics.profit >= 0 ? "text-emerald-900" : "text-rose-800")}>{money(flow.metrics.profit)}</p></div></div>
  </div>;
}
