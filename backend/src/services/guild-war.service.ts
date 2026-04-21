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
  week_id: string;
  day_id: string | null;
  registration_window_id: string | null;
  name: string;
  is_locked: boolean;
  team_members?: Array<{
    id: string;
    user_id: string;
  }>;
}

async function listTeamsForWindow(window: RegistrationWindow) {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id, week_id, day_id, registration_window_id, name, is_locked, team_members(id, user_id)")
    .or(`registration_window_id.eq.${window.id},day_id.eq.${window.day_id}`)
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, error.message);
  }

  return (data ?? []) as TeamRow[];
}

async function deleteTeamsForWindow(window: RegistrationWindow) {
  const teams = await listTeamsForWindow(window);
  const teamIds = [...new Set(teams.map((team) => team.id))];

  if (teamIds.length === 0) {
    return { deletedTeamCount: 0 };
  }

  const { error: deleteTeamsError, count } = await supabaseAdmin
    .from("teams")
    .delete({ count: "exact" })
    .in("id", teamIds);

  if (deleteTeamsError) {
    throw new HttpError(500, deleteTeamsError.message);
  }

  return { deletedTeamCount: count ?? teamIds.length };
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

async function clearTeamMembershipForDay(userId: string, dayId: string, weekId: string) {
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id")
    .or(`day_id.eq.${dayId},and(day_id.is.null,week_id.eq.${weekId})`);

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

async function upsertRegistration(userId: string, dayId: string, weekId: string) {
  const { data: existingRegistration, error: existingRegistrationError } = await supabaseAdmin
    .from("guild_war_registrations")
    .select("id, day_id, week_id, user_id")
    .eq("user_id", userId)
    .eq("day_id", dayId)
    .maybeSingle();

  if (existingRegistrationError) {
    throw new HttpError(500, existingRegistrationError.message);
  }

  if (existingRegistration) {
    return existingRegistration;
  }

  const { data, error } = await supabaseAdmin
    .from("guild_war_registrations")
    .insert({ user_id: userId, day_id: dayId, week_id: weekId })
    .select("id, day_id, week_id, user_id")
    .single();

  if (error) {
    throw new HttpError(400, error.message);
  }

  return data;
}

export const guildWarService = {
  async listRegistrations(weekId: string) {
    const { data, error } = await supabaseAdmin
      .from("guild_war_registrations")
      .select("id, day_id, week_id, user_id, users(username, discord_id, character_name, build)")
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
      .select("id, day_id, week_id, user_id, users(username, discord_id, character_name, build)")
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
      listTeamsForWindow(window as RegistrationWindow),
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
      const { error: closeAllError } = await supabaseAdmin
        .from("guild_war_registration_windows")
        .update({ is_open: false })
        .eq("is_open", true)
        .neq("id", windowId);

      if (closeAllError) {
        throw new HttpError(500, closeAllError.message);
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
    await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async registerToReserve(userId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindow();
    const registration = await upsertRegistration(userId, openWindow.day_id, openWindow.week_id);

    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .eq("week_id", openWindow.week_id)
      .eq("day_id", openWindow.day_id)
      .order("created_at", { ascending: true });

    if (teamsError) {
      throw new HttpError(500, teamsError.message);
    }

    let reserveTeamId = teams.find((team) => team.name === "Reserve")?.id;

    if (!reserveTeamId) {
      const { data: createdTeam, error: createTeamError } = await supabaseAdmin
        .from("teams")
        .insert({ week_id: openWindow.week_id, day_id: openWindow.day_id, name: "Reserve", registration_window_id: openWindow.id })
        .select("id")
        .single();

      if (createTeamError) {
        throw new HttpError(400, createTeamError.message);
      }

      reserveTeamId = createdTeam.id;
    }

    await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);

    const { error: reserveMembershipError } = await supabaseAdmin
      .from("team_members")
      .insert({ team_id: reserveTeamId, user_id: userId });

    if (reserveMembershipError) {
      throw new HttpError(400, reserveMembershipError.message);
    }

    return registration;
  },

  async adminRegister(userId: string) {
    await assertActiveUser(userId);

    const openWindow = await getRequiredOpenWindow();
    await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);

    return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
  },

  async cancel(userId: string) {
    const openWindow = await getRequiredOpenWindow();
    await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);

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
