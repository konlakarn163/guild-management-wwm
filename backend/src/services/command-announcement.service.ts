import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
import { discordNotifierService } from "./discord-notifier.service.js";

const ANNOUNCEMENT_DURATION_SECONDS = 1800;
const TABLE = "command_announcements";

export interface CommandAnnouncementMessages {
  [secondsRemaining: string]: { msg: string };
}

export interface CommandAnnouncementState {
  id: number;
  messages: CommandAnnouncementMessages;
  phase: "idle" | "waiting" | "running" | "completed";
  delay_seconds: number;
  scheduled_start_at: string | null;
  started_at: string | null;
  sent_seconds: number[];
  updated_at: string;
}

let schedulerStarted = false;
let pollInProgress = false;
let lastFailureLoggedAt = 0;

async function loadState(): Promise<CommandAnnouncementState> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(`Failed to load command announcement state: ${error.message}`);
  }

  return data as unknown as CommandAnnouncementState;
}

async function pollAnnouncements(): Promise<void> {
  if (pollInProgress) return;
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
        if (error) throw new Error(`Failed to begin command countdown: ${error.message}`);
        state.phase = "running";
        state.started_at = state.scheduled_start_at;
      }
    }

    if (state.phase !== "running" || !state.started_at) return;

    const elapsedSeconds = Math.floor((now - Date.parse(state.started_at)) / 1000);
    const dueTimes = Object.keys(state.messages)
      .map(Number)
      .filter((secondsRemaining) =>
        elapsedSeconds >= ANNOUNCEMENT_DURATION_SECONDS - secondsRemaining &&
        !state.sent_seconds.includes(secondsRemaining),
      )
      .sort((left, right) => right - left);

    try {
      for (const secondsRemaining of dueTimes) {
        const message = state.messages[String(secondsRemaining)]?.msg;
        if (!message) continue;

        await discordNotifierService.sendCustomNotice(message, false);
        console.log(`[CommandAnnouncements] Sent announcement at ${secondsRemaining}s remaining`);
        const sentSeconds = [...state.sent_seconds, secondsRemaining];
        const { error } = await supabaseAdmin
          .from(TABLE)
          .update({ sent_seconds: sentSeconds, updated_at: new Date().toISOString() })
          .eq("id", 1);
        if (error) throw new Error(`Failed to persist sent announcement: ${error.message}`);
        state.sent_seconds = sentSeconds;
      }
    } finally {
      if (elapsedSeconds >= ANNOUNCEMENT_DURATION_SECONDS) {
        const { error } = await supabaseAdmin
          .from(TABLE)
          .update({
            phase: "idle",
            delay_seconds: 0,
            scheduled_start_at: null,
            started_at: null,
            sent_seconds: [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1)
          .eq("phase", "running")
          .eq("started_at", state.started_at);
        if (error) throw new Error(`Failed to reset command countdown: ${error.message}`);
      }
    }
  } finally {
    pollInProgress = false;
  }
}

export const commandAnnouncementService = {
  async getState(): Promise<CommandAnnouncementState> {
    return loadState();
  },

  async updateMessages(messages: CommandAnnouncementMessages): Promise<CommandAnnouncementState> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to save command messages: ${error.message}`);
    return data as unknown as CommandAnnouncementState;
  },

  async start(delaySeconds: number, userId: string): Promise<CommandAnnouncementState> {
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

    if (error) throw new Error(`Failed to start command countdown: ${error.message}`);
    if (!data) throw new HttpError(409, "A command announcement countdown is already active");
    return data as unknown as CommandAnnouncementState;
  },

  async reset(userId: string): Promise<CommandAnnouncementState> {
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

    if (error) throw new Error(`Failed to reset command countdown: ${error.message}`);
    return data as unknown as CommandAnnouncementState;
  },

  startScheduler(): void {
    if (schedulerStarted) return;
    schedulerStarted = true;

    if (!env.DISCORD_WEBHOOK_URL) {
      console.log("[CommandAnnouncements] Scheduler skipped: Discord webhook URL is missing");
      return;
    }

    console.log("[CommandAnnouncements] Scheduler started using Discord notice webhook");
    setInterval(() => {
      void pollAnnouncements().catch((error: unknown) => {
        const now = Date.now();
        if (now - lastFailureLoggedAt >= 30_000) {
          lastFailureLoggedAt = now;
          console.error("[CommandAnnouncements] Scheduler poll failed", error);
        }
      });
    }, 1000);
  },
};