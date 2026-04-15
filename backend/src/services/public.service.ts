import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

const ALLOWED_BUILD_COLORS = ["#d65409", "#1253e0", "#167312"] as const;
const DEFAULT_BUILD_COLOR = "#167312";

const normalizeBuildColor = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ALLOWED_BUILD_COLORS.find((color) => color === normalized) ?? DEFAULT_BUILD_COLOR;
};

export interface GuildPublicInfo {
  name: string;
  code: string;
  description: string;
  memberCount: number;
  build_options: Array<{ label: string; color: string }>;
}

const DEFAULT_BUILD_OPTIONS = [
  { label: "HEAL", color: "#167312" },
  { label: "DPS", color: "#1253e0" },
  { label: "TANK", color: "#d65409" },
  { label: "Duo-Chain", color: "#167312" },
  { label: "Fan-Tang", color: "#1253e0" },
  { label: "Fan-Um", color: "#167312" },
  { label: "Nameless", color: "#1253e0" },
  { label: "Strategic", color: "#d65409" },
  { label: "TangDao", color: "#1253e0" },
  { label: "Um-Chain", color: "#167312" },
];

export const publicService = {
  async getGuildInfo(): Promise<GuildPublicInfo> {
    const { data, error } = await supabaseAdmin
      .from("guild_settings")
      .select("name, code, description")
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new HttpError(500, error.message);
    }

    const { count, error: countError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE");

    if (countError) {
      throw new HttpError(500, countError.message);
    }

    const { data: optionsData, error: optionsError } = await supabaseAdmin
      .from("build_options")
      .select("label, color, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (optionsError) {
      throw new HttpError(500, optionsError.message);
    }

    return {
      name: "MeawMeaw",
      code: data?.code ?? "10068118",
      description: data?.description ?? "Guild management portal",
      memberCount: count ?? 0,
      build_options: optionsData?.length
        ? optionsData.map((item) => ({
            label: item.label,
            color: normalizeBuildColor(item.color),
          }))
        : DEFAULT_BUILD_OPTIONS,
    };
  },
};