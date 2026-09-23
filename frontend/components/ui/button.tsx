import * as React from "react";
import { cn } from "@/lib/utils";
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "danger";
    size?: "sm" | "md";
  }
>(({ className, variant = "default", size = "md", ...p }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
      size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
      variant === "default" && "bg-primary text-white hover:bg-[#12283a]",
      variant === "outline" &&
        "border border-gray-200 bg-white hover:bg-gray-50",
      variant === "ghost" && "hover:bg-gray-100",
      variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
      className,
    )}
    {...p}
  />
));
Button.displayName = "Button";
