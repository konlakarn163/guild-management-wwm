import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
const ensureProfileRow = async (userId) => {
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUserError || !authUserData.user) {
        throw new HttpError(401, "Unauthorized");
    }
    const authUser = authUserData.user;
    const username = authUser.user_metadata?.full_name ||
        authUser.user_metadata?.preferred_username ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "Member";
    const { error: insertError } = await supabaseAdmin.from("users").insert({
        id: userId,
        username,
        discord_id: authUser.user_metadata?.provider_id ?? null,
        avatar: authUser.user_metadata?.avatar_url ?? null,
    });
    if (insertError && insertError.code !== "23505") {
        throw new HttpError(500, insertError.message);
    }
};
export const profileService = {
    async getMyProfile(userId) {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("id, username, discord_id, role, status, character_name, build")
            .eq("id", userId)
            .maybeSingle();
        if (error && error.code !== "PGRST116") {
            throw new HttpError(500, error.message);
        }
        if (!data) {
            await ensureProfileRow(userId);
            const { data: retryData, error: retryError } = await supabaseAdmin
                .from("users")
                .select("id, username, discord_id, role, status, character_name, build")
                .eq("id", userId)
                .maybeSingle();
            if (retryError || !retryData) {
                throw new HttpError(500, retryError?.message ?? "Failed to load profile");
            }
            return retryData;
        }
        return data;
    },
    async updateMyProfile(userId, payload) {
        await ensureProfileRow(userId);
        const { data, error } = await supabaseAdmin
            .from("users")
            .update({
            character_name: payload.character_name,
            build: payload.build,
        })
            .eq("id", userId)
            .select("id, username, role, status, character_name, build")
            .maybeSingle();
        if (error || !data) {
            throw new HttpError(500, error?.message ?? "Failed to update profile");
        }
        return data;
    },
};
