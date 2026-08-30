export type Role = "SUPERADMIN" | "MANAGER" | "WORKER";
export type User = { id: string; name: string; email: string; role: Role };
export type DashboardData = {
  generatedAt: string;
  kpis: Record<string, number>;
  machines: Record<string, number>;
  productionTrend: Array<{
    date: string;
    yarnKg: number;
    knittingKg: number;
    dyeingKg: number;
  }>;
  pipeline: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  quality: {
    counts: Record<string, number>;
    approvedKg: number;
    rejectedKg: number;
    reworkKg: number;
  };
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    createdAt: string;
  }>;
  activeProduction: Array<{
    id: string;
    salesOrderId: string;
    productionNo: string;
    orderNo: string;
    customer: string;
    fabric: string;
    color: string;
    qtyKg: number;
    outputKg: number;
    progressPct: number;
    dueDate: string | null;
    priority: string;
    status: string;
  }>;
};
