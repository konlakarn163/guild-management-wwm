import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { normalizeWeekIdToMonday } from "../utils/week-id.js";
import { teamsService } from "../services/teams.service.js";

const weekSchema = z.object({
  weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const teamsController = {
  listTeams: asyncHandler(async (req: Request, res: Response) => {
    const { weekId: rawWeekId } = weekSchema.parse(req.params);
    const dayId = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.dayId);
    const weekId = normalizeWeekIdToMonday(rawWeekId);
    const teams = await teamsService.listTeams(weekId, dayId);
    res.json(teams);
  }),

  createTeam: asyncHandler(async (req: Request, res: Response) => {
    const { weekId: rawWeekId } = weekSchema.parse(req.params);
    const weekId = normalizeWeekIdToMonday(rawWeekId);
    const payload = z
      .object({
        name: z.string().min(1).max(64),
        dayId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        registrationWindowId: z.string().uuid().optional(),
      })
      .parse(req.body);
    const team = await teamsService.createTeam(weekId, payload.name, payload.dayId, payload.registrationWindowId);
    res.status(201).json(team);
  }),

  updateMembers: asyncHandler(async (req: Request, res: Response) => {
    const payload = z.object({ userIds: z.array(z.string().uuid()) }).parse(req.body);
    const members = await teamsService.updateMembers(req.params.teamId, payload.userIds);
    res.json(members);
  }),
};