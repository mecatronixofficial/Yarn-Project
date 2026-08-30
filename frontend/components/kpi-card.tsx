import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
export function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
  tone = "green",
}: {
  title: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: "green" | "gold" | "blue" | "rose";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Card className="group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-[1.65rem] font-bold tracking-[-.04em]">{value}</p>
          {caption && <p className="mt-1 text-xs text-gray-400">{caption}</p>}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl transition-transform group-hover:scale-105", tones[tone])}>
          <Icon size={19} />
        </div>
      </div>
    </Card>
  );
}
