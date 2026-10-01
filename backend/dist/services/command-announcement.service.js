import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
const ANNOUNCEMENT_DURATION_SECONDS = 1800;
const TABLE = "command_announcements";
let schedulerStarted = false;
let pollInProgress = false;
let lastFailureLoggedAt = 0;
async function loadState() {
    const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select("*")
        .eq("id", 1)
        .single();
    if (error) {
        throw new Error(`Failed to load command announcement state: ${error.message}`);
    }
    return data;
}
async function sendToDiscord(content) {
    if (!env.DISCORD_COMMANDS_REPORT_WEBHOOK_URL) {
        throw new Error("Discord command announcement credentials are not configured");
    }
    const response = await fetch(env.DISCORD_COMMANDS_REPORT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
    if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}: ${await response.text()}`);
    }
}
async function pollAnnouncements() {
    if (pollInProgress)
        return;
    pollInProgress = true;
    try {
        const state = await loadState();
        const now = Date.now();
        if (state.phase === "waiting" && state.scheduled_start_at) {
            const scheduledStart = Date.parse(state.scheduled_start_at);
            if (now >= scheduledStart) {
                const { error } = await supabaseAdmin
                    .from(TABLE)
                    .update({ phase: "running", started_at: state.scheduled_start_at, updated_at: new Date().toISOString() })
                    .eq("id", 1);
                if (error)
                    throw new Error(`Failed to begin command countdown: ${error.message}`);
                state.phase = "running";
                state.started_at = state.scheduled_start_at;
            }
        }
        if (state.phase !== "running" || !state.started_at)
            return;
        const elapsedSeconds = Math.floor((now - Date.parse(state.started_at)) / 1000);
        const announcementMessages = env.NODE_ENV === "development"
            ? { ...state.messages, "1800": { msg: "เริ่มแล้ว" } }
            : state.messages;
        const dueTimes = Object.keys(announcementMessages)
            .map(Number)
            .filter((secondsRemaining) => elapsedSeconds >= ANNOUNCEMENT_DURATION_SECONDS - secondsRemaining &&
            !state.sent_seconds.includes(secondsRemaining))
            .sort((left, right) => right - left);
        for (const secondsRemaining of dueTimes) {
            const message = announcementMessages[String(secondsRemaining)]?.msg;
            if (!message)
                continue;
            await sendToDiscord(message);
            console.log(`[CommandAnnouncements] Sent announcement at ${secondsRemaining}s remaining`);
            const sentSeconds = [...state.sent_seconds, secondsRemaining];
            const { error } = await supabaseAdmin
                .from(TABLE)
                .update({ sent_seconds: sentSeconds, updated_at: new Date().toISOString() })
                .eq("id", 1);
            if (error)
                throw new Error(`Failed to persist sent announcement: ${error.message}`);
            state.sent_seconds = sentSeconds;
        }
        if (elapsedSeconds >= ANNOUNCEMENT_DURATION_SECONDS) {
            const { error } = await supabaseAdmin
                .from(TABLE)
                .update({ phase: "completed", updated_at: new Date().toISOString() })
                .eq("id", 1);
            if (error)
                throw new Error(`Failed to complete command countdown: ${error.message}`);
        }
    }
    finally {
        pollInProgress = false;
    }
}
export const commandAnnouncementService = {
    async getState() {
        return loadState();
    },
    async updateMessages(messages) {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({ messages, updated_at: new Date().toISOString() })
            .eq("id", 1)
            .select("*")
            .single();
        if (error)
            throw new Error(`Failed to save command messages: ${error.message}`);
        return data;
    },
    async start(delaySeconds, userId) {
        const startedAt = delaySeconds === 0 ? new Date().toISOString() : null;
        const scheduledStartAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({
            phase: delaySeconds === 0 ? "running" : "waiting",
            delay_seconds: delaySeconds,
            scheduled_start_at: scheduledStartAt,
            started_at: startedAt,
            sent_seconds: [],
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
            .eq("id", 1)
            .in("phase", ["idle", "completed"])
            .select("*")
            .maybeSingle();
        if (error)
            throw new Error(`Failed to start command countdown: ${error.message}`);
        if (!data)
            throw new HttpError(409, "A command announcement countdown is already active");
        return data;
    },
    async reset(userId) {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({
            phase: "idle",
            delay_seconds: 0,
            scheduled_start_at: null,
            started_at: null,
            sent_seconds: [],
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
            .eq("id", 1)
            .select("*")
            .single();
        if (error)
            throw new Error(`Failed to reset command countdown: ${error.message}`);
        return data;
    },
    startScheduler() {
        if (schedulerStarted)
            return;
        schedulerStarted = true;
        if (!env.DISCORD_COMMANDS_REPORT_WEBHOOK_URL) {
            console.log("[CommandAnnouncements] Scheduler skipped: command webhook URL is missing");
            return;
        }
        console.log("[CommandAnnouncements] Scheduler started using command webhook");
        setInterval(() => {
            void pollAnnouncements().catch((error) => {
                const now = Date.now();
                if (now - lastFailureLoggedAt >= 30_000) {
                    lastFailureLoggedAt = now;
                    console.error("[CommandAnnouncements] Scheduler poll failed", error);
                }
            });
        }, 1000);
    },
};
