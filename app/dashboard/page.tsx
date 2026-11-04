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
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header
          id="top"
          className="relative mt-16 rounded-2xl border border-amber-100/10 bg-[#040a13]/90 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] md:px-8 md:py-8"
        >
          <PeekingCat className="absolute -top-[4.4rem] right-[18%] w-28" />
          <YarnBall className="pointer-events-none absolute -top-9 left-[10%] h-10 w-12 motion-safe:animate-[cat-roll_5s_ease-in-out_infinite]" />          <span className="absolute -top-12 right-[calc(18%+7.5rem)] hidden rounded-2xl rounded-br-sm border border-amber-300/30 bg-[#0a1320] px-3 py-1 text-sm font-semibold text-amber-100 motion-safe:animate-[cat-wiggle_2.4s_ease-in-out_infinite] sm:block">
            เหมียว~
          </span>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <PawPrint className="absolute -bottom-6 right-[8%] h-24 w-24 rotate-12 text-amber-200/[0.04]" />
            <PawPrint className="absolute bottom-8 right-[24%] h-9 w-9 -rotate-12 text-amber-200/[0.06]" />
            <PawPrint className="absolute right-[34%] top-6 h-6 w-6 rotate-6 text-amber-200/[0.05]" />
            <PawTrail count={7} className="absolute bottom-4 right-[40%] hidden text-amber-200/[0.07] md:flex" />
          </div>

          <div className="relative">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">
              <PawPrint className="h-3.5 w-3.5 text-[#f5c548]" />
              Member Console
            </p>
            <h1 className="mt-3 text-4xl font-black text-slate-100 md:text-5xl">Guild Operations Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">
              Profile, weekly registration, team preparation, and strategy planning in one workspace.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1 text-xs font-semibold text-amber-100/80">
              <PawPrint className="h-3 w-3 text-[#f28b3c]" />
              ยินดีต้อนรับกลับสู่ฝูงเหมียว
            </p>
          </div>
        </header>

        <section className="grid gap-6">
          <DashboardShell />
        </section>

        <footer className="flex flex-col items-center gap-2 pb-4 pt-6 text-xs font-semibold text-amber-100/50">
          <SleepingCat className="h-12 w-20 text-[#f28b3c]" />
          เหมียวหลับฝันดี… แล้วเจอกันในสนามรบ
        </footer>
      </main>
    </AuthGuard>
  );
}