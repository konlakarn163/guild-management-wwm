import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

async function assertActiveUser(userId: string) {
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
}

async function clearWeekTeamMembership(userId: string, weekId: string) {
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("week_id", weekId);

  if (teamsError) {
    throw new HttpError(500, teamsError.message);
  }

  const teamIds = [...new Set((teams ?? []).map((team) => team.id))];
  if (teamIds.length === 0) {
    return;
  }

  const { error: clearMembershipError } = await supabaseAdmin
    .from("team_members")
    .delete()
    .in("team_id", teamIds)
    .eq("user_id", userId);

  if (clearMembershipError) {
    throw new HttpError(500, clearMembershipError.message);
  }
}

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
    await assertActiveUser(userId);
    await clearWeekTeamMembership(userId, weekId);

    const { data: existingRegistration, error: existingRegistrationError } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, week_id, user_id")
      .eq("user_id", userId)
      .eq("week_id", weekId)
      .maybeSingle();

    if (existingRegistrationError) {
      throw new HttpError(500, existingRegistrationError.message);
    }

    if (existingRegistration) {
      return existingRegistration;
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

  async registerToReserve(userId: string, weekId: string) {
    await assertActiveUser(userId);

    const { data: existingRegistration, error: existingRegistrationError } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, week_id, user_id")
      .eq("user_id", userId)
      .eq("week_id", weekId)
      .maybeSingle();

    if (existingRegistrationError) {
      throw new HttpError(500, existingRegistrationError.message);
    }

    const registration = existingRegistration ?? (await (async () => {
      const { data, error } = await supabaseAdmin
        .from("guild_war_registrations")
        .insert({ user_id: userId, week_id: weekId })
        .select("id, week_id, user_id")
        .single();

      if (error) {
        throw new HttpError(400, error.message);
      }

      return data;
    })());

    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .eq("week_id", weekId)
      .order("created_at", { ascending: true });

    if (teamsError) {
      throw new HttpError(500, teamsError.message);
    }

    let reserveTeamId = teams.find((team) => team.name === "Reserve")?.id;

    if (!reserveTeamId) {
      const { data: createdTeam, error: createTeamError } = await supabaseAdmin
        .from("teams")
        .insert({ week_id: weekId, name: "Reserve" })
        .select("id")
        .single();

      if (createTeamError) {
        throw new HttpError(400, createTeamError.message);
      }

      reserveTeamId = createdTeam.id;
    }

    await clearWeekTeamMembership(userId, weekId);

    const { error: reserveMembershipError } = await supabaseAdmin
      .from("team_members")
      .insert({ team_id: reserveTeamId, user_id: userId });

    if (reserveMembershipError) {
      throw new HttpError(400, reserveMembershipError.message);
    }

    return registration;
  },

  async cancel(userId: string, weekId: string) {
    await clearWeekTeamMembership(userId, weekId);

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