import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
const RESERVE_TEAM_NAME = "Reserve";
const normalizeTeamName = (name) => name.trim().toLowerCase();
function collapseDuplicateTeams(teams) {
    const byName = new Map();
    for (const team of teams) {
        const key = normalizeTeamName(team.name);
        const existing = byName.get(key);
        if (!existing) {
            byName.set(key, {
                ...team,
                team_members: [...(team.team_members ?? [])],
            });
            continue;
        }
        const mergedMembers = new Map();
        for (const member of [...(existing.team_members ?? []), ...(team.team_members ?? [])]) {
            mergedMembers.set(member.user_id, member);
        }
        byName.set(key, {
            ...existing,
            description: existing.description ?? team.description,
            color: existing.color ?? team.color,
            team_type: existing.team_type ?? team.team_type,
            team_members: [...mergedMembers.values()],
        });
    }
    return [...byName.values()];
}
async function ensureReserveTeam() {
    const { data: existing, error: existingError } = await supabaseAdmin
        .from("teams")
        .select("id")
        .eq("name", RESERVE_TEAM_NAME)
        .order("created_at", { ascending: true });
    if (existingError) {
        throw new HttpError(500, existingError.message);
    }
    if ((existing ?? []).length > 0) {
        return;
    }
    const { error: createError } = await supabaseAdmin.from("teams").insert({
        name: RESERVE_TEAM_NAME,
        description: "Reserve team",
        color: "#f59e0b",
        team_type: "other",
    });
    if (createError) {
        throw new HttpError(400, createError.message);
    }
}
async function getTeamById(teamId) {
    const { data, error } = await supabaseAdmin
        .from("teams")
        .select("id, name")
        .eq("id", teamId)
        .maybeSingle();
    if (error) {
        throw new HttpError(500, error.message);
    }
    if (!data) {
        throw new HttpError(404, "Team not found");
    }
    return data;
}
export const teamsService = {
    async getTeam(teamId) {
        const { data, error } = await supabaseAdmin
            .from("teams")
            .select("id, name, description, color, team_type, is_locked, team_members(id, user_id)")
            .eq("id", teamId)
            .maybeSingle();
        if (error) {
            throw new HttpError(500, error.message);
        }
        if (!data) {
            throw new HttpError(404, "Team not found");
        }
        return {
            ...data,
            team_type: (data.team_type ?? "other"),
        };
    },
    async listTeams() {
        await ensureReserveTeam();
        const { data, error } = await supabaseAdmin
            .from("teams")
            .select("id, name, description, color, team_type, is_locked, team_members(id, user_id)")
            .order("created_at", { ascending: true });
        if (error) {
            throw new HttpError(500, error.message);
        }
        // Normalize team_type: default to 'other' if null
        const normalized = (data ?? []).map((team) => ({
            ...team,
            team_type: (team.team_type ?? "other"),
        }));
        return collapseDuplicateTeams(normalized);
    },
    async createTeam(name, description, color, teamType) {
        if (normalizeTeamName(name) === normalizeTeamName(RESERVE_TEAM_NAME)) {
            const reserveTeams = await this.listTeams();
            const reserveTeam = reserveTeams.find((team) => normalizeTeamName(team.name) === normalizeTeamName(RESERVE_TEAM_NAME));
            if (reserveTeam) {
                return reserveTeam;
            }
        }
        const { data: existing, error: existingError } = await supabaseAdmin
            .from("teams")
            .select("id, name, description, color, team_type, is_locked")
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
            .insert({
            name,
            description: description ?? null,
            color: color ?? "#94a3b8",
            team_type: teamType ?? "other",
        })
            .select("id, name, description, color, team_type, is_locked")
            .single();
        if (error) {
            throw new HttpError(400, error.message);
        }
        return data;
    },
    async updateTeam(teamId, payload) {
        const currentTeam = await getTeamById(teamId);
        if (currentTeam.name === RESERVE_TEAM_NAME && payload.name !== undefined && payload.name !== RESERVE_TEAM_NAME) {
            throw new HttpError(400, "Reserve team name cannot be changed");
        }
        const update = {};
        if (payload.name !== undefined) {
            update.name = payload.name;
        }
        if (payload.description !== undefined) {
            update.description = payload.description;
        }
        if (payload.color !== undefined) {
            update.color = payload.color;
        }
        if (payload.teamType !== undefined) {
            update.team_type = payload.teamType;
        }
        const { data, error } = await supabaseAdmin
            .from("teams")
            .update(update)
            .eq("id", teamId)
            .select("id, name, description, color, team_type, is_locked")
            .maybeSingle();
        if (error) {
            throw new HttpError(400, error.message);
        }
        if (!data) {
            throw new HttpError(404, "Team not found");
        }
        return data;
    },
    async deleteTeam(teamId) {
        const currentTeam = await getTeamById(teamId);
        if (currentTeam.name === RESERVE_TEAM_NAME) {
            throw new HttpError(400, "Reserve team cannot be deleted");
        }
        const { data, error } = await supabaseAdmin
            .from("teams")
            .delete()
            .eq("id", teamId)
            .select("id, name, description, color, team_type, is_locked")
            .maybeSingle();
        if (error) {
            throw new HttpError(500, error.message);
        }
        if (!data) {
            throw new HttpError(404, "Team not found");
        }
        return data;
    },
    async updateMembers(teamId, userIds) {
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
