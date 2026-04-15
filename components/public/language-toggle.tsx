"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  inverted?: boolean;
}

export function LanguageToggle({ className, inverted = false }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-1 py-1 backdrop-blur",
        inverted ? "border-white/20 bg-black/20" : "border-slate-300 bg-white/80",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLanguage("th")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
          language === "th"
            ? inverted
              ? "bg-white text-slate-950"
              : "bg-slate-950 text-white"
            : inverted
              ? "text-white/65 hover:text-white"
              : "text-slate-500 hover:text-slate-950",
        )}
      >
        TH
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
          language === "en"
            ? inverted
              ? "bg-white text-slate-950"
              : "bg-slate-950 text-white"
            : inverted
              ? "text-white/65 hover:text-white"
              : "text-slate-500 hover:text-slate-950",
        )}
      >
        EN
      </button>
    </div>
  );
}
