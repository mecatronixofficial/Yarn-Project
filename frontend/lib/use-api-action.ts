"use client";
import { useState } from "react";
import { toast } from "@/lib/toast-store";

export type ActionMessage = { text: string; error: boolean } | null;

export function useApiAction() {
  const [message, setMessage] = useState<ActionMessage>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (successMessage) {
        setMessage({ text: successMessage, error: false });
        toast.success(successMessage);
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Action failed";
      setMessage({ text: errorMessage, error: true });
      // Duplicate API errors are suppressed by the toast store. This also
      // covers failures thrown by non-API actions passed to this hook.
      toast.error(errorMessage);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { message, setMessage, busy, run };
}
