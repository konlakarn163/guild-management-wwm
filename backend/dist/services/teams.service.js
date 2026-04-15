import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
export const teamsService = {
    async listTeams(weekId) {
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
    async createTeam(weekId, name) {
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
    async updateMembers(teamId, userIds) {
        const { error: deleteError } = await supabaseAdmin.from("team_members").delete().eq("team_id", teamId);
        if (deleteError) {
            throw new HttpError(500, deleteError.message);
        }
        if (userIds.length === 0) {
            return [];
        }
        const payload = userIds.map((userId) => ({ team_id: teamId, user_id: userId }));
        const { data, error } = await supabaseAdmin
            .from("team_members")
            .insert(payload)
            .select("id, team_id, user_id");
        if (error) {
            throw new HttpError(400, error.message);
        }
        return data;
    },
};
