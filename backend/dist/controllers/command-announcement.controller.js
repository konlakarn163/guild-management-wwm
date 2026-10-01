import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { commandAnnouncementService } from "../services/command-announcement.service.js";
const messageSchema = z.object({ msg: z.string().trim().min(1).max(2000) }).strict();
const messagesSchema = z.object({
    "1560": messageSchema,
    "1500": messageSchema,
    "1260": messageSchema,
    "1200": messageSchema,
    "960": messageSchema,
    "900": messageSchema,
    "660": messageSchema,
    "600": messageSchema,
    "360": messageSchema,
    "300": messageSchema,
}).strict();
const startSchema = z.object({
    delaySeconds: z.number().int().refine((value) => [0, 30, 60, 120, 180, 240].includes(value)),
});
export const commandAnnouncementController = {
    getState: asyncHandler(async (_req, res) => {
        res.json(await commandAnnouncementService.getState());
    }),
    updateMessages: asyncHandler(async (req, res) => {
        const parsed = messagesSchema.safeParse(req.body);
        if (!parsed.success)
            throw new HttpError(400, "Invalid command announcement messages");
        res.json(await commandAnnouncementService.updateMessages(parsed.data));
    }),
    start: asyncHandler(async (req, res) => {
        const parsed = startSchema.safeParse(req.body);
        if (!parsed.success)
            throw new HttpError(400, "Invalid start delay");
        res.json(await commandAnnouncementService.start(parsed.data.delaySeconds, req.authUser.id));
    }),
    reset: asyncHandler(async (req, res) => {
        res.json(await commandAnnouncementService.reset(req.authUser.id));
    }),
};
