import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
import { deriveWeekIdFromDayId, isWeekendDayId } from "../utils/week-id.js";

interface RegistrationWindow {
  id: string;
  day_id: string;
  week_id: string;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  team_type: "atk" | "def" | "other" | null;
  is_locked: boolean;
  team_members?: Array<{
    id: string;
    user_id?: string | null;
    registration_id?: string | null;
  }>;
}

interface OpenWindowRegistrations {
  windows: RegistrationWindow[];
  registrationsByDay: Record<string, unknown[]>;
}

const MAX_OPEN_WINDOWS = 2;

async function listTeamsForDay(dayId: string) {
  const [teamsResult, teamMembersResult] = await Promise.all([
    supabaseAdmin
      .from("teams")
      .select("id, name, description, color, team_type, is_locked")
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("team_members")
      .select("id, team_id, user_id, registration_id")
      .eq("day_id", dayId),
  ]);

  const { data: teamsData, error: teamsError } = teamsResult;
  const { data: teamMembersData, error: teamMembersError } = teamMembersResult;

  if (teamsError) {
    throw new HttpError(500, teamsError.message);
  }

  if (teamMembersError) {
    throw new HttpError(500, teamMembersError.message);
  }

  const membersByTeam = new Map<string, Array<{ id: string; user_id?: string | null; registration_id?: string | null }>>();
  for (const member of teamMembersData ?? []) {
    const existing = membersByTeam.get(member.team_id) ?? [];
    existing.push({ id: member.id, user_id: member.user_id, registration_id: member.registration_id });
    membersByTeam.set(member.team_id, existing);
  }

  return ((teamsData ?? []) as Omit<TeamRow, "team_members">[]).map((team) => ({
    ...team,
    team_members: membersByTeam.get(team.id) ?? [],
  }));
}

async function deleteTeamsForWindow(window: RegistrationWindow) {
  const { count, error } = await supabaseAdmin
    .from("team_members")
    .delete({ count: "exact" })
    .eq("day_id", window.day_id);

  if (error) {
    throw new HttpError(500, error.message);
  }

  return { deletedTeamCount: count ?? 0 };
}

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

async function clearTeamMembership(userId: string) {
  const { error: clearMembershipError } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("user_id", userId);

  if (clearMembershipError) {
    throw new HttpError(500, clearMembershipError.message);
  }
}

async function clearTeamMembershipByDay(dayId: string, userId: string) {
  const { error } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("day_id", dayId)
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(500, error.message);
  }
}

async function getRequiredOpenWindow() {
  const { data, error } = await supabaseAdmin
    .from("guild_war_registration_windows")
    .select("id, day_id, week_id, is_open, created_at, updated_at")
    .eq("is_open", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) {
    throw new HttpError(403, "Registration is currently closed");
  }

  return data as RegistrationWindow;
}

async function getRequiredOpenWindowByDay(dayId: string) {
  const { data, error } = await supabaseAdmin
    .from("guild_war_registration_windows")
    .select("id, day_id, week_id, is_open, created_at, updated_at")
    .eq("is_open", true)
    .eq("day_id", dayId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) {
    throw new HttpError(403, "Selected registration day is currently closed");
  }

  return data as RegistrationWindow;
}

async function getUserProfileForRegistration(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("character_name, build, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) {
    throw new HttpError(404, "User not found");
  }

  return {
    character_name: data.character_name ?? data.username ?? `User-${userId.slice(0, 8)}`,
    build: data.build ?? "-",
  };
}

async function upsertRegistration(userId: string, dayId: string, weekId: string) {
  const { data: existingRegistration, error: existingRegistrationError } = await supabaseAdmin
    .from("guild_war_registrations")
    .select("id, day_id, week_id, user_id, character_name, build, is_force")
    .eq("user_id", userId)
    .eq("day_id", dayId)
    .maybeSingle();

  if (existingRegistrationError) {
    throw new HttpError(500, existingRegistrationError.message);
  }

  if (existingRegistration) {
    return existingRegistration;
  }

  const profile = await getUserProfileForRegistration(userId);

  const { data, error } = await supabaseAdmin
    .from("guild_war_registrations")
    .insert({
      user_id: userId,
      day_id: dayId,
      week_id: weekId,
      character_name: profile.character_name,
      build: profile.build,
      is_force: false,
    })
    .select("id, day_id, week_id, user_id, character_name, build, is_force")
    .single();

  if (error) {
    throw new HttpError(400, error.message);
  }

  return data;
}

async function upsertForceRegistration(dayId: string, weekId: string, characterName: string, build: string) {
  const normalizedCharacterName = characterName.trim();
  const normalizedBuild = build.trim();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("guild_war_registrations")
    .select("id, day_id, week_id, user_id, character_name, build, is_force")
    .eq("day_id", dayId)
    .eq("is_force", true)
    .ilike("character_name", normalizedCharacterName)
    .maybeSingle();

  if (existingError) {
    throw new HttpError(500, existingError.message);
  }

  if (existing) {
    if (existing.build !== normalizedBuild) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("guild_war_registrations")
        .update({ build: normalizedBuild })
        .eq("id", existing.id)
        .select("id, day_id, week_id, user_id, character_name, build, is_force")
        .single();

      if (updateError) {
        throw new HttpError(500, updateError.message);
      }

      return updated;
    }

    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("guild_war_registrations")
    .insert({
      user_id: null,
      day_id: dayId,
      week_id: weekId,
      character_name: normalizedCharacterName,
      build: normalizedBuild,
      is_force: true,
    })
    .select("id, day_id, week_id, user_id, character_name, build, is_force")
    .single();

  if (error) {
    throw new HttpError(400, error.message);
  }

  return data;
}

async function ensureReserveTeamId() {
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (teamsError) {
    throw new HttpError(500, teamsError.message);
  }

  let reserveTeamId = (teams as Array<{ id: string; name: string }>).find((team) => team.name === "Reserve")?.id;

  if (!reserveTeamId) {
    const { data: createdTeam, error: createTeamError } = await supabaseAdmin
      .from("teams")
      .insert({
        name: "Reserve",
        description: "Reserve team",
        team_type: "other",
      })
      .select("id")
      .single();

    if (createTeamError) {
      throw new HttpError(400, createTeamError.message);
    }

    reserveTeamId = createdTeam.id;
  }

  return reserveTeamId;
}

export const guildWarService = {
  async listRegistrations(weekId: string) {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, day_id, week_id, user_id, character_name, build, is_force, users(username, discord_id, character_name, build)")
      .eq("week_id", weekId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async listRegistrationsByDay(dayId: string) {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, day_id, week_id, user_id, character_name, build, is_force, users(username, discord_id, character_name, build)")
      .eq("day_id", dayId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async listRegistrationWindows() {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .order("day_id", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data ?? [];
  },

  async listOpenRegistrationWindows() {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .eq("is_open", true)
      .order("day_id", { ascending: true });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return (data ?? []) as RegistrationWindow[];
  },

  async listOpenRegistrationData(): Promise<OpenWindowRegistrations> {
    const windows = await this.listOpenRegistrationWindows();
    const registrationsByDay: Record<string, unknown[]> = {};

    await Promise.all(
      windows.map(async (window) => {
        registrationsByDay[window.day_id] = await this.listRegistrationsByDay(window.day_id);
      }),
    );

    return {
      windows,
      registrationsByDay,
    };
  },

  async getRegistrationWindowDetails(windowId: string) {
    const { data: window, error: windowError } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .eq("id", windowId)
      .maybeSingle();

    if (windowError) {
      throw new HttpError(500, windowError.message);
    }

    if (!window) {
      throw new HttpError(404, "Registration window not found");
    }

    const [registrations, teams] = await Promise.all([
      this.listRegistrationsByDay(window.day_id),
      listTeamsForDay(window.day_id),
    ]);

    return {
      window,
      registrations,
      teams,
    };
  },

  async getOpenRegistrationWindow() {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .eq("is_open", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data as RegistrationWindow | null;
  },

  async createRegistrationWindow(dayId: string, createdBy: string) {
    if (!isWeekendDayId(dayId)) {
      throw new HttpError(400, "dayId must be Saturday or Sunday");
    }

    const weekId = deriveWeekIdFromDayId(dayId);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .eq("day_id", dayId)
      .maybeSingle();

    if (existingError) {
      throw new HttpError(500, existingError.message);
    }

    if (existing) {
      return existing;
    }

    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .insert({ day_id: dayId, week_id: weekId, created_by: createdBy, is_open: false })
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .single();

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },

  async setWindowOpenState(windowId: string, shouldOpen: boolean) {
    if (shouldOpen) {
      const { count: openCount, error: openCountError } = await supabaseAdmin
        .from("guild_war_registration_windows")
        .select("id", { head: true, count: "exact" })
        .eq("is_open", true)
        .neq("id", windowId);

      if (openCountError) {
        throw new HttpError(500, openCountError.message);
      }

      if ((openCount ?? 0) >= MAX_OPEN_WINDOWS) {
        throw new HttpError(400, `Maximum ${MAX_OPEN_WINDOWS} registration windows can be open at the same time`);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .update({ is_open: shouldOpen })
      .eq("id", windowId)
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .maybeSingle();

    if (error) {
      throw new HttpError(400, error.message);
    }

    if (!data) {
      throw new HttpError(404, "Registration window not found");
    }

    return data;
  },

  async deleteRegistrationWindow(windowId: string) {
    const { data: existingWindow, error: existingWindowError } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .eq("id", windowId)
      .maybeSingle();

    if (existingWindowError) {
      throw new HttpError(500, existingWindowError.message);
    }

    if (!existingWindow) {
      throw new HttpError(404, "Registration window not found");
    }

    const { count: deletedRegistrationsCount, error: deleteRegistrationsError } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete({ count: "exact" })
      .eq("day_id", existingWindow.day_id);

    if (deleteRegistrationsError) {
      throw new HttpError(500, deleteRegistrationsError.message);
    }

    const { deletedTeamCount } = await deleteTeamsForWindow(existingWindow as RegistrationWindow);

    const { data, error } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .delete()
      .eq("id", windowId)
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .maybeSingle();

    if (error) {
      throw new HttpError(400, error.message);
    }

    if (!data) {
      throw new HttpError(404, "Registration window not found");
    }

    return {
      ...data,
      deletedRegistrationsCount: deletedRegistrationsCount ?? 0,
      deletedTeamCount,
    };
  },

  async cleanupRegistrationsBeforeCurrentMonth() {
    const now = new Date();
    const cutoffYear = now.getUTCFullYear();
    const cutoffMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
    const cutoffDate = `${cutoffYear}-${cutoffMonth}-01`;

    const { data: oldWindows, error: oldWindowsError } = await supabaseAdmin
      .from("guild_war_registration_windows")
      .select("id, day_id, week_id, is_open, created_at, updated_at")
      .lt("day_id", cutoffDate);

    if (oldWindowsError) {
      throw new HttpError(500, oldWindowsError.message);
    }

    const uniqueOldWindows = (oldWindows ?? []) as RegistrationWindow[];
    let deletedWindowCount = 0;
    let deletedTeamCount = 0;

    for (const window of uniqueOldWindows) {
      const result = await deleteTeamsForWindow(window);
      deletedTeamCount += result.deletedTeamCount;
    }

    const { count: deletedByDayId, error: deleteByDayIdError } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete({ count: "exact" })
      .lt("day_id", cutoffDate);

    if (deleteByDayIdError) {
      throw new HttpError(500, deleteByDayIdError.message);
    }

    const { count: deletedByWeekId, error: deleteByWeekIdError } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete({ count: "exact" })
      .is("day_id", null)
      .lt("week_id", cutoffDate);

    if (deleteByWeekIdError) {
      throw new HttpError(500, deleteByWeekIdError.message);
    }

    if (uniqueOldWindows.length > 0) {
      const windowIds = uniqueOldWindows.map((window) => window.id);
      const { count: deletedWindows, error: deleteWindowsError } = await supabaseAdmin
        .from("guild_war_registration_windows")
        .delete({ count: "exact" })
        .in("id", windowIds);

      if (deleteWindowsError) {
        throw new HttpError(500, deleteWindowsError.message);
      }

      deletedWindowCount = deletedWindows ?? uniqueOldWindows.length;
    }

    return {
      cutoffDate,
      deletedCount: (deletedByDayId ?? 0) + (deletedByWeekId ?? 0),
      deletedWindowCount,
      deletedTeamCount,
    };
  },

  async register(userId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindow();
    await clearTeamMembership(userId);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async registerByDay(userId: string, dayId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindowByDay(dayId);
    await clearTeamMembershipByDay(openWindow.day_id, userId);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async registerToReserve(userId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindow();
    const registration = await upsertRegistration(userId, openWindow.day_id, openWindow.week_id);

    const reserveTeamId = await ensureReserveTeamId();

    await clearTeamMembership(userId);

    const { error: reserveMembershipError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: reserveTeamId,
        user_id: userId,
        day_id: openWindow.day_id,
        registration_id: registration.id,
      });

    if (reserveMembershipError) {
      throw new HttpError(400, reserveMembershipError.message);
    }

    return registration;
  },

  async registerToReserveByDay(userId: string, dayId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindowByDay(dayId);
    const registration = await upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
    const reserveTeamId = await ensureReserveTeamId();

    await clearTeamMembershipByDay(openWindow.day_id, userId);

    const { error } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: reserveTeamId,
        user_id: userId,
        day_id: openWindow.day_id,
        registration_id: registration.id,
      });

    if (error) {
      throw new HttpError(400, error.message);
    }

    return registration;
  },

  async adminRegister(userId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindow();
    await clearTeamMembership(userId);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async adminRegisterByDay(userId: string, dayId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindowByDay(dayId);
    await clearTeamMembershipByDay(openWindow.day_id, userId);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async forceRegisterByDay(dayId: string, characterName: string, build: string) {
    const openWindow = await getRequiredOpenWindowByDay(dayId);
    return upsertForceRegistration(openWindow.day_id, openWindow.week_id, characterName, build);
  },

  async cancel(userId: string) {
    const openWindow = await getRequiredOpenWindow();
    await clearTeamMembership(userId);

    const { error } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete()
      .eq("user_id", userId)
      .eq("day_id", openWindow.day_id);

    if (error) {
      throw new HttpError(500, error.message);
    }
  },

  async cancelByDay(userId: string, dayId: string) {
    const openWindow = await getRequiredOpenWindowByDay(dayId);
    await clearTeamMembershipByDay(openWindow.day_id, userId);

    const { error } = await supabaseAdmin
      .from("guild_war_registrations")
      .delete()
      .eq("user_id", userId)
      .eq("day_id", openWindow.day_id);

    if (error) {
      throw new HttpError(500, error.message);
    }
  },
};
