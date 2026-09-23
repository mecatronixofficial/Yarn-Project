"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number; color: string };

const tooltipKg = (value: number | string | undefined) =>
  `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;

export function QualityDonut({ approvedKg, reworkKg, rejectedKg }: { approvedKg: number; reworkKg: number; rejectedKg: number }) {
  const total = approvedKg + reworkKg + rejectedKg;
  const data: Slice[] = [
    { name: "Approved", value: approvedKg, color: "#10b981" },
    { name: "Rework", value: reworkKg, color: "#f59e0b" },
    { name: "Rejected", value: rejectedKg, color: "#f43f5e" },
  ];
  const yieldPct = total ? Math.round((approvedKg / total) * 100) : 0;

  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total ? data : [{ name: "No data", value: 1, color: "#e5e9e7" }]}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={62}
            paddingAngle={total ? 3 : 0}
            stroke="none"
          >
            {(total ? data : [{ name: "No data", value: 1, color: "#e5e9e7" }]).map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          {total > 0 && (
            <Tooltip
              formatter={(value, name) => [tooltipKg(value as number), name]}
              contentStyle={{ border: "1px solid #dfe8e4", borderRadius: 12, boxShadow: "0 16px 36px -20px rgba(20,59,50,.55)", fontSize: 12 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{yieldPct}%</p>
          <p className="text-[8px] font-bold uppercase tracking-wide text-gray-400">Approved</p>
        </div>
      </div>
    </div>
  );
}
