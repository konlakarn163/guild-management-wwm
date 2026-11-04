import { apiFetch } from "@/lib/api";
import type { GuildInfo } from "@/lib/types";

const FALLBACK_GUILD_INFO: GuildInfo = {
  name: "MeawMeaw",
  code: "10068118",
  description: "กิลด์ Where Winds Meet สายไทย มุ่งเน้น Guild War และการควบคุมพื้นที่",
  memberCount: 58,
};

export async function getGuildInfo(): Promise<GuildInfo> {
  try {
    return await apiFetch<GuildInfo>("/api/public/guild", {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return FALLBACK_GUILD_INFO;
  }
}
