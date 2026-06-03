import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

const RESERVE_TEAM_NAME = "Reserve";

type TeamListRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  team_type: "atk" | "def" | "other" | null;
  is_locked: boolean;
  team_members?: Array<{ id: string; user_id?: string | null; registration_id?: string | null }>;
};

const normalizeTeamName = (name: string) => name.trim().toLowerCase();

function collapseDuplicateTeams(teams: TeamListRow[]) {
  const byName = new Map<string, TeamListRow>();

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

    const mergedMembers = new Map<string, { id: string; user_id?: string | null; registration_id?: string | null }>();
    for (const member of [...(existing.team_members ?? []), ...(team.team_members ?? [])]) {
      const key = member.registration_id ?? member.user_id ?? member.id;
      mergedMembers.set(key, member);
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

async function getTeamById(teamId: string) {
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

async function getRegistrationsByIds(dayId: string, registrationIds: string[]) {
  if (registrationIds.length === 0) {
    return [] as Array<{ id: string; user_id: string | null }>;
  }

  const { data, error } = await supabaseAdmin
    .from("guild_war_registrations")
    .select("id, user_id, day_id")
    .eq("day_id", dayId)
    .in("id", registrationIds);

  if (error) {
    throw new HttpError(500, error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
  }));
}

export const teamsService = {
  async getTeam(teamId: string, dayId?: string) {
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("id, name, description, color, team_type, is_locked")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError) {
      throw new HttpError(500, teamError.message);
    }

    if (!teamData) {
      throw new HttpError(404, "Team not found");
    }

    let members: Array<{ id: string; user_id?: string | null; registration_id?: string | null }> = [];

    if (dayId) {
      const { data: memberRows, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, user_id, registration_id")
        .eq("team_id", teamId)
        .eq("day_id", dayId);

      if (memberError) {
        throw new HttpError(500, memberError.message);
      }

      members = (memberRows ?? []).map((row) => ({ id: row.id, user_id: row.user_id, registration_id: row.registration_id }));
    }

    return {
      ...teamData,
      team_type: (teamData.team_type ?? "other") as "atk" | "def" | "other",
      team_members: members,
    };
  },

  async listTeams(dayId?: string) {
    await ensureReserveTeam();

    const { data, error } = await supabaseAdmin
      .from("teams")
      .select("id, name, description, color, team_type, is_locked")
      .order("created_at", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    const teams = ((data ?? []) as Omit<TeamListRow, "team_members">[]).map((team) => ({
      ...team,
      team_type: (team.team_type ?? "other") as "atk" | "def" | "other",
      team_members: [] as Array<{ id: string; user_id?: string | null; registration_id?: string | null }>,
    }));

    if (!dayId || teams.length === 0) {
      return collapseDuplicateTeams(teams);
    }

    const teamIds = teams.map((team) => team.id);
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from("team_members")
      .select("id, team_id, user_id, registration_id")
      .eq("day_id", dayId)
      .in("team_id", teamIds);

    if (membersError) {
      throw new HttpError(500, membersError.message);
    }

    const membersByTeam = new Map<string, Array<{ id: string; user_id?: string | null; registration_id?: string | null }>>();

    for (const member of membersData ?? []) {
      const list = membersByTeam.get(member.team_id) ?? [];
      list.push({ id: member.id, user_id: member.user_id, registration_id: member.registration_id });
      membersByTeam.set(member.team_id, list);
    }

    const mappedTeams = teams.map((team) => ({
      ...team,
      team_members: membersByTeam.get(team.id) ?? [],
    }));

    return collapseDuplicateTeams(mappedTeams);
  },

  async createTeam(
    name: string,
    description?: string,
    color?: string,
    teamType?: "atk" | "def" | "other",
  ) {
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

    const { data: created, error: createError } = await supabaseAdmin
      .from("teams")
      .insert({
        name,
        description: description ?? null,
        color: color ?? "#94a3b8",
        team_type: teamType ?? "other",
      })
      .select("id, name, description, color, team_type, is_locked")
      .single();

    if (createError) {
      throw new HttpError(400, createError.message);
    }

    return created;
  },

  async updateTeam(teamId: string, payload: { name?: string; description?: string | null; color?: string | null; teamType?: "atk" | "def" | "other" }) {
    const currentTeam = await getTeamById(teamId);

    if (currentTeam.name === RESERVE_TEAM_NAME && payload.name !== undefined && payload.name !== RESERVE_TEAM_NAME) {
      throw new HttpError(400, "Reserve team name cannot be changed");
    }

    const update: Record<string, string | null> = {};

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

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("teams")
      .update(update)
      .eq("id", teamId)
      .select("id, name, description, color, team_type, is_locked")
      .maybeSingle();

    if (updateError) {
      throw new HttpError(400, updateError.message);
    }

    if (!updated) {
      throw new HttpError(404, "Team not found");
    }

    return updated;
  },

  async deleteTeam(teamId: string) {
    const currentTeam = await getTeamById(teamId);

    if (currentTeam.name === RESERVE_TEAM_NAME) {
      throw new HttpError(400, "Reserve team cannot be deleted");
    }

    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id, name, description, color, team_type, is_locked")
      .maybeSingle();

    if (deleteError) {
      throw new HttpError(500, deleteError.message);
    }

    if (!deleted) {
      throw new HttpError(404, "Team not found");
    }

    return deleted;
  },

  async updateMembers(teamId: string, dayId: string, registrationIds: string[]) {
    const { error: deleteError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("day_id", dayId);

    if (deleteError) {
      throw new HttpError(500, deleteError.message);
    }

    const dedupedRegistrationIds = [...new Set(registrationIds)];

    if (dedupedRegistrationIds.length === 0) {
      return [];
    }

    const registrations = await getRegistrationsByIds(dayId, dedupedRegistrationIds);
    const registrationById = new Map(registrations.map((registration) => [registration.id, registration]));

    const payload = dedupedRegistrationIds
      .map((registrationId) => registrationById.get(registrationId))
      .filter((registration): registration is { id: string; user_id: string | null } => Boolean(registration))
      .map((registration) => ({
        team_id: teamId,
        day_id: dayId,
        registration_id: registration.id,
        user_id: registration.user_id,
      }));

    if (payload.length === 0) {
      return [];
    }

    const { error: clearError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("day_id", dayId)
      .in("registration_id", dedupedRegistrationIds);

    if (clearError) {
      throw new HttpError(500, clearError.message);
    }

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .insert(payload)
      .select("id, team_id, user_id, day_id, registration_id");

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },
};
