import { toast } from "@/lib/toast-store";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/v1";
export type ApiInit = RequestInit & { silent?: boolean };
export async function api<T = any>(
  path: string,
  init: ApiInit = {},
): Promise<T> {
  const { silent, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...requestInit,
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (
      res.status === 401 &&
      !path.includes("/auth/refresh") &&
      !path.includes("/auth/login")
    ) {
      const rr = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (rr.ok)
        res = await fetch(`${API_URL}${path}`, {
          ...requestInit,
          headers,
          credentials: "include",
          cache: "no-store",
        });
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : "Unable to reach the server. Check your connection and try again.";
    if (!silent) toast.error(message, "Connection error");
    throw new Error(message);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      message = Array.isArray(j.message) ? j.message.join(", ") : j.message || message;
    } catch {}
    if (!silent) toast.error(message);
    throw new Error(message);
  }
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  return res as unknown as T;
}
