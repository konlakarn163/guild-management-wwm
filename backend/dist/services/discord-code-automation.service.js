import { Client, Events, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { env } from "../config/env.js";
import { discordCodeDedupeService, extractCandidateCodes } from "./discord-code-dedupe.service.js";
let started = false;
let client = null;
let queue = Promise.resolve();
const processedMessageIds = new Set();
const seenNonTargetChannels = new Set();
const LIST_ALL_CODES_COMMANDS = ["#ขอโค๊ดทั้งหมด", "#ขอโค้ดทั้งหมด"];
function rememberProcessedMessageId(messageId) {
    processedMessageIds.add(messageId);
    if (processedMessageIds.size <= 1000) {
        return;
    }
    const firstId = processedMessageIds.values().next().value;
    if (firstId) {
        processedMessageIds.delete(firstId);
    }
}
function canStartAutomation() {
    return (env.DISCORD_CODE_AUTOMATION_ENABLED === true &&
        Boolean(env.DISCORD_BOT_TOKEN) &&
        Boolean(env.DISCORD_CODE_CHANNEL_ID) &&
        Boolean(env.DISCORD_CODE_REPORT_WEBHOOK_URL));
}
export async function startDiscordCodeAutomation() {
    if (started) {
        return;
    }
    started = true;
    if (!canStartAutomation()) {
        console.log("[DiscordCodeAutomation] Skipped", {
            automationEnabled: env.DISCORD_CODE_AUTOMATION_ENABLED,
            hasBotToken: Boolean(env.DISCORD_BOT_TOKEN),
            hasChannelId: Boolean(env.DISCORD_CODE_CHANNEL_ID),
            hasReportWebhook: Boolean(env.DISCORD_CODE_REPORT_WEBHOOK_URL),
        });
        return;
    }
    const watchedChannelId = env.DISCORD_CODE_CHANNEL_ID;
    client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    client.once(Events.ClientReady, (readyClient) => {
        console.log(`[DiscordCodeAutomation] Connected as ${readyClient.user.tag}`);
        console.log(`[DiscordCodeAutomation] Watching channel ${watchedChannelId}`);
        void readyClient.channels
            .fetch(watchedChannelId)
            .then((channel) => {
            if (!channel) {
                console.log("[DiscordCodeAutomation] Target channel not found via API");
                return;
            }
            const hasPerms = "permissionsFor" in channel
                ? channel
                    .permissionsFor(readyClient.user.id)
                    ?.has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.SendMessages,
                ]) ?? false
                : false;
            const parentId = "parentId" in channel ? channel.parentId : null;
            console.log(`[DiscordCodeAutomation] Channel resolved id=${channel.id} type=${channel.type} parent=${parentId ?? "none"} permissionsOk=${hasPerms}`);
        })
            .catch((error) => {
            console.warn("[DiscordCodeAutomation] Failed to fetch target channel", {
                message: error instanceof Error ? error.message : String(error),
            });
        });
    });
    client.on(Events.Raw, (packet) => {
        if (packet.t !== "MESSAGE_CREATE") {
            return;
        }
        const channelId = packet.d.channel_id ?? "unknown";
        if (channelId === watchedChannelId) {
            console.log("[DiscordCodeAutomation] Raw MESSAGE_CREATE for watched channel");
            return;
        }
        console.log(`[DiscordCodeAutomation] Raw MESSAGE_CREATE for other channel ${channelId}`);
    });
    client.on(Events.MessageCreate, (message) => {
        const isThreadInTargetChannel = message.channel.isThread() && message.channel.parentId === watchedChannelId;
        const isTargetChannel = message.channelId === watchedChannelId || isThreadInTargetChannel;
        if (!isTargetChannel) {
            if (!seenNonTargetChannels.has(message.channelId)) {
                seenNonTargetChannels.add(message.channelId);
                console.log(`[DiscordCodeAutomation] Seen message in non-target channel ${message.channelId}`);
            }
            return;
        }
        console.log(`[DiscordCodeAutomation] MessageCreate ${message.id} channel=${message.channelId} contentLength=${message.content.length}`);
        if (message.author.bot || message.webhookId) {
            console.log(`[DiscordCodeAutomation] Ignored ${message.id} (bot/webhook message)`);
            return;
        }
        if (processedMessageIds.has(message.id)) {
            return;
        }
        const normalizedContent = message.content.trim().toLowerCase();
        if (LIST_ALL_CODES_COMMANDS.includes(normalizedContent)) {
            queue = queue
                .then(async () => {
                rememberProcessedMessageId(message.id);
                console.log(`[DiscordCodeAutomation] Processing list-all command ${message.id}`);
                const result = await discordCodeDedupeService.reportAllUniqueCodes();
                console.log(`[DiscordCodeAutomation] List-all complete ${message.id} unique=${result.uniqueCodes.length} scanned=${result.scannedMessageCount}`);
            })
                .catch((error) => {
                console.warn("[DiscordCodeAutomation] Failed list-all command", message.id, {
                    message: error instanceof Error ? error.message : String(error),
                });
            });
            return;
        }
        const candidateCodes = extractCandidateCodes(message.content);
        if (candidateCodes.length === 0) {
            console.log(`[DiscordCodeAutomation] Ignored ${message.id} (no candidate codes)`);
            return;
        }
        queue = queue
            .then(async () => {
            rememberProcessedMessageId(message.id);
            console.log(`[DiscordCodeAutomation] Processing ${message.id} candidates=${candidateCodes.length}`);
            const result = await discordCodeDedupeService.dedupeAndReport({
                messageId: message.id,
            });
            console.log(`[DiscordCodeAutomation] Processed ${message.id} unique=${result.uniqueCodes.length} duplicate=${result.duplicateCodes.length}`);
        })
            .catch((error) => {
            console.warn("[DiscordCodeAutomation] Failed to process message", message.id, {
                message: error instanceof Error ? error.message : String(error),
            });
        });
    });
    try {
        await client.login(env.DISCORD_BOT_TOKEN);
    }
    catch (error) {
        console.warn("[DiscordCodeAutomation] Login failed", error);
    }
}
