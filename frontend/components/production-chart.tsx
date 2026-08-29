"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const data = [
  { day: "Mon", Yarn: 5200, Knitting: 4800, Dyeing: 4200 },
  { day: "Tue", Yarn: 5800, Knitting: 5200, Dyeing: 4600 },
  { day: "Wed", Yarn: 5500, Knitting: 5100, Dyeing: 4500 },
  { day: "Thu", Yarn: 6200, Knitting: 5800, Dyeing: 4900 },
  { day: "Fri", Yarn: 6800, Knitting: 6100, Dyeing: 5300 },
  { day: "Sat", Yarn: 6400, Knitting: 5900, Dyeing: 5100 },
  { day: "Sun", Yarn: 7100, Knitting: 6500, Dyeing: 5700 },
];
export function ProductionChart() {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Yarn"
            stroke="#143b32"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="Knitting"
            stroke="#d3a64c"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="Dyeing"
            stroke="#3b82f6"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
