import { AuthGuard } from "@/components/auth/auth-guard";
import { GuildSettingsForm } from "@/components/admin/guild-settings-form";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
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

export default async function AdminPage() {
  const guildInfo = await getGuildInfo();

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <FloatingNavbar guildInfo={guildInfo} menuLinksToHome />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header className="rounded-md border border-amber-100/10 bg-[#040a13]/90 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">Admin Control</p>
          <h1 className="mt-3 text-4xl font-black text-slate-100 md:text-5xl">Guild Governance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">
            Review pending members, manage permissions, and control public-facing guild information.
          </p>
        </header>

        <UserManagementPanel />
        <GuildSettingsForm />
      </main>
    </AuthGuard>
  );
}