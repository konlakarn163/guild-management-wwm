import { Router } from "express";
import { guildWarController } from "../controllers/guild-war.controller.js";

export const guildWarRouter = Router();

guildWarRouter.get("/windows/open", guildWarController.listOpen);
guildWarRouter.get("/windows", guildWarController.listWindows);
guildWarRouter.post("/windows", guildWarController.createWindow);
guildWarRouter.post("/windows/:id/open", guildWarController.openWindow);
guildWarRouter.post("/windows/:id/close", guildWarController.closeWindow);
guildWarRouter.delete("/windows/:id", guildWarController.deleteWindow);

guildWarRouter.get("/registrations/open", guildWarController.listOpen);
guildWarRouter.delete("/registrations/cleanup/previous-months", guildWarController.cleanupPreviousMonthRegistrations);
guildWarRouter.get("/registrations/:weekId", guildWarController.listByWeek);
guildWarRouter.post("/registrations", guildWarController.register);
guildWarRouter.post("/registrations/reserve", guildWarController.registerToReserve);
guildWarRouter.post("/registrations/admin", guildWarController.adminRegister);
guildWarRouter.delete("/registrations/open", guildWarController.cancelOpen);
guildWarRouter.delete("/registrations/:weekId", guildWarController.cancel);
