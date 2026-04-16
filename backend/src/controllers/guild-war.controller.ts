import type { Request, Response } from "express";
import { z } from "zod";
import { getSocketServer } from "../lib/socket.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeWeekIdToMonday } from "../utils/week-id.js";
import { guildWarService } from "../services/guild-war.service.js";

const weekSchema = z.object({
  weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const adminRegisterSchema = z.object({
  weekId: weekSchema.shape.weekId,
  userId: z.string().uuid(),
});

export const guildWarController = {
  listByWeek: asyncHandler(async (req: Request, res: Response) => {
    const { weekId: rawWeekId } = weekSchema.parse(req.params);
    const weekId = normalizeWeekIdToMonday(rawWeekId);
    const registrations = await guildWarService.listRegistrations(weekId);
    res.json(registrations);
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const body = z.object({ weekId: weekSchema.shape.weekId }).parse(req.body);
    const weekId = normalizeWeekIdToMonday(body.weekId);
    const registration = await guildWarService.register(req.authUser.id, weekId);
    getSocketServer().to(`guildWar:week:${weekId}`).emit("guildWar:registrationsUpdated", {
      weekId,
      action: "register",
      userId: req.authUser.id,
    });
    res.status(201).json(registration);
  }),

  adminRegister: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    if (req.authUser.role !== "ADMIN" && req.authUser.role !== "SUPER_ADMIN") {
      throw new HttpError(403, "Forbidden");
    }

    const body = adminRegisterSchema.parse(req.body);
    const weekId = normalizeWeekIdToMonday(body.weekId);
    const registration = await guildWarService.register(body.userId, weekId);
    getSocketServer().to(`guildWar:week:${weekId}`).emit("guildWar:registrationsUpdated", {
      weekId,
      action: "admin-register",
      userId: body.userId,
    });
    res.status(201).json(registration);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { weekId: rawWeekId } = weekSchema.parse(req.params);
    const weekId = normalizeWeekIdToMonday(rawWeekId);
    await guildWarService.cancel(req.authUser.id, weekId);
    getSocketServer().to(`guildWar:week:${weekId}`).emit("guildWar:registrationsUpdated", {
      weekId,
      action: "cancel",
      userId: req.authUser.id,
    });
    res.status(204).send();
  }),
};