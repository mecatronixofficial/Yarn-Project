import { ActionMessage } from "@/lib/use-api-action";
export function InlineMessage({ message }: { message: ActionMessage }) {
  if (!message) return null;
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        message.error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message.text}
    </div>
  );
}
