import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { teamsService } from "../services/teams.service.js";
const weekSchema = z.object({
    weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const teamsController = {
    listTeams: asyncHandler(async (req, res) => {
        const { weekId } = weekSchema.parse(req.params);
        const teams = await teamsService.listTeams(weekId);
        res.json(teams);
    }),
    createTeam: asyncHandler(async (req, res) => {
        const { weekId } = weekSchema.parse(req.params);
        const payload = z.object({ name: z.string().min(1).max(64) }).parse(req.body);
        const team = await teamsService.createTeam(weekId, payload.name);
        res.status(201).json(team);
    }),
    updateMembers: asyncHandler(async (req, res) => {
        const payload = z.object({ userIds: z.array(z.string().uuid()) }).parse(req.body);
        const members = await teamsService.updateMembers(req.params.teamId, payload.userIds);
        res.json(members);
    }),
};
