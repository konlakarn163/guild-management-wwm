import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

export const teamsService = {
  async listTeams(weekId: string) {
    const { data, error } = await supabaseAdmin
      .from("teams")
      .select("id, week_id, name, is_locked, team_members(id, user_id)")
      .eq("week_id", weekId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async createTeam(weekId: string, name: string) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("teams")
      .select("id, week_id, name, is_locked")
      .eq("week_id", weekId)
      .eq("name", name)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new HttpError(500, existingError.message);
    }

    if (existing) {
      return existing;
    }

    const { data, error } = await supabaseAdmin
      .from("teams")
      .insert({ week_id: weekId, name })
      .select("id, week_id, name, is_locked")
      .single();

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },

  async updateMembers(teamId: string, userIds: string[]) {
    const { error: deleteError } = await supabaseAdmin.from("team_members").delete().eq("team_id", teamId);
    if (deleteError) {
      throw new HttpError(500, deleteError.message);
    }

    const dedupedUserIds = [...new Set(userIds)];

    if (dedupedUserIds.length === 0) {
      return [];
    }

    const payload = dedupedUserIds.map((userId) => ({ team_id: teamId, user_id: userId }));
    const { data, error } = await supabaseAdmin
      .from("team_members")
      .upsert(payload, {
        onConflict: "team_id,user_id",
        ignoreDuplicates: true,
      })
      .select("id, team_id, user_id");

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },
};