import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";
export function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {caption && <p className="mt-1 text-xs text-gray-400">{caption}</p>}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#143b32]/8 text-[#143b32]">
          <Icon size={19} />
        </div>
      </div>
    </Card>
  );
}
