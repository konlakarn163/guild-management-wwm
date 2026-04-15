import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FloatingNavbar } from "@/components/public/floating-navbar";
import { apiFetch } from "@/lib/api";
import type { GuildInfo } from "@/lib/types";

async function getGuildInfo(): Promise<GuildInfo> {
  try {
    return await apiFetch<GuildInfo>("/api/public/guild");
  } catch {
    return {
      name: "MeawMeaw",
      code: "10068118",
      description: "กิลด์ Where Winds Meet สายไทย มุ่งเน้น Guild War และการควบคุมพื้นที่",
      memberCount: 58,
    };
  }
}

export default async function DashboardPage() {
  const guildInfo = await getGuildInfo();

  return (
    <AuthGuard>
      <FloatingNavbar guildInfo={guildInfo} menuLinksToHome />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header id="top" className="rounded-md border border-amber-100/10 bg-[#040a13]/90 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">Member Console</p>
          <h1 className="mt-3 text-4xl font-black text-slate-100 md:text-5xl">Guild Operations Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">
            Profile, weekly registration, team preparation, and strategy planning in one workspace.
          </p>
        </header>

        <section className="grid gap-6">
          <DashboardShell />
        </section>
      </main>
    </AuthGuard>
  );
}