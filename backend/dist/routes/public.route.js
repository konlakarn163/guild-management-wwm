import { Router } from "express";
import { publicController } from "../controllers/public.controller.js";
export const publicRouter = Router();
publicRouter.get("/guild", publicController.getGuildInfo);
