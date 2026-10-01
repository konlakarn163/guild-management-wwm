import type { Request, Response } from "express";
import { z } from "zod";
import { getSocketServer } from "../lib/socket.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import {
  commandAnnouncementService,
  type CommandAnnouncementState,
} from "../services/command-announcement.service.js";

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

function broadcastState(state: CommandAnnouncementState): void {
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
  getState: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await commandAnnouncementService.getState());
  }),

  updateMessages: asyncHandler(async (req: Request, res: Response) => {
    const parsed = messagesSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid command announcement messages");
    const state = await commandAnnouncementService.updateMessages(parsed.data);
    broadcastState(state);
    res.json(state);
  }),

  start: asyncHandler(async (req: Request, res: Response) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid start delay");
    const state = await commandAnnouncementService.start(parsed.data.delaySeconds, req.authUser!.id);
    broadcastState(state);
    res.json(state);
  }),

  reset: asyncHandler(async (req: Request, res: Response) => {
    const state = await commandAnnouncementService.reset(req.authUser!.id);
    broadcastState(state);
    res.json(state);
  }),
};