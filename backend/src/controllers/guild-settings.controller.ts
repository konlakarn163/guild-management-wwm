import type { Request, Response } from "express";
import { z } from "zod";
import { guildSettingsService } from "../services/guild-settings.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const ALLOWED_BUILD_COLORS = ["#d65409", "#1253e0", "#167312"] as const;

const upsertSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  code: z.string().min(1).max(40).optional(),
  description: z.string().min(1).max(500).optional(),
  discord_invite: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value)),
  build_options: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        color: z
          .string()
          .regex(/^#([0-9a-fA-F]{6})$/)
          .transform((value) => value.toLowerCase())
          .refine((value) => ALLOWED_BUILD_COLORS.includes(value as (typeof ALLOWED_BUILD_COLORS)[number])),
      }),
    )
    .max(60)
    .optional(),
});

export const guildSettingsController = {
  getOne: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await guildSettingsService.getOne();
    res.json(settings);
  }),

  upsert: asyncHandler(async (req: Request, res: Response) => {
    const payload = upsertSchema.parse(req.body);
    const settings = await guildSettingsService.upsert(payload);
    res.json(settings);
  }),
};