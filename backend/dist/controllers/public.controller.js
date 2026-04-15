import { asyncHandler } from "../utils/async-handler.js";
import { publicService } from "../services/public.service.js";
export const publicController = {
    getGuildInfo: asyncHandler(async (_req, res) => {
        const guildInfo = await publicService.getGuildInfo();
        res.json(guildInfo);
    }),
};
