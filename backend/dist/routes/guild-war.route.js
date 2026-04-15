import { Router } from "express";
import { guildWarController } from "../controllers/guild-war.controller.js";
export const guildWarRouter = Router();
guildWarRouter.get("/registrations/:weekId", guildWarController.listByWeek);
guildWarRouter.post("/registrations", guildWarController.register);
guildWarRouter.delete("/registrations/:weekId", guildWarController.cancel);
