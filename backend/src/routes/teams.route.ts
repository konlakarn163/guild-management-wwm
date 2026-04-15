import { Router } from "express";
import { requireRole } from "../middlewares/require-role.js";
import { teamsController } from "../controllers/teams.controller.js";

export const teamsRouter = Router();

teamsRouter.get("/:weekId", teamsController.listTeams);
teamsRouter.post("/:weekId", requireRole("ADMIN", "SUPER_ADMIN"), teamsController.createTeam);
teamsRouter.put("/:teamId/members", requireRole("ADMIN", "SUPER_ADMIN"), teamsController.updateMembers);