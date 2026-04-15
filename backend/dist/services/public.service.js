import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
const DEFAULT_BUILD_OPTIONS = [
    "Duo-Chain",
    "Fan-Tang",
    "Fan-Um",
    "HEAL",
    "Nameless",
    "Strategic",
    "TangDao",
    "TANK",
    "Um-Chain",
];
export const publicService = {
    async getGuildInfo() {
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
            .select("label, sort_order")
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
            build_options: optionsData?.length ? optionsData.map((item) => item.label) : DEFAULT_BUILD_OPTIONS,
        };
    },
};
