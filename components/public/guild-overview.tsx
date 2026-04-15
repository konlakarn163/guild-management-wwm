import type { GuildInfo } from "@/lib/types";
import { Pill } from "@/components/ui/pill";
import { AuthActions } from "@/components/public/auth-actions";

interface GuildOverviewProps {
  guildInfo: GuildInfo;
}

export function GuildOverview({ guildInfo }: GuildOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-950 p-8 text-slate-50 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-5 rounded-[24px] border border-white/10" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Where Winds Meet</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-none md:text-6xl">{guildInfo.name}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{guildInfo.description}</p>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-3">
          <Pill variant="warm">Guild Code: {guildInfo.code}</Pill>
          <Pill variant="success">Active Members: {guildInfo.memberCount}</Pill>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-900/10 bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Public Access</p>
        <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Join The Alliance</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          สมัครกิลด์ผ่าน Discord แล้วกรอกข้อมูลตัวละครเพื่อรอการอนุมัติจากแอดมิน
        </p>
        <div className="mt-6 space-y-3">
          <AuthActions />
          <button className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
            Open Discord Invite
          </button>
        </div>
      </div>
    </div>
  );
}