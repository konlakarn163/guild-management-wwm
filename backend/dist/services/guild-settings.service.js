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
            .select("label, sort_order")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
        if (optionsError) {
            throw new HttpError(500, optionsError.message);
        }
        return {
            ...data,
            build_options: optionsData?.length ? optionsData.map((item) => item.label) : DEFAULT_BUILD_OPTIONS,
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
            .map((value) => value.trim())
            .filter(Boolean);
        const dedupedBuildOptions = [...new Set(sanitizedBuildOptions)];
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
        const optionsPayload = nextBuildOptions.map((label, index) => ({
            label,
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
