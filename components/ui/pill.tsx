import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  variant?: "warm" | "neutral" | "success";
}

export function Pill({ children, variant = "neutral" }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
        variant === "warm" && "border-slate-900/15 bg-slate-900 text-slate-50",
        variant === "neutral" && "border-slate-300 bg-slate-100 text-slate-700",
        variant === "success" && "border-emerald-300 bg-emerald-50 text-emerald-700",
      )}
    >
      {children}
    </span>
  );
}