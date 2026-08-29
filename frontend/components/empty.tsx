import { Inbox } from "lucide-react";
export function Empty({
  title = "No records found",
  description = "There is nothing to show yet.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-8 text-center">
      <div>
        <Inbox className="mx-auto mb-3 text-gray-400" />
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
