import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function kg(v: number | string | undefined | null) {
  return `${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} KG`;
}

export function money(v: number | string | undefined | null) {
  return `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
