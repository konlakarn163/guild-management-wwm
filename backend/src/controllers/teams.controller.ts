import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { teamsService } from "../services/teams.service.js";

const teamIdSchema = z.object({
  teamId: z.string().uuid(),
});

export const teamsController = {
  getTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = teamIdSchema.parse(req.params);
    const team = await teamsService.getTeam(teamId);
    res.json(team);
  }),

  listTeams: asyncHandler(async (req: Request, res: Response) => {
    const teams = await teamsService.listTeams();
    res.json(teams);
  }),

  createTeam: asyncHandler(async (req: Request, res: Response) => {
    const payload = z
      .object({
        name: z.string().min(1).max(64),
        description: z.string().max(240).optional(),
        color: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
        teamType: z.enum(["atk", "def", "other"]).optional(),
      })
      .parse(req.body);
    const team = await teamsService.createTeam(
      payload.name,
      payload.description,
      payload.color,
      payload.teamType,
    );
    res.status(201).json(team);
  }),

  updateTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = teamIdSchema.parse(req.params);
    const payload = z
      .object({
        name: z.string().min(1).max(64).optional(),
        description: z.string().max(240).nullable().optional(),
        color: z.string().regex(/^#([0-9a-fA-F]{6})$/).nullable().optional(),
        teamType: z.enum(["atk", "def", "other"]).optional(),
      })
      .parse(req.body);

    if (payload.name === undefined && payload.description === undefined && payload.color === undefined && payload.teamType === undefined) {
      throw new HttpError(400, "No changes provided");
    }

    const team = await teamsService.updateTeam(teamId, payload);
    res.json(team);
  }),

  deleteTeam: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = teamIdSchema.parse(req.params);
    const team = await teamsService.deleteTeam(teamId);
    res.json(team);
  }),

  updateMembers: asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = teamIdSchema.parse(req.params);
    const payload = z.object({ userIds: z.array(z.string().uuid()) }).parse(req.body);
    const members = await teamsService.updateMembers(teamId, payload.userIds);
    res.json(members);
  }),
};