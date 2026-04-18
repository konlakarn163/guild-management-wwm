"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { useEffect, useState } from "react";

const copy = {
  th: {
    tagline: "กิลด์ไทยสายจริงจัง สำหรับผู้เล่นที่ต้องการ Guild War และคอนเทนต์ทีม",
    recruitLabel: "สนใจเข้าร่วมกิลด์ ติดต่อ",
    recruitCta: "Facebook ",
  },
  en: {
    tagline: "A serious Thai guild for coordinated Guild War and team content.",
    recruitLabel: "Interested in joining? Contact",
    recruitCta: "Facebook Group",
  },
} as const;

const RECRUIT_LINK = "https://www.facebook.com/shay.wannasilp";

export function SiteFooter() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <footer className="border-t border-white/6 bg-[#010307] min-h-[150px]" />;
  }

  const t = copy[language];

  return (
    <footer className="border-t border-white/6 bg-[#010307]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 md:px-8 md:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-amber-200/55">
              Where Winds Meet · TH
            </p>
            <p className="mt-3 text-[1.9rem] leading-none text-white" style={{ fontFamily: "var(--font-script)" }}>
              MeawMeaw
            </p>
            <p className="mt-4 text-xs text-slate-400">{t.tagline}</p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-100/40">Guild ID</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-slate-100">10068118</p>
          </div>
        </div>

        <div className="h-px w-full bg-white/6" />

        <div className="flex flex-col gap-2 text-sm text-slate-300">
          <p className="text-slate-400">{t.recruitLabel}</p>
          <a
            href={RECRUIT_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/35 bg-amber-200/10 px-3 py-1.5 font-semibold text-amber-100 transition hover:border-amber-100/60 hover:bg-amber-200/15 hover:text-amber-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.9h2.54V9.86c0-2.52 1.49-3.92 3.78-3.92 1.1 0 2.25.2 2.25.2v2.47H15.2c-1.25 0-1.64.78-1.64 1.58v1.89h2.8l-.45 2.9h-2.35V22c4.78-.75 8.44-4.91 8.44-9.93z" />
            </svg>
            <span>{t.recruitCta}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}