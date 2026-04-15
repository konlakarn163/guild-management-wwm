import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface SectionCardProps extends ComponentPropsWithoutRef<"section"> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, children, className, ...props }: SectionCardProps) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-md border border-amber-100/10 bg-[#040a13]/90 p-6 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur transition-transform duration-200 ",
        className,
      )}
    >
      <header className="mb-5 flex flex-col gap-2 border-b border-amber-100/10 pb-4">
        <h3 className="text-[1.55rem] font-bold tracking-tight text-slate-100">{title}</h3>
        {subtitle ? <p className="max-w-2xl text-sm leading-6 text-slate-300/85">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}