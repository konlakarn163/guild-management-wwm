import { cn } from "@/lib/utils";
import { PawPrint } from "@/components/public/cat-decor";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface SectionCardProps extends ComponentPropsWithoutRef<"section"> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  cat?: boolean;
}

export function SectionCard({ title, subtitle, action, children, className, cat = false, ...props }: SectionCardProps) {
  return (
    <section
      {...props}
      className={cn(
        "scroll-mt-24 rounded-md border border-amber-100/10 bg-[#040a13]/90 p-4 text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur transition-transform duration-200 sm:p-5 lg:p-6",
        cat && "relative rounded-2xl",
        className,
      )}
    >
      {cat ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <PawPrint className="absolute -bottom-5 -right-3 h-20 w-20 -rotate-12 text-amber-200/[0.035]" />
        </div>
      ) : null}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-amber-100/10 pb-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2.5 text-2xl leading-none tracking-wide text-slate-100">
            {cat ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-[#f5c548]">
                <PawPrint className="h-3.5 w-3.5" />
              </span>
            ) : null}
            {title}
          </h3>
          {subtitle ? <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
