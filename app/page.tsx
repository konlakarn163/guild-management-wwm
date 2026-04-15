import { FloatingNavbar } from "@/components/public/floating-navbar";
import { HeroBanner } from "@/components/public/hero-banner";
import { HomeContent } from "@/components/public/home-content";
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

export default async function Home() {
  const guildInfo = await getGuildInfo();

  return (
    <>
      <FloatingNavbar guildInfo={guildInfo} />
      <HeroBanner guildInfo={guildInfo} />
      <HomeContent guildInfo={guildInfo} />
    </>
  );
}
