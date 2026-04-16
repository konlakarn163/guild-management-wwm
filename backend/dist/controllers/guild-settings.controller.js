import { z } from "zod";
import { guildSettingsService } from "../services/guild-settings.service.js";
import { asyncHandler } from "../utils/async-handler.js";
const ALLOWED_BUILD_COLORS = ["#d65409", "#1253e0", "#167312"];
const upsertSchema = z.object({
    name: z.string().min(1).max(120),
    code: z.string().min(1).max(40),
    description: z.string().min(1).max(500),
    discord_invite: z.string().url().nullable().optional(),
    build_options: z
        .array(z.object({
        label: z.string().min(1).max(80),
        color: z
            .string()
            .regex(/^#([0-9a-fA-F]{6})$/)
            .transform((value) => value.toLowerCase())
            .refine((value) => ALLOWED_BUILD_COLORS.includes(value)),
    }))
        .max(60)
        .optional(),
});
export const guildSettingsController = {
    getOne: asyncHandler(async (_req, res) => {
        const settings = await guildSettingsService.getOne();
        res.json(settings);
    }),
    upsert: asyncHandler(async (req, res) => {
        const payload = upsertSchema.parse(req.body);
        const settings = await guildSettingsService.upsert(payload);
        res.json(settings);
    }),
};
