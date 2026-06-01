import type { Request, Response } from "express";
import { z } from "zod";
import { getSocketServer } from "../lib/socket.js";
import { asyncHandler } from "../utils/async-handler.js";
import { publicService } from "../services/public.service.js";

const forceRegisterSchema = z.object({
  dayId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  characterName: z.string().min(1).max(64),
  build: z.string().min(1).max(128),
});

export const publicController = {
  getGuildInfo: asyncHandler(async (_req: Request, res: Response) => {
    const guildInfo = await publicService.getGuildInfo();
    res.json(guildInfo);
  }),

  listOpenRegistrationWindows: asyncHandler(async (_req: Request, res: Response) => {
    const windows = await publicService.listOpenRegistrationWindows();
    res.json({ windows });
  }),

  forceRegister: asyncHandler(async (req: Request, res: Response) => {
    const payload = forceRegisterSchema.parse(req.body);
    const registration = await publicService.forceRegister(payload.dayId, payload.characterName, payload.build);
    getSocketServer().to(`guildWar:week:${registration.week_id}`).emit("guildWar:registrationsUpdated", {
      weekId: registration.week_id,
      dayId: payload.dayId,
      action: "force-register",
      registrationId: registration.id,
    });
    res.status(201).json(registration);
  }),
};