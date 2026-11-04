import { z } from "zod";
import { getSocketServer } from "../lib/socket.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { commandAnnouncementService, } from "../services/command-announcement.service.js";
const messageSchema = z.object({ msg: z.string().trim().min(1).max(2000) }).strict();
const messageTimeSchema = z.string().regex(/^[1-9]\d{0,3}$/).refine((seconds) => Number(seconds) <= 1800);
const messagesSchema = z.record(messageTimeSchema, messageSchema);
const startSchema = z.object({
    delaySeconds: z.number().int().refine((value) => [0, 30, 60, 120, 180, 240].includes(value)),
});
function broadcastState(state) {
    const { phase, delay_seconds, scheduled_start_at, started_at, sent_seconds, updated_at } = state;
    getSocketServer().emit("commandAnnouncements:stateUpdated", {
        phase,
        delay_seconds,
        scheduled_start_at,
        started_at,
        sent_seconds,
        updated_at,
    });
}
export const commandAnnouncementController = {
    getState: asyncHandler(async (_req, res) => {
        res.json(await commandAnnouncementService.getState());
    }),
    updateMessages: asyncHandler(async (req, res) => {
        const parsed = messagesSchema.safeParse(req.body);
        if (!parsed.success)
            throw new HttpError(400, "Invalid command announcement messages");
        const state = await commandAnnouncementService.updateMessages(parsed.data);
        broadcastState(state);
        res.json(state);
    }),
    start: asyncHandler(async (req, res) => {
        const parsed = startSchema.safeParse(req.body);
        if (!parsed.success)
            throw new HttpError(400, "Invalid start delay");
        const state = await commandAnnouncementService.start(parsed.data.delaySeconds, req.authUser.id);
        broadcastState(state);
        res.json(state);
    }),
    reset: asyncHandler(async (req, res) => {
        const state = await commandAnnouncementService.reset(req.authUser.id);
        broadcastState(state);
        res.json(state);
    }),
};
