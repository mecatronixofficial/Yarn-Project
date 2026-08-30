"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  date: string;
  yarnKg: number;
  knittingKg: number;
  dyeingKg: number;
};

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );

const tooltipKg = (value: number | string | undefined) =>
  `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;

export function ProductionChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="yarnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#236b59" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#236b59" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="knitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d3a64c" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#d3a64c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dyeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f7cac" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#4f7cac" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e8eeeb" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickFormatter={shortDate}
            tick={{ fill: "#7a8882", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7a8882", fontSize: 11 }}
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <Tooltip
            formatter={(value, name) => [tooltipKg(value as number), name]}
            labelFormatter={(label) =>
              new Intl.DateTimeFormat("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              }).format(new Date(`${label}T00:00:00`))
            }
            contentStyle={{
              border: "1px solid #dfe8e4",
              borderRadius: 14,
              boxShadow: "0 16px 36px -20px rgba(20,59,50,.55)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="yarnKg"
            name="Yarn"
            stroke="#236b59"
            fill="url(#yarnGradient)"
            strokeWidth={2.25}
          />
          <Area
            type="monotone"
            dataKey="knittingKg"
            name="Knitting"
            stroke="#d3a64c"
            fill="url(#knitGradient)"
            strokeWidth={2.25}
          />
          <Area
            type="monotone"
            dataKey="dyeingKg"
            name="Dyeing"
            stroke="#4f7cac"
            fill="url(#dyeGradient)"
            strokeWidth={2.25}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
