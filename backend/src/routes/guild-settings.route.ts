import { Router } from "express";
import { guildSettingsController } from "../controllers/guild-settings.controller.js";
import { requireRole } from "../middlewares/require-role.js";

export const guildSettingsRouter = Router();

guildSettingsRouter.get("/", requireRole("ADMIN", "SUPER_ADMIN"), guildSettingsController.getOne);
guildSettingsRouter.put("/", requireRole("SUPER_ADMIN"), guildSettingsController.upsert);