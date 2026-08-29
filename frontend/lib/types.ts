export type Role = "SUPERADMIN" | "MANAGER" | "WORKER";
export type User = { id: string; name: string; email: string; role: Role };
export type DashboardData = {
  kpis: Record<string, number>;
  machines: Record<string, number>;
  activeProduction: Array<{
    id: string;
    productionNo: string;
    orderNo: string;
    customer: string;
    fabric: string;
    color: string;
    qtyKg: number;
    status: string;
  }>;
};
