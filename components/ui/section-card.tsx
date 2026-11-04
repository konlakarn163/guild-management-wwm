import { cn } from "@/lib/utils";
import { CatEars, PawPrint } from "@/components/public/cat-decor";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface SectionCardProps extends ComponentPropsWithoutRef<"section"> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Adds cat ears on the top edge and a paw badge beside the title. */
  cat?: boolean;
}

export function SectionCard({ title, subtitle, action, children, className, cat = false, ...props }: SectionCardProps) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-md border border-amber-100/10 bg-[#040a13]/90 p-6 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur transition-transform duration-200 ",
        cat && "relative mt-8 rounded-2xl",
        className,
      )}
    >
      {cat ? (
        <>
          <CatEars />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
            <PawPrint className="absolute -bottom-5 -right-3 h-20 w-20 -rotate-12 text-amber-200/[0.035]" />
          </div>
        </>
      ) : null}
      <header className="mb-5 flex flex-col gap-2 border-b border-amber-100/10 pb-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-[1.55rem] font-bold tracking-tight text-slate-100">
            {cat ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-[#f5c548]">
                <PawPrint className="h-4 w-4" />
              </span>
            ) : null}
            {title}
          </h3>
          {action}
        </div>
        {subtitle ? <p className="max-w-2xl text-sm leading-6 text-slate-300/85">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
