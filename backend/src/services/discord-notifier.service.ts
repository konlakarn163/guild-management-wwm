import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

interface GuildWarWindowOpenedPayload {
  dayId: string;
  weekId: string;
  openedByUserId: string;
}

type DiscordMessageType = "notice" | "command";

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

async function postDiscordMessage(
  content: string,
  type: DiscordMessageType,
  webhookUrl = type === "command"
    ? env.DISCORD_COMMANDS_REPORT_WEBHOOK_URL
    : env.DISCORD_WEBHOOK_URL,
): Promise<void> {
  const useWorker = Boolean(env.DISCORD_WORKER_URL);

  if (!useWorker && !webhookUrl) {
    throw new HttpError(
      500,
      `Discord ${type} webhook URL is not configured in backend environment`,
    );
  }

  const mentionRoleId = env.DISCORD_NOTIFY_ROLE_ID;
  const discordPayload = {
    content,
    flags: 4,
    allowed_mentions: mentionRoleId
      ? { parse: [], roles: [mentionRoleId] }
      : { parse: [] },
  };

  try {
    const response = await fetch(
      useWorker ? env.DISCORD_WORKER_URL! : webhookUrl!,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DiscordBot (GuildManagementSystem, 1.0.0)",
        },
        body: JSON.stringify(
          useWorker ? { ...discordPayload, type } : discordPayload,
        ),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        "[DiscordNotifier] Failed to send message",
        response.status,
        body,
      );

      let cleanErrorMsg = body;
      if (body.trim().startsWith("<") || body.includes("<!doctype html>")) {
        if (response.status === 429) {
          cleanErrorMsg =
            "Discord/Cloudflare is rate limiting server IP (429 Too Many Requests). Please try again in 1-2 minutes.";
        } else {
          cleanErrorMsg = `Discord returned HTML error page (${response.status})`;
        }
      } else {
        try {
          const parsed = JSON.parse(body);
          if (parsed.message) {
            cleanErrorMsg = parsed.message;
          }
        } catch {
          // ignore json parse error
        }
      }

      throw new HttpError(
        response.status === 429 ? 429 : 500,
        `Discord API error (${response.status}): ${cleanErrorMsg}`,
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.warn("[DiscordNotifier] Failed to send message", error);
    throw new HttpError(
      500,
      error instanceof Error
        ? error.message
        : "Failed to post message to Discord",
    );
  }
}

async function postDiscordImage(
  imageBase64: string,
  filename: string,
  content: string,
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const workerUrl = env.DISCORD_WORKER_URL;

  if (!webhookUrl && !workerUrl) {
    throw new HttpError(
      500,
      "Discord notice webhook URL is not configured in backend environment",
    );
  }

  const discordPayload = {
    content,
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename }],
  };

  let response: globalThis.Response;
  try {
    if (webhookUrl) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify(discordPayload));
      form.append(
        "files[0]",
        new Blob([Buffer.from(imageBase64, "base64")], { type: "image/png" }),
        filename,
      );
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "User-Agent": "DiscordBot (GuildManagementSystem, 1.0.0)" },
        body: form,
      });
    } else {
      response = await fetch(workerUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DiscordBot (GuildManagementSystem, 1.0.0)",
        },
        body: JSON.stringify({
          ...discordPayload,
          type: "notice",
          file: { filename, contentType: "image/png", data: imageBase64 },
        }),
      });
    }
  } catch (error) {
    console.warn("[DiscordNotifier] Failed to send image", error);
    throw new HttpError(
      500,
      error instanceof Error ? error.message : "Failed to post image to Discord",
    );
  }

  if (!response.ok) {
    const body = await response.text();
    console.warn("[DiscordNotifier] Failed to send image", response.status, body);
    let cleanErrorMsg = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) {
        cleanErrorMsg = parsed.message;
      }
    } catch {
      if (body.trim().startsWith("<")) {
        cleanErrorMsg = `Discord returned HTML error page (${response.status})`;
      }
    }
    throw new HttpError(
      response.status === 429 ? 429 : 500,
      `Discord API error (${response.status}): ${cleanErrorMsg}`,
    );
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

    try {
      await postDiscordMessage(content, "notice");
    } catch (error) {
      console.warn(
        "[DiscordNotifier] notifyGuildWarWindowOpened failed silently:",
        error,
      );
    }
  },

  async sendCustomNotice(
    message: string,
    mentionRole: boolean,
  ): Promise<void> {
    const mentionPrefix = mentionRole && env.DISCORD_NOTIFY_ROLE_ID
      ? `<@&${env.DISCORD_NOTIFY_ROLE_ID}> `
      : "";

    const content = mentionPrefix + message;
    await postDiscordMessage(content, "notice");
  },

  async sendNoticeImage(
    imageBase64: string,
    filename: string,
    message?: string,
  ): Promise<void> {
    await postDiscordImage(imageBase64, filename, message ?? "");
  },

  async sendCommandAnnouncement(message: string): Promise<void> {
    await postDiscordMessage(message, "command");
  },
};
