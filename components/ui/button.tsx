import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline";
type ButtonSize = "default" | "sm" | "lg";

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-[3px] focus-visible:ring-amber-300/25",
        variant === "default" && "bg-[#f5c548] text-slate-950 hover:bg-amber-300",
        variant === "outline" && "border border-slate-700/80 bg-slate-900/60 text-slate-100 hover:bg-slate-800/80",
        size === "default" && "h-9 px-3.5 py-1.5",
        size === "sm" && "h-8 rounded-md px-3 text-xs",
        size === "lg" && "h-10 rounded-md px-5",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
