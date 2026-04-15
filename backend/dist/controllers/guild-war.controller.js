import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { guildWarService } from "../services/guild-war.service.js";
const weekSchema = z.object({
    weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const guildWarController = {
    listByWeek: asyncHandler(async (req, res) => {
        const { weekId } = weekSchema.parse(req.params);
        const registrations = await guildWarService.listRegistrations(weekId);
        res.json(registrations);
    }),
    register: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        const body = z.object({ weekId: weekSchema.shape.weekId }).parse(req.body);
        const registration = await guildWarService.register(req.authUser.id, body.weekId);
        res.status(201).json(registration);
    }),
    cancel: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        const { weekId } = weekSchema.parse(req.params);
        await guildWarService.cancel(req.authUser.id, weekId);
        res.status(204).send();
    }),
};
