import { Router } from "express";
import { publicController } from "../controllers/public.controller.js";

export const publicRouter = Router();

publicRouter.get("/guild", publicController.getGuildInfo);
publicRouter.get("/guild-war/windows/open", publicController.listOpenRegistrationWindows);
publicRouter.post("/guild-war/force-register", publicController.forceRegister);