import { z } from "zod";
import { getSocketServer } from "../lib/socket.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeWeekIdToMonday } from "../utils/week-id.js";
import { guildWarService } from "../services/guild-war.service.js";
import { discordNotifierService } from "../services/discord-notifier.service.js";
const weekSchema = z.object({
    weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const adminRegisterSchema = z.object({
    userId: z.string().uuid(),
});
const createWindowSchema = z.object({
    dayId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const windowIdSchema = z.object({
    id: z.string().uuid(),
});
const assertAdmin = (req) => {
    if (!req.authUser) {
        throw new HttpError(401, "Unauthorized");
    }
    if (req.authUser.role !== "ADMIN" && req.authUser.role !== "SUPER_ADMIN") {
        throw new HttpError(403, "Forbidden");
    }
};
export const guildWarController = {
    listByWeek: asyncHandler(async (req, res) => {
        const { weekId: rawWeekId } = weekSchema.parse(req.params);
        const weekId = normalizeWeekIdToMonday(rawWeekId);
        const registrations = await guildWarService.listRegistrations(weekId);
        res.json(registrations);
    }),
    listOpen: asyncHandler(async (_req, res) => {
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (!openWindow) {
            res.json({ window: null, registrations: [] });
            return;
        }
        const registrations = await guildWarService.listRegistrationsByDay(openWindow.day_id);
        res.json({ window: openWindow, registrations });
    }),
    listWindows: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const windows = await guildWarService.listRegistrationWindows();
        res.json(windows);
    }),
    createWindow: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const payload = createWindowSchema.parse(req.body);
        const window = await guildWarService.createRegistrationWindow(payload.dayId, req.authUser.id);
        res.status(201).json(window);
    }),
    openWindow: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const { id } = windowIdSchema.parse(req.params);
        const window = await guildWarService.setWindowOpenState(id, true);
        await discordNotifierService.notifyGuildWarWindowOpened({
            dayId: window.day_id,
            weekId: window.week_id,
            openedByUserId: req.authUser.id,
        });
        getSocketServer().to(`guildWar:week:${window.week_id}`).emit("guildWar:registrationsUpdated", {
            weekId: window.week_id,
            dayId: window.day_id,
            action: "window-opened",
        });
        res.json(window);
    }),
    closeWindow: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const { id } = windowIdSchema.parse(req.params);
        const window = await guildWarService.setWindowOpenState(id, false);
        getSocketServer().to(`guildWar:week:${window.week_id}`).emit("guildWar:registrationsUpdated", {
            weekId: window.week_id,
            dayId: window.day_id,
            action: "window-closed",
        });
        res.json(window);
    }),
    deleteWindow: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const { id } = windowIdSchema.parse(req.params);
        const window = await guildWarService.deleteRegistrationWindow(id);
        getSocketServer().to(`guildWar:week:${window.week_id}`).emit("guildWar:registrationsUpdated", {
            weekId: window.week_id,
            dayId: window.day_id,
            action: "window-deleted",
        });
        res.status(204).send();
    }),
    cleanupPreviousMonthRegistrations: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const result = await guildWarService.cleanupRegistrationsBeforeCurrentMonth();
        res.json(result);
    }),
    register: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        const registration = await guildWarService.register(req.authUser.id);
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (openWindow) {
            getSocketServer().to(`guildWar:week:${openWindow.week_id}`).emit("guildWar:registrationsUpdated", {
                weekId: openWindow.week_id,
                dayId: openWindow.day_id,
                action: "register",
                userId: req.authUser.id,
            });
        }
        res.status(201).json(registration);
    }),
    registerToReserve: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        const registration = await guildWarService.registerToReserve(req.authUser.id);
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (openWindow) {
            getSocketServer().to(`guildWar:week:${openWindow.week_id}`).emit("guildWar:registrationsUpdated", {
                weekId: openWindow.week_id,
                dayId: openWindow.day_id,
                action: "register-reserve",
                userId: req.authUser.id,
            });
            getSocketServer().to(`guildWar:week:${openWindow.week_id}`).emit("guildWar:teamMoved", {
                weekId: openWindow.week_id,
                memberKey: req.authUser.id,
                targetZone: "Reserve",
            });
        }
        res.status(201).json(registration);
    }),
    adminRegister: asyncHandler(async (req, res) => {
        assertAdmin(req);
        const body = adminRegisterSchema.parse(req.body);
        const registration = await guildWarService.adminRegister(body.userId);
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (openWindow) {
            getSocketServer().to(`guildWar:week:${openWindow.week_id}`).emit("guildWar:registrationsUpdated", {
                weekId: openWindow.week_id,
                dayId: openWindow.day_id,
                action: "admin-register",
                userId: body.userId,
            });
        }
        res.status(201).json(registration);
    }),
    cancelOpen: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        await guildWarService.cancel(req.authUser.id);
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (openWindow) {
            getSocketServer().to(`guildWar:week:${openWindow.week_id}`).emit("guildWar:registrationsUpdated", {
                weekId: openWindow.week_id,
                dayId: openWindow.day_id,
                action: "cancel",
                userId: req.authUser.id,
            });
        }
        res.status(204).send();
    }),
    cancel: asyncHandler(async (req, res) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        const { weekId: rawWeekId } = weekSchema.parse(req.params);
        const weekId = normalizeWeekIdToMonday(rawWeekId);
        const openWindow = await guildWarService.getOpenRegistrationWindow();
        if (!openWindow || openWindow.week_id !== weekId) {
            throw new HttpError(403, "You can cancel only for the currently opened registration");
        }
        await guildWarService.cancel(req.authUser.id);
        getSocketServer().to(`guildWar:week:${weekId}`).emit("guildWar:registrationsUpdated", {
            weekId,
            dayId: openWindow.day_id,
            action: "cancel",
            userId: req.authUser.id,
        });
        res.status(204).send();
    }),
};
