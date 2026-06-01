import { CornerWidget } from "../../components/public/corner-widget";
import { FloatingNavbar } from "../../components/public/floating-navbar";
import { ForceRegisterForm } from "@/components/public/force-register-form";
import { apiFetch } from "@/lib/api";
import type { GuildInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function ForceRegisterPage() {
  const guildInfo = await getGuildInfo();

  return (
    <>
      <FloatingNavbar guildInfo={guildInfo} menuLinksToHome />
      <CornerWidget showLanguage={false} hideOnScroll />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <header id="top" className="rounded-md border border-amber-100/10 bg-[#040a13]/90 px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">Emergency Registration</p>
          <h1 className="mt-3 text-4xl font-black text-slate-100 md:text-5xl">Guild War Force Register</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">
            ใช้เมื่อเข้า Discord ไม่ได้หรือเชื่อมต่อมีปัญหา ระบบจะส่งชื่อเข้าหน้า Pool ตามวันที่เลือกทันที
          </p>
        </header>

        <ForceRegisterForm />
      </main>
    </>
  );
}
