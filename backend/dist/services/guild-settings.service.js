import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
const ALLOWED_BUILD_COLORS = ["#d65409", "#1253e0", "#167312"];
const DEFAULT_BUILD_COLOR = "#167312";
const normalizeBuildColor = (value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ALLOWED_BUILD_COLORS.find((color) => color === normalized) ?? DEFAULT_BUILD_COLOR;
};
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
export const guildSettingsService = {
    async getOne() {
        const { data, error } = await supabaseAdmin
            .from("guild_settings")
            .select("id, name, code, description, discord_invite, updated_at")
            .limit(1)
            .maybeSingle();
        if (error && error.code !== "PGRST116") {
            throw new HttpError(500, error.message);
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
            ...data,
            build_options: optionsData?.length
                ? optionsData.map((item) => ({
                    label: item.label,
                    color: normalizeBuildColor(item.color),
                }))
                : DEFAULT_BUILD_OPTIONS,
        };
    },
    async upsert(payload) {
        const { data: existing, error: findError } = await supabaseAdmin
            .from("guild_settings")
            .select("id")
            .limit(1)
            .maybeSingle();
        if (findError && findError.code !== "PGRST116") {
            throw new HttpError(500, findError.message);
        }
        const sanitizedBuildOptions = (payload.build_options ?? DEFAULT_BUILD_OPTIONS)
            .map((item) => ({
            label: item.label.trim(),
            color: normalizeBuildColor(item.color),
        }))
            .filter((item) => item.label.length > 0);
        const seen = new Set();
        const dedupedBuildOptions = sanitizedBuildOptions.filter((item) => {
            const key = item.label.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        const updatePayload = {
            name: payload.name,
            code: payload.code,
            description: payload.description,
            discord_invite: payload.discord_invite,
        };
        const updateQuery = existing
            ? supabaseAdmin.from("guild_settings").update(updatePayload).eq("id", existing.id)
            : supabaseAdmin.from("guild_settings").insert(updatePayload);
        const { data, error } = await updateQuery
            .select("id, name, code, description, discord_invite, updated_at")
            .single();
        if (error) {
            throw new HttpError(400, error.message);
        }
        const nextBuildOptions = dedupedBuildOptions.length ? dedupedBuildOptions : DEFAULT_BUILD_OPTIONS;
        const { error: deleteOptionsError } = await supabaseAdmin
            .from("build_options")
            .delete()
            .not("id", "is", null);
        if (deleteOptionsError) {
            throw new HttpError(500, deleteOptionsError.message);
        }
        const optionsPayload = nextBuildOptions.map((item, index) => ({
            label: item.label,
            color: item.color,
            sort_order: index,
        }));
        const { error: insertOptionsError } = await supabaseAdmin
            .from("build_options")
            .insert(optionsPayload);
        if (insertOptionsError) {
            throw new HttpError(500, insertOptionsError.message);
        }
        return {
            ...data,
            build_options: nextBuildOptions,
        };
    },
};
