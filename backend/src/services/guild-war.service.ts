import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

export const guildWarService = {
  async listRegistrations(weekId: string) {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, week_id, user_id, users(username, discord_id, character_name, build)")
      .eq("week_id", weekId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async register(userId: string, weekId: string) {
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("status")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw new HttpError(500, userError.message);
    }

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (user.status !== "ACTIVE") {
      throw new HttpError(403, "Only ACTIVE users can register");
    }

    const { data, error } = await supabaseAdmin
      .from("guild_war_registrations")
      .insert({ user_id: userId, week_id: weekId })
      .select("id, week_id, user_id")
      .single();

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },

  async cancel(userId: string, weekId: string) {
    const { error } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete()
      .eq("user_id", userId)
      .eq("week_id", weekId);

    if (error) {
      throw new HttpError(500, error.message);
    }
  },
};