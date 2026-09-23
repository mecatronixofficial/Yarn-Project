"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  Factory,
  Gauge,
  Hash,
  Layers,
  PackageCheck,
  Palette,
  Plus,
  RefreshCw,
  Scale,
  Shirt,
  Sparkles,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { cn, kg, money } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
  knittingYarnStock: string | null;
  knittingFabricStock: string | null;
  knittingGg: string | null;
  knittingLl: string | null;
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
  dyeingGreyWeightKg: number | null;
  color: string | null;
  dyeingCount: string | null;
  rollCount: number | null;
  dyeingOutputWeightKg: number | null;
  dyeingExpense: number;
  compactingDeliveryKg: number | null;
  compactingDate: string | null;
  compactingInwardNo: string | null;
  compactingReceivedKg: number | null;
  compactingOutwardNo: string | null;
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

type FlowDirectory = { dealers: string[]; mills: string[]; yarnStocks: string[]; fabricStocks: string[] };

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
  amber: { icon: "bg-amber-100 text-amber-700" },
  emerald: { icon: "bg-emerald-100 text-emerald-700" },
  blue: { icon: "bg-blue-100 text-blue-700" },
  violet: { icon: "bg-violet-100 text-violet-700" },
  rose: { icon: "bg-rose-100 text-rose-700" },
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

function Metric({ label, value, icon: Icon, tone, accent, note }: { label: string; value: string; icon: typeof Scale; tone: string; accent: "amber" | "blue" | "emerald" | "violet" | "rose"; note: string }) {
  return (
    <div className={cn("production-metric", `production-metric--${accent}`)}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-gray-400">{label}</p><p className="mt-2 text-xl font-bold tracking-[-.04em] text-gray-800">{value}</p><p className="mt-1 text-[10px] text-gray-400">{note}</p></div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tone)}><Icon size={17} /></div>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, caption }: { icon: typeof Scale; title: string; caption?: string }) {
  return (
    <div className="production-section-heading">
      <span><Icon size={14} /></span>
      <div><h4>{title}</h4>{caption && <p>{caption}</p>}</div>
    </div>
  );
}

export default function Production() {
  const [result, setResult] = useState<FlowResponse | null>(null);
  const [directory, setDirectory] = useState<FlowDirectory>({ dealers: [], mills: [], yarnStocks: [], fabricStocks: [] });
  const [selectedId, setSelectedId] = useState("");
  const [activeStage, setActiveStage] = useState<StageKey>("purchase");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [purchase, setPurchase] = useState({ purchaseDate: localDate(), piNo: "", partyDetails: "", millDetails: "", yarnCount: "", bagCount: "", purchasedWeightKg: "", yarnRatePerKg: "", purchaseOtherCost: "0", deliveryPlace: "", notes: "" });
  const [knitting, setKnitting] = useState({ knittingDate: localDate(), knittingPiNo: "", knittingPartyDetails: "", knittingMillDetails: "", knittingYarnStock: "", knittingFabricStock: "", knittingGg: "", knittingLl: "", yarnReceivedKg: "", dailyProductivityKg: "", knittingDeliveryKg: "", knittingExpense: "0", dyeingDeliveryKg: "" });
  const [dyeing, setDyeing] = useState({ dyeingDate: localDate(), dyeingPiNo: "", dyeingPartyDetails: "", dyeingMillDetails: "", fabricReceivedKg: "", dyeingGreyWeightKg: "", color: "", dyeingCount: "", rollCount: "", dyeingOutputWeightKg: "", dyeingExpense: "0", compactingDeliveryKg: "" });
  const [compacting, setCompacting] = useState({ compactingDate: localDate(), compactingInwardNo: "", compactingReceivedKg: "", compactingOutwardNo: "", officeDeliveryKg: "", compactingExpense: "0" });
  const [finalEntry, setFinalEntry] = useState({ finalDate: localDate(), finalDeliveredKg: "", collectedAmount: "", otherExpense: "0", notes: "" });

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoadingError("");
    try {
      const [response, flowDirectory] = await Promise.all([
        api<FlowResponse>("/production/fabric-flows"),
        api<FlowDirectory>("/production/fabric-flows/directory"),
      ]);
      setResult(response);
      setDirectory(flowDirectory);
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
      knittingYarnStock: selected.knittingYarnStock || "",
      knittingFabricStock: selected.knittingFabricStock || "",
      knittingGg: selected.knittingGg || "",
      knittingLl: selected.knittingLl || "",
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
      dyeingGreyWeightKg: String(selected.dyeingGreyWeightKg ?? ""),
      color: selected.color || "",
      dyeingCount: selected.dyeingCount || selected.yarnCount,
      rollCount: String(selected.rollCount ?? ""),
      dyeingOutputWeightKg: String(selected.dyeingOutputWeightKg ?? ""),
      dyeingExpense: String(selected.dyeingExpense || 0),
      compactingDeliveryKg: String(selected.compactingDeliveryKg ?? ""),
    });
    setCompacting({ compactingDate: localDate(selected.compactingDate), compactingInwardNo: selected.compactingInwardNo || "", compactingReceivedKg: String(selected.compactingReceivedKg ?? selected.compactingDeliveryKg ?? ""), compactingOutwardNo: selected.compactingOutwardNo || "", officeDeliveryKg: String(selected.officeDeliveryKg ?? ""), compactingExpense: String(selected.compactingExpense || 0) });
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
      const successMessage = `${saved.flowNo} saved. Weight, loss, cost and profit were recalculated.`;
      setNotice({ tone: "success", text: successMessage });
      toast.success(successMessage, "Production stage saved");
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
    <div className="production-page mx-auto max-w-[1800px] space-y-4 pb-8">
      <section className="production-hero overflow-hidden rounded-[20px] p-3.5 text-white md:p-4">
        <div className="relative z-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="production-hero__monogram"><Factory size={19} /></div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-white/55"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Own material production <span className="mx-0.5 text-white/25">·</span><span className="text-emerald-200">CRM · ERM Production Control</span></div>
              <h2 className="mt-1 text-xl font-black tracking-[-.03em] md:text-2xl">Yarn to finished fabric</h2>
            </div>
          </div>
          <Button size="sm" className="border border-white/15 bg-white/10 text-white hover:bg-white/15" disabled={refreshing} onClick={() => void load(true)}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh ledger</Button>
        </div>
        <div className="production-hero__meta relative z-10 mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["Active batches", result.summary.activeBatches, Boxes, "text-amber-200"],
            ["Purchased yarn", kg(result.summary.purchasedKg), Scale, "text-emerald-300"],
            ["Current material", kg(result.summary.currentKg), Shirt, "text-sky-200"],
            ["Recorded loss", kg(result.summary.totalLossKg), AlertTriangle, "text-rose-300"],
          ] as const).map(([label, value, Icon, tone]) => <div key={label}><div className="production-hero-chip-icon"><Icon size={16} className={tone} /></div><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-0.5 text-base font-bold">{value}</p></div></div>)}
        </div>
      </section>

      {notice && <div className={cn("flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{notice.tone === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{notice.text}</div>}

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total production spend" value={money(result.summary.totalSpent)} icon={Banknote} tone="bg-amber-50 text-amber-700" accent="amber" note="Yarn and every process expense" />
        <Metric label="Delivery collection" value={money(result.summary.collectedAmount)} icon={CircleDollarSign} tone="bg-blue-50 text-blue-700" accent="blue" note="Amount collected after delivery" />
        <Metric label="Net profit" value={money(result.summary.profit)} icon={result.summary.profit >= 0 ? CheckCircle2 : AlertTriangle} tone={result.summary.profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"} accent={result.summary.profit >= 0 ? "emerald" : "rose"} note="Collection minus total spend" />
        <Metric label="Overall yield" value={`${result.summary.purchasedKg ? ((result.summary.currentKg / result.summary.purchasedKg) * 100).toFixed(1) : "0.0"}%`} icon={Scale} tone="bg-violet-50 text-violet-700" accent="violet" note="Current material from purchased yarn" />
      </section>

      <section>
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a24]">Main process</p><h3 className="mt-1 text-xl font-bold tracking-tight text-[#183b32]">Select the stage to record</h3></div>
        <div className="production-stage-nav mt-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon; const tone = stageTone[stage.tone]; const active = activeStage === stage.key;
            const exactCount = result.data.filter((flow) => index === 0 ? flow.status === "PURCHASED" : statusOrder[flow.status] === index).length;
            return (
              <Fragment key={stage.key}>
                <button onClick={() => setActiveStage(stage.key)} className={cn("production-stage", active && "is-active")}>
                  <div className={cn("production-stage-icon", tone.icon)}><Icon size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-gray-400">Stage {stage.number}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-gray-800">{stage.label}</p>
                    <p className="truncate text-[10px] text-gray-400">{stage.caption}</p>
                  </div>
                  <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-white px-1.5 text-[10px] font-bold shadow-sm">{exactCount}</span>
                </button>
                {index < stages.length - 1 && <span className="production-stage-connector" aria-hidden="true" />}
              </Fragment>
            );
          })}
        </div>
      </section>

      <section className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.42fr)_minmax(320px,.58fr)]">
        <Card className="production-workspace overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 bg-[#f7faf8]">
            <div><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a77a24]">Stage entry</p><h3 className="mt-1 text-lg font-bold text-[#183b32]">{stages.find((stage) => stage.key === activeStage)?.label}</h3></div>
            {activeStage !== "purchase" && <select className="erp-input max-w-md" value={selectedId} onChange={(event) => selectBatch(event.target.value)}><option value="">Select fabric batch</option>{result.data.map((flow) => <option key={flow.id} value={flow.id}>{flow.flowNo} · {flow.piNo} · {flow.partyDetails}</option>)}</select>}
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            {!stageReady && <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><div><p className="font-bold">Previous stage is incomplete</p><p className="mt-1 text-xs">Select this batch’s previous process and record its delivered weight first.</p></div></div>}

            {activeStage === "purchase" && <div className="space-y-0">
              <div className="production-field-section">
                <SectionHeading icon={Hash} title="Batch identity" caption="Reference and date for this purchase" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Purchase date"><Input type="date" value={purchase.purchaseDate} onChange={(e) => setPurchase({ ...purchase, purchaseDate: e.target.value })} /></Field>
                  <Field label="PI number" hint="Required"><Input placeholder="PI / invoice reference" value={purchase.piNo} onChange={(e) => setPurchase({ ...purchase, piNo: e.target.value })} /></Field>
                  <Field label="Yarn count"><Input placeholder="e.g. 30s" value={purchase.yarnCount} onChange={(e) => setPurchase({ ...purchase, yarnCount: e.target.value })} /></Field>
                </div>
              </div>
              <div className="production-field-section">
                <SectionHeading icon={UserRound} title="Party & mill" caption="Search a registered name or add a new one" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Dealer / agent name" className="md:col-span-2"><SearchableSelect placeholder="Search registered dealer / agent or add new" options={directory.dealers} value={purchase.partyDetails} onChange={(value) => setPurchase({ ...purchase, partyDetails: value })} /></Field>
                  <Field label="Mill name"><SearchableSelect placeholder="Search registered mill or add new" options={directory.mills} value={purchase.millDetails} onChange={(value) => setPurchase({ ...purchase, millDetails: value })} /></Field>
                </div>
              </div>
              <div className="production-field-section">
                <SectionHeading icon={Scale} title="Quantity & cost" caption="Weight, rate and delivery details" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Number of bags"><Input type="number" min="1" placeholder="0" value={purchase.bagCount} onChange={(e) => setPurchase({ ...purchase, bagCount: e.target.value })} /></Field>
                  <Field label="Purchased weight" hint="KG"><Input type="number" min="0" step="0.001" placeholder="1000.000" value={purchase.purchasedWeightKg} onChange={(e) => setPurchase({ ...purchase, purchasedWeightKg: e.target.value })} /></Field>
                  <Field label="Yarn rate" hint="₹ / KG"><Input type="number" min="0" step="0.01" placeholder="0.00" value={purchase.yarnRatePerKg} onChange={(e) => setPurchase({ ...purchase, yarnRatePerKg: e.target.value })} /></Field>
                  <Field label="Other purchase cost" hint="₹"><Input type="number" min="0" step="0.01" value={purchase.purchaseOtherCost} onChange={(e) => setPurchase({ ...purchase, purchaseOtherCost: e.target.value })} /></Field>
                  <Field label="Delivery place" className="md:col-span-2"><Input placeholder="Where the yarn is delivered" value={purchase.deliveryPlace} onChange={(e) => setPurchase({ ...purchase, deliveryPlace: e.target.value })} /></Field>
                  <Field label="Notes"><Input placeholder="Optional" value={purchase.notes} onChange={(e) => setPurchase({ ...purchase, notes: e.target.value })} /></Field>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Calculated yarn amount</p><p className="mt-1 text-xl font-bold text-amber-900">{money(numeric(purchase.purchasedWeightKg) * numeric(purchase.yarnRatePerKg) + numeric(purchase.purchaseOtherCost))}</p></div><Button disabled={saving || !purchase.piNo || !purchase.partyDetails || !purchase.millDetails || !purchase.yarnCount || !purchase.bagCount || !purchase.purchasedWeightKg || !purchase.deliveryPlace} onClick={() => void run(() => api<FabricFlow>("/production/fabric-flows", { method: "POST", body: JSON.stringify({ ...purchase, bagCount: numeric(purchase.bagCount), purchasedWeightKg: numeric(purchase.purchasedWeightKg), yarnRatePerKg: numeric(purchase.yarnRatePerKg), purchaseOtherCost: numeric(purchase.purchaseOtherCost) }) }), "knitting")}>{saving ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} Create yarn batch</Button></div>
            </div>}

            {activeStage === "knitting" && <div className="space-y-5">
              <div className="space-y-0">
                <div className="production-field-section">
                  <SectionHeading icon={Hash} title="Process identity" caption="Date, PI reference and yarn intake" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Date"><Input type="date" value={knitting.knittingDate} onChange={(e) => setKnitting({ ...knitting, knittingDate: e.target.value })} /></Field>
                    <Field label="PI number"><Input value={knitting.knittingPiNo} onChange={(e) => setKnitting({ ...knitting, knittingPiNo: e.target.value })} /></Field>
                    <Field label="Yarn received" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.yarnReceivedKg} onChange={(e) => setKnitting({ ...knitting, yarnReceivedKg: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={Layers} title="Stock & construction" caption="Search registered stock or add new" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Yarn stock"><SearchableSelect placeholder="Search registered yarn stock or add new" options={directory.yarnStocks} value={knitting.knittingYarnStock} onChange={(value) => setKnitting({ ...knitting, knittingYarnStock: value })} /></Field>
                    <Field label="Fabric stock"><SearchableSelect placeholder="Search registered fabric stock or add new" options={directory.fabricStocks} value={knitting.knittingFabricStock} onChange={(value) => setKnitting({ ...knitting, knittingFabricStock: value })} /></Field>
                    <Field label="Gauge (GG)"><Input placeholder="e.g. 28G" value={knitting.knittingGg} onChange={(e) => setKnitting({ ...knitting, knittingGg: e.target.value })} /></Field>
                    <Field label="Loop length (LL)"><Input placeholder="e.g. 2.8mm" value={knitting.knittingLl} onChange={(e) => setKnitting({ ...knitting, knittingLl: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={UserRound} title="Party & mill" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Party details" className="md:col-span-2"><Input value={knitting.knittingPartyDetails} onChange={(e) => setKnitting({ ...knitting, knittingPartyDetails: e.target.value })} /></Field>
                    <Field label="Mill details"><Input value={knitting.knittingMillDetails} onChange={(e) => setKnitting({ ...knitting, knittingMillDetails: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={Gauge} title="Output & cost" caption="Productivity, delivery weight and expense" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Daily productivity" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.dailyProductivityKg} onChange={(e) => setKnitting({ ...knitting, dailyProductivityKg: e.target.value })} /></Field>
                    <Field label="Knitted output" hint="KG"><Input type="number" min="0" step="0.001" value={knitting.knittingDeliveryKg} onChange={(e) => setKnitting({ ...knitting, knittingDeliveryKg: e.target.value })} /></Field>
                    <Field label="Daily/process expense" hint="₹"><Input type="number" min="0" step="0.01" value={knitting.knittingExpense} onChange={(e) => setKnitting({ ...knitting, knittingExpense: e.target.value })} /></Field>
                    <Field label="Delivered to dyeing" hint="KG" className="md:col-span-2 xl:col-span-3"><Input type="number" min="0" step="0.001" value={knitting.dyeingDeliveryKg} onChange={(e) => setKnitting({ ...knitting, dyeingDeliveryKg: e.target.value })} /></Field>
                  </div>
                </div>
              </div>
              <StageEstimate input={numeric(knitting.yarnReceivedKg)} output={numeric(knitting.dyeingDeliveryKg)} expense={numeric(knitting.knittingExpense)} label="Knitting" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !knitting.knittingPiNo || !knitting.knittingPartyDetails || !knitting.knittingMillDetails || !knitting.knittingYarnStock || !knitting.knittingFabricStock || !knitting.yarnReceivedKg || !knitting.knittingDeliveryKg || !knitting.dyeingDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/knitting`, { method: "POST", body: JSON.stringify({ ...knitting, yarnReceivedKg: numeric(knitting.yarnReceivedKg), dailyProductivityKg: numeric(knitting.dailyProductivityKg), knittingDeliveryKg: numeric(knitting.knittingDeliveryKg), knittingExpense: numeric(knitting.knittingExpense), dyeingDeliveryKg: numeric(knitting.dyeingDeliveryKg) }) }), "dyeing")}>Save knitting & continue <ArrowRight size={15} /></Button></div>
            </div>}

            {activeStage === "dyeing" && <div className="space-y-5">
              <div className="space-y-0">
                <div className="production-field-section">
                  <SectionHeading icon={Hash} title="Process identity" caption="Date, PI reference and fabric intake" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Date"><Input type="date" value={dyeing.dyeingDate} onChange={(e) => setDyeing({ ...dyeing, dyeingDate: e.target.value })} /></Field>
                    <Field label="PI number"><Input value={dyeing.dyeingPiNo} onChange={(e) => setDyeing({ ...dyeing, dyeingPiNo: e.target.value })} /></Field>
                    <Field label="Fabric received" hint="KG"><Input type="number" min="0" step="0.001" value={dyeing.fabricReceivedKg} onChange={(e) => setDyeing({ ...dyeing, fabricReceivedKg: e.target.value })} /></Field>
                    <Field label="Grey fabric weight" hint="KG"><Input type="number" min="0" step="0.001" value={dyeing.dyeingGreyWeightKg} onChange={(e) => setDyeing({ ...dyeing, dyeingGreyWeightKg: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={UserRound} title="Party & mill" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Party details" className="md:col-span-2"><Input value={dyeing.dyeingPartyDetails} onChange={(e) => setDyeing({ ...dyeing, dyeingPartyDetails: e.target.value })} /></Field>
                    <Field label="Mill details"><Input value={dyeing.dyeingMillDetails} onChange={(e) => setDyeing({ ...dyeing, dyeingMillDetails: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={Palette} title="Fabric specs" caption="Colour, count and rolls" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Colour"><Input placeholder="Fabric colour" value={dyeing.color} onChange={(e) => setDyeing({ ...dyeing, color: e.target.value })} /></Field>
                    <Field label="Count"><Input value={dyeing.dyeingCount} onChange={(e) => setDyeing({ ...dyeing, dyeingCount: e.target.value })} /></Field>
                    <Field label="Number of rolls"><Input type="number" min="0" value={dyeing.rollCount} onChange={(e) => setDyeing({ ...dyeing, rollCount: e.target.value })} /></Field>
                    <Field label="Dyeing output" hint="KG"><Input type="number" min="0" step="0.001" value={dyeing.dyeingOutputWeightKg} onChange={(e) => setDyeing({ ...dyeing, dyeingOutputWeightKg: e.target.value })} /></Field>
                  </div>
                </div>
                <div className="production-field-section">
                  <SectionHeading icon={Banknote} title="Cost & delivery" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Dyeing expense" hint="₹"><Input type="number" min="0" step="0.01" value={dyeing.dyeingExpense} onChange={(e) => setDyeing({ ...dyeing, dyeingExpense: e.target.value })} /></Field>
                    <Field label="Delivered to compacting" hint="KG" className="md:col-span-1 xl:col-span-2"><Input type="number" min="0" step="0.001" value={dyeing.compactingDeliveryKg} onChange={(e) => setDyeing({ ...dyeing, compactingDeliveryKg: e.target.value })} /></Field>
                  </div>
                </div>
              </div>
              <StageEstimate input={numeric(dyeing.fabricReceivedKg)} output={numeric(dyeing.compactingDeliveryKg)} expense={numeric(dyeing.dyeingExpense)} label="Dyeing" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !dyeing.dyeingPiNo || !dyeing.dyeingPartyDetails || !dyeing.dyeingMillDetails || !dyeing.fabricReceivedKg || !dyeing.dyeingGreyWeightKg || !dyeing.color || !dyeing.dyeingCount || !dyeing.rollCount || !dyeing.dyeingOutputWeightKg || !dyeing.compactingDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/dyeing`, { method: "POST", body: JSON.stringify({ ...dyeing, fabricReceivedKg: numeric(dyeing.fabricReceivedKg), dyeingGreyWeightKg: numeric(dyeing.dyeingGreyWeightKg), rollCount: numeric(dyeing.rollCount), dyeingOutputWeightKg: numeric(dyeing.dyeingOutputWeightKg), dyeingExpense: numeric(dyeing.dyeingExpense), compactingDeliveryKg: numeric(dyeing.compactingDeliveryKg) }) }), "compacting")}>Save dyeing & continue <ArrowRight size={15} /></Button></div>
            </div>}

            {activeStage === "compacting" && <div className="space-y-5">
              <div className="production-field-section">
                <SectionHeading icon={Sparkles} title="Compacting details" caption="Inward receipt and outward delivery" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Date"><Input type="date" value={compacting.compactingDate} onChange={(e) => setCompacting({ ...compacting, compactingDate: e.target.value })} /></Field>
                  <Field label="Inward number" hint="Gate pass / challan"><Input placeholder="Inward reference" value={compacting.compactingInwardNo} onChange={(e) => setCompacting({ ...compacting, compactingInwardNo: e.target.value })} /></Field>
                  <Field label="Received weight" hint="KG"><Input type="number" min="0" step="0.001" value={compacting.compactingReceivedKg} onChange={(e) => setCompacting({ ...compacting, compactingReceivedKg: e.target.value })} /></Field>
                  <Field label="Outward number" hint="Gate pass / challan"><Input placeholder="Outward reference" value={compacting.compactingOutwardNo} onChange={(e) => setCompacting({ ...compacting, compactingOutwardNo: e.target.value })} /></Field>
                  <Field label="Delivered to office" hint="KG"><Input type="number" min="0" step="0.001" value={compacting.officeDeliveryKg} onChange={(e) => setCompacting({ ...compacting, officeDeliveryKg: e.target.value })} /></Field>
                  <Field label="Compacting expense" hint="₹"><Input type="number" min="0" step="0.01" value={compacting.compactingExpense} onChange={(e) => setCompacting({ ...compacting, compactingExpense: e.target.value })} /></Field>
                </div>
              </div>
              <StageEstimate input={numeric(compacting.compactingReceivedKg)} output={numeric(compacting.officeDeliveryKg)} expense={numeric(compacting.compactingExpense)} label="Compacting" />
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !compacting.compactingInwardNo || !compacting.compactingReceivedKg || !compacting.compactingOutwardNo || !compacting.officeDeliveryKg} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/compacting`, { method: "POST", body: JSON.stringify({ ...compacting, compactingReceivedKg: numeric(compacting.compactingReceivedKg), officeDeliveryKg: numeric(compacting.officeDeliveryKg), compactingExpense: numeric(compacting.compactingExpense) }) }), "final")}>Deliver to office <Warehouse size={15} /></Button></div>
            </div>}

            {activeStage === "final" && <div className="space-y-5">
              <div className="production-field-section">
                <SectionHeading icon={Truck} title="Final delivery details" caption="Delivered weight, collection and notes" />
                <div className="grid gap-4 md:grid-cols-2"><Field label="Final delivery date"><Input type="date" value={finalEntry.finalDate} onChange={(e) => setFinalEntry({ ...finalEntry, finalDate: e.target.value })} /></Field><Field label="Final delivered weight" hint="KG"><Input type="number" min="0" step="0.001" value={finalEntry.finalDeliveredKg} onChange={(e) => setFinalEntry({ ...finalEntry, finalDeliveredKg: e.target.value })} /></Field><Field label="Collected amount" hint="₹"><Input type="number" min="0" step="0.01" value={finalEntry.collectedAmount} onChange={(e) => setFinalEntry({ ...finalEntry, collectedAmount: e.target.value })} /></Field><Field label="Other expense" hint="₹"><Input type="number" min="0" step="0.01" value={finalEntry.otherExpense} onChange={(e) => setFinalEntry({ ...finalEntry, otherExpense: e.target.value })} /></Field><Field label="Final notes" className="md:col-span-2"><Input placeholder="Delivery, payment or balance notes" value={finalEntry.notes} onChange={(e) => setFinalEntry({ ...finalEntry, notes: e.target.value })} /></Field></div>
              </div>
              <div className="grid gap-3 rounded-2xl bg-[#1b3c55] p-4 text-white sm:grid-cols-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Final total loss</p><p className="mt-1 text-lg font-bold">{kg(Math.max(0, (selected?.purchasedWeightKg || 0) - numeric(finalEntry.finalDeliveredKg)))}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Balance fabric</p><p className="mt-1 text-lg font-bold">{kg(Math.max(0, (selected?.officeDeliveryKg || 0) - numeric(finalEntry.finalDeliveredKg)))}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Estimated profit</p><p className={cn("mt-1 text-lg font-bold", numeric(finalEntry.collectedAmount) - ((selected?.metrics.totalSpent || 0) + numeric(finalEntry.otherExpense)) >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(numeric(finalEntry.collectedAmount) - ((selected?.metrics.totalSpent || 0) + numeric(finalEntry.otherExpense)))}</p></div></div>
              <div className="flex justify-end"><Button disabled={saving || !stageReady || !finalEntry.finalDeliveredKg || !finalEntry.collectedAmount} onClick={() => void run(() => api<FabricFlow>(`/production/fabric-flows/${selectedId}/final`, { method: "POST", body: JSON.stringify({ ...finalEntry, finalDeliveredKg: numeric(finalEntry.finalDeliveredKg), collectedAmount: numeric(finalEntry.collectedAmount), otherExpense: numeric(finalEntry.otherExpense) }) }))}>Complete delivery <CheckCircle2 size={15} /></Button></div>
            </div>}
          </CardContent>
        </Card>

        <Card className="production-live-card overflow-hidden 2xl:sticky 2xl:top-20">
          <CardHeader><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a77a24]">Live batch calculation</p><h3 className="mt-1 font-bold text-[#183b32]">Weight & profitability</h3></CardHeader>
          <CardContent className="p-4">
            {!selected ? <div className="py-10 text-center"><Scale className="mx-auto text-gray-300" size={30} /><p className="mt-3 text-sm font-bold text-gray-600">No batch selected</p><p className="mt-1 text-xs text-gray-400">Create or select a yarn batch to see its calculation.</p></div> : <BatchCalculation flow={selected} />}
          </CardContent>
        </Card>
      </section>

      <Card className="production-register overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a24]">Complete register</p><h3 className="mt-1 text-xl font-bold tracking-tight text-[#183b32]">Yarn-to-fabric batches</h3></div><span className="text-xs text-gray-400">{result.data.length} total batches</span></CardHeader>
        <CardContent className="p-0">
          {result.data.length === 0 ? <div className="px-5 py-14 text-center"><PackageCheck className="mx-auto text-gray-300" size={30} /><p className="mt-3 font-bold">No yarn batches yet</p><p className="mt-1 text-sm text-gray-500">Use Yarn purchase above to start the first batch.</p></div> : <div className="overflow-x-auto"><table className="production-table w-full min-w-[1050px] text-sm"><thead className="bg-[#f7f9f8] text-left text-[9px] font-extrabold uppercase tracking-[.12em] text-gray-400"><tr><th className="px-5 py-3">Batch / PI</th><th className="px-5 py-3">Party & mill</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3">Current weight</th><th className="px-5 py-3">Total loss</th><th className="px-5 py-3">Spend</th><th className="px-5 py-3">Profit</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-gray-100">{result.data.map((flow) => <tr key={flow.id} className={cn("transition hover:bg-[#fafcfb]", selectedId === flow.id && "bg-emerald-50/40")}><td className="px-5 py-4"><p className="font-bold text-[#183b32]">{flow.flowNo}</p><p className="mt-1 text-[11px] text-gray-400">{flow.piNo} · {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(flow.purchaseDate))}</p></td><td className="px-5 py-4"><p className="font-semibold text-gray-700">{flow.partyDetails}</p><p className="mt-1 text-[11px] text-gray-400">{flow.millDetails}</p></td><td className="px-5 py-4 font-semibold">{kg(flow.purchasedWeightKg)}</td><td className="px-5 py-4 font-semibold text-emerald-700">{kg(flow.metrics.currentWeightKg)}</td><td className="px-5 py-4"><p className="font-semibold text-rose-600">{kg(flow.metrics.totalLossKg)}</p><p className="mt-1 text-[10px] text-gray-400">{flow.metrics.lossPct.toFixed(2)}%</p></td><td className="px-5 py-4 font-semibold">{money(flow.metrics.totalSpent)}</td><td className={cn("px-5 py-4 font-bold", flow.metrics.profit >= 0 ? "text-emerald-700" : "text-rose-600")}>{money(flow.metrics.profit)}</td><td className="px-5 py-4"><Badge tone={statusTone(flow.status)}>{flow.status.replaceAll("_", " ")}</Badge></td><td className="px-5 py-4"><button onClick={() => { selectBatch(flow.id); setActiveStage(flow.status === "PURCHASED" ? "knitting" : flow.status === "KNITTING" ? "dyeing" : flow.status === "DYEING" || flow.status === "COMPACTING" ? "compacting" : "final"); window.scrollTo({ top: 640, behavior: "smooth" }); }} className="inline-flex items-center gap-1 text-xs font-bold text-[#266956]">Open <ArrowRight size={13} /></button></td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>

      <style jsx global>{`
        .production-page {
          --erp-ink: #102a25;
          --erp-green: #174f43;
          --erp-green-2: #236c5a;
          --erp-mint: #dff7ee;
          --erp-gold: #c98b2b;
          --erp-bg: #f3f7f5;
          --erp-line: #dfe9e4;
          position: relative;
          isolation: isolate;
        }

        .production-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -2;
          pointer-events: none;
          background:
            radial-gradient(circle at 8% 8%, rgba(44, 130, 103, .08), transparent 24rem),
            radial-gradient(circle at 92% 20%, rgba(201, 139, 43, .08), transparent 22rem),
            linear-gradient(180deg, #fbfdfc 0%, var(--erp-bg) 100%);
        }

        .production-hero {
          position: relative;
          background:
            radial-gradient(circle at 88% 18%, rgba(92, 230, 180, .2), transparent 16rem),
            radial-gradient(circle at 18% 100%, rgba(255,255,255,.08), transparent 20rem),
            linear-gradient(135deg, #0b2d26 0%, #123f35 48%, #1c5e4e 100%);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 18px 44px rgba(14, 55, 45, .18), inset 0 1px 0 rgba(255,255,255,.08);
        }

        .production-hero::after {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          right: -70px;
          top: -95px;
          border-radius: 52px;
          border: 1px solid rgba(255,255,255,.08);
          transform: rotate(28deg);
          box-shadow: 0 0 0 34px rgba(255,255,255,.025), 0 0 0 68px rgba(255,255,255,.018);
        }

        .production-hero__monogram {
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 15px;
          color: #bff6e1;
          background: linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.06));
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 12px 24px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.16);
          transform: perspective(500px) rotateX(4deg) rotateY(-7deg);
        }

        .production-hero__meta > div {
          min-height: 56px;
          border-radius: 16px;
          padding: 10px 12px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
        }

        .production-metric {
          position: relative;
          overflow: hidden;
          min-height: 108px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(223,233,228,.95);
          box-shadow: 0 10px 24px rgba(17, 54, 45, .07), 0 2px 0 rgba(255,255,255,.95) inset;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
          transform-style: preserve-3d;
        }

        .production-metric::after {
          content: "";
          position: absolute;
          inset: auto -20px -42px auto;
          width: 92px;
          height: 92px;
          border-radius: 28px;
          transform: rotate(28deg);
          opacity: .1;
          background: currentColor;
        }

        .production-metric:hover {
          transform: translateY(-3px) perspective(800px) rotateX(1deg);
          border-color: #cbded5;
          box-shadow: 0 16px 34px rgba(17, 54, 45, .11);
        }

        .production-metric--amber { color: #b7791f; }
        .production-metric--blue { color: #2563eb; }
        .production-metric--emerald { color: #0f8a62; }
        .production-metric--violet { color: #7c3aed; }
        .production-metric--rose { color: #e11d48; }
        .production-metric p { color: initial; }

        .production-stage-nav {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          border: 1px solid var(--erp-line);
          border-radius: 20px;
          background: rgba(255,255,255,.8);
          box-shadow: 0 10px 24px rgba(17,54,45,.05), inset 0 1px 0 white;
        }

        .production-stage-connector { display: none; }

        .production-stage {
          position: relative;
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 9px;
          min-height: 62px;
          padding: 8px 9px;
          border-radius: 15px;
          border: 1px solid transparent;
          background: transparent;
          text-align: left;
          transition: .2s ease;
        }

        .production-stage:hover {
          background: #f7fbf9;
          transform: translateY(-1px);
        }

        .production-stage.is-active {
          background: linear-gradient(145deg, #ffffff, #eef8f4);
          border-color: #cce4da;
          box-shadow: 0 10px 20px rgba(24, 83, 67, .1), inset 0 1px 0 white;
          transform: translateY(-2px);
        }

        .production-stage.is-active::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: -9px;
          height: 3px;
          border-radius: 99px;
          background: linear-gradient(90deg, #1b6a56, #49b58f);
          box-shadow: 0 2px 7px rgba(27,106,86,.32);
        }

        .production-stage-icon {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 5px 12px rgba(20,60,50,.06);
        }

        .production-workspace,
        .production-live-card,
        .production-register {
          border: 1px solid var(--erp-line) !important;
          border-radius: 22px !important;
          background: rgba(255,255,255,.94) !important;
          box-shadow: 0 14px 34px rgba(17,54,45,.07), inset 0 1px 0 white !important;
        }

        .production-workspace > div:first-child,
        .production-live-card > div:first-child,
        .production-register > div:first-child {
          padding: 13px 16px;
        }

        .production-workspace > div:first-child {
          background:
            linear-gradient(90deg, rgba(218,244,233,.6), rgba(255,255,255,.85)),
            #f8fbf9 !important;
          border-bottom: 1px solid var(--erp-line);
        }

        .production-field-section {
          padding: 14px 0;
          border-bottom: 1px dashed #e3ebe7;
        }
        .production-field-section:first-child { padding-top: 0; }
        .production-field-section:last-child { border-bottom: 0; }

        .production-section-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .production-section-heading > span {
          display: grid;
          width: 29px;
          height: 29px;
          place-items: center;
          border-radius: 10px;
          color: #1c6b56;
          background: linear-gradient(145deg, #e8f8f1, #d9efe6);
          border: 1px solid #d4e9df;
          box-shadow: 0 5px 10px rgba(28,107,86,.08), inset 0 1px 0 white;
        }

        .production-section-heading h4 {
          color: var(--erp-ink);
          font-size: 12px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -.01em;
        }
        .production-section-heading p {
          margin-top: 2px;
          color: #8a9a94;
          font-size: 9px;
          line-height: 1.2;
        }

        .production-page input,
        .production-page .erp-input {
          min-height: 38px !important;
          border-radius: 11px !important;
          border-color: #dce7e2 !important;
          background: #fbfdfc !important;
          box-shadow: inset 0 1px 2px rgba(20,65,54,.025) !important;
          font-size: 12px !important;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .production-page input:focus,
        .production-page .erp-input:focus {
          border-color: #78b8a1 !important;
          background: white !important;
          box-shadow: 0 0 0 3px rgba(45,129,101,.1) !important;
          outline: none !important;
        }

        .production-page button:not(.production-stage) {
          border-radius: 11px;
        }

        .production-calc-header {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          background:
            radial-gradient(circle at 90% 10%, rgba(90,225,176,.18), transparent 10rem),
            linear-gradient(145deg, #102f29, #1a5648);
          box-shadow: 0 14px 26px rgba(18, 66, 54, .16), inset 0 1px 0 rgba(255,255,255,.08);
        }

        .production-calc-avatar {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 13px;
          background: rgba(255,255,255,.09);
          border: 1px solid rgba(255,255,255,.1);
          color: #a9efd3;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }

        .production-ring {
          display: grid;
          width: 66px;
          height: 66px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 999px;
          box-shadow: 0 10px 18px rgba(0,0,0,.12);
        }

        .production-ring > div {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          align-content: center;
          border-radius: inherit;
          background: #fff;
          box-shadow: inset 0 1px 2px rgba(20,60,50,.08);
        }

        .production-timeline-icon {
          box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
        }
        .production-timeline-icon.is-filled {
          color: #17644f;
          background: linear-gradient(145deg, #e8f8f1, #ccebdd);
          border: 1px solid #d3eade;
          box-shadow: 0 6px 12px rgba(23,100,79,.08), inset 0 1px 0 white;
        }

        .production-stat-tile {
          min-height: 86px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid #e3ece8;
          background: linear-gradient(145deg, #ffffff, #f8fbfa);
          box-shadow: 0 7px 16px rgba(17,54,45,.045), inset 0 1px 0 white;
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .production-stat-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 11px 20px rgba(17,54,45,.08);
        }

        .production-stat-icon {
          display: grid;
          width: 27px;
          height: 27px;
          place-items: center;
          border-radius: 9px;
        }

        .production-table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f6faf8;
          border-bottom: 1px solid #e2ebe7;
        }
        .production-table tbody tr { transition: background .15s ease, transform .15s ease; }
        .production-table tbody tr:hover { background: #f7fbf9; }
        .production-table td { padding-top: 11px !important; padding-bottom: 11px !important; }

        @media (max-width: 1024px) {
          .production-stage-nav {
            grid-template-columns: repeat(5, minmax(145px, 1fr));
            overflow-x: auto;
            scrollbar-width: thin;
          }
        }

        @media (max-width: 640px) {
          .production-hero { border-radius: 20px; }
          .production-metric { min-height: 96px; }
          .production-workspace,
          .production-live-card,
          .production-register { border-radius: 18px !important; }
          .production-page input,
          .production-page .erp-input { min-height: 40px !important; }
        }
      `}</style>
    </div>
  );
}

function StageEstimate({ input, output, expense, label }: { input: number; output: number; expense: number; label: string }) {
  const loss = Math.max(0, input - output);
  return <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label} input</p><p className="mt-1 text-base font-bold text-gray-800">{kg(input)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Calculated loss</p><p className="mt-1 text-base font-bold text-rose-700">{kg(loss)} <span className="text-[10px] font-medium">({input ? ((loss / input) * 100).toFixed(2) : "0.00"}%)</span></p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Stage expense</p><p className="mt-1 text-base font-bold text-amber-800">{money(expense)}</p></div></div>;
}

function StatTile({ icon: Icon, iconClass, label, value, note, tone }: { icon: typeof Scale; iconClass: string; label: string; value: string; note?: string; tone: string }) {
  return (
    <div className="production-stat-tile">
      <div className={cn("production-stat-icon", iconClass)}><Icon size={13} /></div>
      <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", tone)}>{value}</p>
      {note && <p className="mt-0.5 text-[9px] font-medium text-gray-400">{note}</p>}
    </div>
  );
}

function BatchCalculation({ flow }: { flow: FabricFlow }) {
  const weights = [
    { label: "Yarn purchased", value: flow.purchasedWeightKg, loss: flow.metrics.yarnLossKg, icon: Boxes },
    { label: "After knitting", value: flow.dyeingDeliveryKg, loss: flow.metrics.knittingLossKg, icon: Factory },
    { label: "After dyeing", value: flow.compactingDeliveryKg, loss: flow.metrics.dyeingLossKg, icon: Droplets },
    { label: "At office", value: flow.officeDeliveryKg, loss: flow.metrics.compactingLossKg, icon: Warehouse },
    { label: "Final delivered", value: flow.finalDeliveredKg, loss: flow.metrics.balanceFabricKg, icon: Truck },
  ];
  const profitable = flow.metrics.profit >= 0;
  const yieldPct = Math.max(0, Math.min(100, flow.purchasedWeightKg ? (flow.metrics.currentWeightKg / flow.purchasedWeightKg) * 100 : 0));

  return <div>
    <div className="production-calc-header p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="production-calc-avatar"><Boxes size={19} /></div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{flow.piNo}</p>
            <p className="mt-0.5 truncate text-lg font-bold">{flow.flowNo}</p>
            <p className="mt-0.5 truncate text-[11px] text-white/45">{flow.partyDetails} · {flow.yarnCount}</p>
          </div>
        </div>
        <Badge tone={flow.status === "DELIVERED" ? "success" : "warning"}>{flow.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
        <div className="production-ring" style={{ background: `conic-gradient(#3ecf8e ${yieldPct}%, rgba(255,255,255,.14) 0)` }}>
          <div><p className="text-base font-bold text-[#1b3c55]">{yieldPct.toFixed(0)}%</p><p className="text-[7px] font-bold uppercase tracking-wide text-gray-400">Yield</p></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Material retained</p>
          <p className="mt-1 text-xl font-bold">{kg(flow.metrics.currentWeightKg)}</p>
          <p className="mt-1 text-[10px] text-white/45">of {kg(flow.purchasedWeightKg)} purchased</p>
        </div>
      </div>
    </div>

    <div className="mt-5">
      {weights.map((item, index) => { const Icon = item.icon; return <div key={item.label} className="flex gap-3"><div className="flex w-9 shrink-0 flex-col items-center"><div className={cn("production-timeline-icon relative z-10 grid h-9 w-9 place-items-center rounded-xl", item.value === null ? "bg-gray-100 text-gray-400" : "is-filled")}><Icon size={15} /></div>{index < weights.length - 1 && <div className="-my-1 min-h-5 flex-1 border-l-2 border-dashed border-gray-200" />}</div><div className="mb-3 flex min-w-0 flex-1 items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-xs font-bold text-gray-700">{item.label}</p>{index > 0 && <p className="mt-1 text-[9px] font-bold uppercase text-rose-400">Loss {kg(item.loss)}</p>}</div><strong className={item.value === null ? "text-gray-300" : "text-gray-800"}>{item.value === null ? "—" : kg(item.value)}</strong></div></div>; })}
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <StatTile icon={Scale} iconClass="bg-emerald-100 text-emerald-700" label="Total weight" value={kg(flow.metrics.currentWeightKg)} tone="text-emerald-900" />
      <StatTile icon={AlertTriangle} iconClass="bg-rose-100 text-rose-600" label="Total loss" value={kg(flow.metrics.totalLossKg)} note={`${flow.metrics.lossPct.toFixed(1)}% of purchased`} tone="text-rose-800" />
      <StatTile icon={Layers} iconClass="bg-blue-100 text-blue-700" label="Balance" value={kg(flow.metrics.balanceFabricKg)} tone="text-blue-800" />
      <StatTile icon={Banknote} iconClass="bg-amber-100 text-amber-700" label="Total cost" value={money(flow.metrics.totalSpent)} tone="text-amber-900" />
      <StatTile icon={CircleDollarSign} iconClass={profitable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"} label="Net profit" value={money(flow.metrics.profit)} tone={profitable ? "text-emerald-900" : "text-rose-800"} />
      <StatTile icon={CheckCircle2} iconClass="bg-violet-100 text-violet-700" label="Collected" value={money(flow.collectedAmount)} tone="text-violet-900" />
    </div>
  </div>;
}
