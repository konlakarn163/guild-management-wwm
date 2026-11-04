import { AuthGuard } from "@/components/auth/auth-guard";
import { GuildSettingsForm } from "@/components/admin/guild-settings-form";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { WarRegistrationManager } from "@/components/admin/war-registration-manager";
import { TeamManagementPanel } from "@/components/admin/team-management-panel";
import { DiscordNoticeSender } from "@/components/admin/discord-notice-sender";
import { CornerWidget } from "../../components/public/corner-widget";
import { FloatingNavbar } from "../../components/public/floating-navbar";
import { PawPrint, PeekingCat } from "@/components/public/cat-decor";
import { getGuildInfo } from "@/lib/guild-info";

export default async function AdminPage() {
  const guildInfo = await getGuildInfo();

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <FloatingNavbar guildInfo={guildInfo} menuLinksToHome />
      <CornerWidget showLanguage={false} hideOnScroll />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header className="relative mt-16 rounded-2xl border border-amber-100/10 bg-[#040a13]/90 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] md:px-8 md:py-8">
          <PeekingCat className="absolute -top-[4.4rem] right-[18%] w-28" />
          <span className="absolute -top-12 right-[calc(18%+7.5rem)] hidden rounded-2xl rounded-br-sm border border-amber-300/30 bg-[#0a1320] px-3 py-1 text-sm font-semibold text-amber-100 motion-safe:animate-[cat-wiggle_2.4s_ease-in-out_infinite] sm:block">
            เมี้ยว!
          </span>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <PawPrint className="absolute -bottom-6 right-[8%] h-24 w-24 rotate-12 text-amber-200/[0.04]" />
            <PawPrint className="absolute bottom-8 right-[24%] h-9 w-9 -rotate-12 text-amber-200/[0.06]" />
            <PawPrint className="absolute right-[34%] top-6 h-6 w-6 rotate-6 text-amber-200/[0.05]" />
          </div>

          <div className="relative">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">
              <PawPrint className="h-3.5 w-3.5 text-[#f5c548]" />
              Admin Control
            </p>
            <h1 className="mt-3 text-4xl font-black text-slate-100 md:text-5xl">Guild Governance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">
              Review pending members, manage permissions, and control public-facing guild information.
            </p>
          </div>
        </header>

        <WarRegistrationManager />
        <TeamManagementPanel />
        <DiscordNoticeSender />
        <UserManagementPanel />
        <GuildSettingsForm />
      </main>
    </AuthGuard>
  );
}
