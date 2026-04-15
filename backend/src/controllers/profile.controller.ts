import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { profileService } from "../services/profile.service.js";

const updateProfileSchema = z.object({
  character_name: z.string().min(1).max(64),
  build: z.string().min(1).max(128),
});

export const profileController = {
  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const profile = await profileService.getMyProfile(req.authUser.id);
    res.json(profile);
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = updateProfileSchema.parse(req.body);
    const profile = await profileService.updateMyProfile(req.authUser.id, payload);
    res.json(profile);
  }),
};