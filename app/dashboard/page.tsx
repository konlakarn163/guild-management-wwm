import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CornerWidget } from "../../components/public/corner-widget";
import { FloatingNavbar } from "../../components/public/floating-navbar";
import { PawPrint, PawTrail, PeekingCat, SleepingCat, YarnBall } from "@/components/public/cat-decor";
import { getGuildInfo } from "@/lib/guild-info";

export default async function DashboardPage() {
  const guildInfo = await getGuildInfo();

  return (
    <AuthGuard>
      <FloatingNavbar guildInfo={guildInfo} menuLinksToHome />
      <CornerWidget showLanguage={false} hideOnScroll />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header
          id="top"
          className="relative mt-12 rounded-2xl border border-amber-100/10 bg-[#040a13]/90 px-5 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] md:px-6"
        >
          <PeekingCat className="absolute -top-[3.15rem] right-[18%] w-20" />
          <YarnBall className="pointer-events-none absolute -top-7 left-[10%] h-8 w-10 motion-safe:animate-[cat-roll_5s_ease-in-out_infinite]" />
          <span className="absolute -top-9 right-[calc(18%+5.5rem)] hidden rounded-2xl rounded-br-sm border border-amber-300/30 bg-[#0a1320] px-2.5 py-0.5 text-xs font-semibold text-amber-100 motion-safe:animate-[cat-wiggle_2.4s_ease-in-out_infinite] sm:block">
            เหมียว~
          </span>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <PawPrint className="absolute -bottom-6 right-[8%] h-20 w-20 rotate-12 text-amber-200/[0.04]" />
            <PawTrail count={6} className="absolute bottom-3 right-[36%] hidden text-amber-200/[0.07] md:flex" />
          </div>

          <div className="relative">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200/70">
              <PawPrint className="h-3 w-3 text-[#f5c548]" />
              Member Console
            </p>
            <h1 className="mt-2 text-3xl leading-none text-slate-100 md:text-4xl">Guild Operations Dashboard</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 md:text-sm">
              Profile, weekly registration, team preparation, and strategy planning in one workspace.
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <DashboardShell />
        </section>

        <footer className="flex flex-col items-center gap-1.5 pb-3 pt-4 text-xs font-semibold text-amber-100/50">
          <SleepingCat className="h-9 w-16 text-[#f28b3c]" />
          เหมียวหลับฝันดี… แล้วเจอกันในสนามรบ
        </footer>
      </main>
    </AuthGuard>
  );
}