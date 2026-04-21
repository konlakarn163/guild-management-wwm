import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
import { deriveWeekIdFromDayId, isWeekendDayId } from "../utils/week-id.js";
async function assertActiveUser(userId) {
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
async function clearTeamMembershipForDay(userId, dayId, weekId) {
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
    return data;
}
async function upsertRegistration(userId, dayId, weekId) {
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
    async listRegistrations(weekId) {
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
    async listRegistrationsByDay(dayId) {
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
        return data;
    },
    async createRegistrationWindow(dayId, createdBy) {
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
    async setWindowOpenState(windowId, shouldOpen) {
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
    async deleteRegistrationWindow(windowId) {
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
        return data;
    },
    async cleanupRegistrationsBeforeCurrentMonth() {
        const now = new Date();
        const cutoffYear = now.getUTCFullYear();
        const cutoffMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
        const cutoffDate = `${cutoffYear}-${cutoffMonth}-01`;
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
        return {
            cutoffDate,
            deletedCount: (deletedByDayId ?? 0) + (deletedByWeekId ?? 0),
        };
    },
    async register(userId) {
        await assertActiveUser(userId);
        const openWindow = await getRequiredOpenWindow();
        await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);
        return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
    },
    async registerToReserve(userId) {
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
    async adminRegister(userId) {
        await assertActiveUser(userId);
        const openWindow = await getRequiredOpenWindow();
        await clearTeamMembershipForDay(userId, openWindow.day_id, openWindow.week_id);
        return upsertRegistration(userId, openWindow.day_id, openWindow.week_id);
    },
    async cancel(userId) {
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
