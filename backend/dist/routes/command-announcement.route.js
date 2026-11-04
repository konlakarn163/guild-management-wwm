import { Router } from "express";
import { commandAnnouncementController } from "../controllers/command-announcement.controller.js";
import { requireRole } from "../middlewares/require-role.js";
export const commandAnnouncementRouter = Router();
commandAnnouncementRouter.use(requireRole("COMMAND", "ADMIN", "SUPER_ADMIN"));
commandAnnouncementRouter.get("/", commandAnnouncementController.getState);
commandAnnouncementRouter.put("/messages", commandAnnouncementController.updateMessages);
commandAnnouncementRouter.post("/start", commandAnnouncementController.start);
commandAnnouncementRouter.post("/reset", commandAnnouncementController.reset);
