import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
const DISCORD_API_BASE = "https://discord.com/api/v10";
const CODE_PATTERN = /[A-Za-z0-9]{8,20}/g;
function requireDiscordConfig() {
    if (!env.DISCORD_BOT_TOKEN) {
        throw new HttpError(500, "DISCORD_BOT_TOKEN is not configured");
    }
    if (!env.DISCORD_CODE_CHANNEL_ID) {
        throw new HttpError(500, "DISCORD_CODE_CHANNEL_ID is not configured");
    }
}
function normalizeCode(code) {
    return code.trim().toLowerCase();
}
export function extractCandidateCodes(text) {
    const matches = text.match(CODE_PATTERN) ?? [];
    return matches
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
}
function buildReportMessage(result) {
    const lines = [];
    lines.push("ตรวจโค้ดจากข้อความล่าสุดเรียบร้อยแล้ว");
    lines.push(`ผู้ส่ง: ${result.targetAuthor}`);
    lines.push("");
    lines.push(`โค้ดซ้ำ (${result.duplicateCodes.length})`);
    if (result.duplicateCodes.length === 0) {
        lines.push("- ไม่มี");
    }
    else {
        for (const code of result.duplicateCodes) {
            lines.push(`- ${code}`);
        }
    }
    lines.push("");
    lines.push(`โค้ดไม่ซ้ำ (${result.uniqueCodes.length})`);
    if (result.uniqueCodes.length === 0) {
        lines.push("- ไม่มี");
    }
    else {
        for (const code of result.uniqueCodes) {
            lines.push(`- ${code}`);
        }
    }
    return lines.join("\n");
}
function buildUniqueAllReportMessage(result) {
    const lines = [];
    lines.push("สรุปโค้ดทั้งหมด (ไม่ซ้ำ)");
    lines.push(`อ่านข้อความย้อนหลัง: ${result.scannedMessageCount} ข้อความ`);
    lines.push(`โค้ดไม่ซ้ำทั้งหมด: ${result.uniqueCodes.length}`);
    lines.push("");
    if (result.uniqueCodes.length === 0) {
        lines.push("- ไม่มีโค้ด");
    }
    else {
        for (const code of result.uniqueCodes) {
            lines.push(`- ${code}`);
        }
    }
    return lines.join("\n");
}
function chunkText(input, maxLength = 1900) {
    if (input.length <= maxLength) {
        return [input];
    }
    const chunks = [];
    const lines = input.split("\n");
    let current = "";
    for (const line of lines) {
        const candidate = current.length === 0 ? line : `${current}\n${line}`;
        if (candidate.length <= maxLength) {
            current = candidate;
            continue;
        }
        if (current.length > 0) {
            chunks.push(current);
        }
        if (line.length <= maxLength) {
            current = line;
            continue;
        }
        let cursor = 0;
        while (cursor < line.length) {
            chunks.push(line.slice(cursor, cursor + maxLength));
            cursor += maxLength;
        }
        current = "";
    }
    if (current.length > 0) {
        chunks.push(current);
    }
    return chunks;
}
async function fetchDiscordJson(path) {
    requireDiscordConfig();
    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
        headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new HttpError(502, `Discord API error (${response.status}): ${body}`);
    }
    return (await response.json());
}
async function fetchMessageById(messageId) {
    return fetchDiscordJson(`/channels/${env.DISCORD_CODE_CHANNEL_ID}/messages/${messageId}`);
}
async function fetchRecentMessages(limit) {
    return fetchDiscordJson(`/channels/${env.DISCORD_CODE_CHANNEL_ID}/messages?limit=${limit}`);
}
async function fetchHistoryBeforeMessage(messageId, maxMessages) {
    const history = [];
    let before = messageId;
    while (history.length < maxMessages) {
        const remaining = maxMessages - history.length;
        const batchSize = Math.min(100, remaining);
        const batch = await fetchDiscordJson(`/channels/${env.DISCORD_CODE_CHANNEL_ID}/messages?limit=${batchSize}&before=${before}`);
        if (batch.length === 0) {
            break;
        }
        history.push(...batch);
        before = batch[batch.length - 1].id;
    }
    return history;
}
async function fetchAllChannelMessages(maxMessages) {
    const messages = [];
    let before = null;
    while (messages.length < maxMessages) {
        const remaining = maxMessages - messages.length;
        const batchSize = Math.min(100, remaining);
        const query = before
            ? `/channels/${env.DISCORD_CODE_CHANNEL_ID}/messages?limit=${batchSize}&before=${before}`
            : `/channels/${env.DISCORD_CODE_CHANNEL_ID}/messages?limit=${batchSize}`;
        const batch = await fetchDiscordJson(query);
        if (batch.length === 0) {
            break;
        }
        messages.push(...batch);
        before = batch[batch.length - 1].id;
    }
    return messages;
}
async function postViaWebhook(content) {
    if (!env.DISCORD_CODE_REPORT_WEBHOOK_URL) {
        return;
    }
    const response = await fetch(env.DISCORD_CODE_REPORT_WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content,
            allowed_mentions: { parse: [] },
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new HttpError(502, `Discord webhook error (${response.status}): ${body}`);
    }
}
export const discordCodeDedupeService = {
    async dedupeAndReport(options) {
        requireDiscordConfig();
        const maxHistoryMessages = Math.min(Math.max(options.maxHistoryMessages ?? 1000, 1), 5000);
        let targetMessage;
        if (options.messageId) {
            targetMessage = await fetchMessageById(options.messageId);
        }
        else {
            const recentMessages = await fetchRecentMessages(50);
            const firstUserMessageWithCodes = recentMessages.find((message) => !message.author.bot &&
                extractCandidateCodes(message.content).length > 0);
            if (!firstUserMessageWithCodes) {
                throw new HttpError(404, "No user message with code tokens found in recent messages");
            }
            targetMessage = firstUserMessageWithCodes;
        }
        const sourceCodes = extractCandidateCodes(targetMessage.content);
        if (sourceCodes.length === 0) {
            throw new HttpError(400, "Target message does not contain any code tokens");
        }
        const historyMessages = await fetchHistoryBeforeMessage(targetMessage.id, maxHistoryMessages);
        const historyCodeSet = new Set();
        for (const message of historyMessages) {
            const tokens = extractCandidateCodes(message.content);
            for (const token of tokens) {
                historyCodeSet.add(normalizeCode(token));
            }
        }
        const uniqueCodes = [];
        const duplicateCodes = [];
        const seenInMessage = new Set();
        for (const code of sourceCodes) {
            const normalized = normalizeCode(code);
            const duplicateInMessage = seenInMessage.has(normalized);
            const duplicateInHistory = historyCodeSet.has(normalized);
            if (duplicateInMessage || duplicateInHistory) {
                duplicateCodes.push(code);
            }
            else {
                uniqueCodes.push(code);
            }
            seenInMessage.add(normalized);
        }
        const result = {
            targetMessageId: targetMessage.id,
            targetAuthor: targetMessage.author.username,
            uniqueCodes,
            duplicateCodes,
            historyMessageCount: historyMessages.length,
        };
        const report = buildReportMessage(result);
        const chunks = chunkText(report);
        for (const chunk of chunks) {
            await postViaWebhook(chunk);
        }
        return result;
    },
    async reportAllUniqueCodes(options) {
        requireDiscordConfig();
        const maxHistoryMessages = Math.min(Math.max(options?.maxHistoryMessages ?? 20000, 1), 100000);
        const messages = await fetchAllChannelMessages(maxHistoryMessages);
        const uniqueCodeMap = new Map();
        // Reverse order to preserve earliest-seen casing for each unique code.
        for (const message of [...messages].reverse()) {
            const tokens = extractCandidateCodes(message.content);
            for (const token of tokens) {
                const normalized = normalizeCode(token);
                if (!uniqueCodeMap.has(normalized)) {
                    uniqueCodeMap.set(normalized, token);
                }
            }
        }
        const result = {
            uniqueCodes: Array.from(uniqueCodeMap.values()),
            scannedMessageCount: messages.length,
        };
        const report = buildUniqueAllReportMessage(result);
        const chunks = chunkText(report);
        for (const chunk of chunks) {
            await postViaWebhook(chunk);
        }
        return result;
    },
};
