import { Router } from "express";
import { profileController } from "../controllers/profile.controller.js";
export const profileRouter = Router();
profileRouter.get("/me", profileController.me);
profileRouter.put("/me", profileController.updateMe);
