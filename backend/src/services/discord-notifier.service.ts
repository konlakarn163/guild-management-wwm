import { env } from "../config/env.js";

interface GuildWarWindowOpenedPayload {
  dayId: string;
  weekId: string;
  openedByUserId: string;
}

function formatDayLabel(dayId: string): string {
  const [yearText, monthText, dayText] = dayId.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return dayId;
  }

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function postDiscordMessage(content: string): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) {
    return;
  }

  const mentionRoleId = env.DISCORD_NOTIFY_ROLE_ID;

  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        flags: 4,
        allowed_mentions: mentionRoleId
          ? { parse: [], roles: [mentionRoleId] }
          : { parse: [] },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        "[DiscordNotifier] Failed to send message",
        response.status,
        body,
      );
    }
  } catch (error) {
    console.warn("[DiscordNotifier] Failed to send message", error);
  }
}

export const discordNotifierService = {
  async notifyGuildWarWindowOpened(
    payload: GuildWarWindowOpenedPayload,
  ): Promise<void> {
    const mentionPrefix = env.DISCORD_NOTIFY_ROLE_ID
      ? `<@&${env.DISCORD_NOTIFY_ROLE_ID}> `
      : "@Meaw Meaw :cat: ";

    const content = [
      `${mentionPrefix}Guild War registration is now 🟢 OPEN (เปิดลงทะเบียนกิลด์วอร์) ${payload.dayId} was opened now!!`,
      `ไปลงทะเบียนกันเถอะ!! Meow~ <https://meawmeaw-wwm.konlakarn.space/>`,
    ].join("\n");

    await postDiscordMessage(content);
  },

  async sendCustomNotice(
    message: string,
    mentionRole: boolean,
  ): Promise<void> {
    const mentionPrefix = mentionRole && env.DISCORD_NOTIFY_ROLE_ID
      ? `<@&${env.DISCORD_NOTIFY_ROLE_ID}> `
      : "";

    const content = mentionPrefix + message;
    await postDiscordMessage(content);
  },
};
