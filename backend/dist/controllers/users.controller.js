import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { usersService } from "../services/users.service.js";
const listQuerySchema = z.object({
    status: z.enum(["PENDING", "ACTIVE", "REJECTED"]).optional(),
    role: z.enum(["MEMBER", "ADMIN", "SUPER_ADMIN"]).optional(),
    build: z.string().min(1).optional(),
    search: z.string().optional(),
});
const updateSchema = z.object({
    role: z.enum(["MEMBER", "ADMIN", "SUPER_ADMIN"]).optional(),
    status: z.enum(["PENDING", "ACTIVE", "REJECTED"]).optional(),
    character_name: z.string().min(1).max(64).optional(),
    build: z.string().min(1).max(128).optional(),
});
const bulkApproveSchema = z.object({
    ids: z.array(z.string().uuid()).min(1),
});
export const usersController = {
    listUsers: asyncHandler(async (req, res) => {
        const query = listQuerySchema.parse(req.query);
        const users = await usersService.listUsers(query);
        res.json(users);
    }),
    updateUser: asyncHandler(async (req, res) => {
        const payload = updateSchema.parse(req.body);
        const user = await usersService.updateUser(req.params.id, payload);
        res.json(user);
    }),
    deleteUser: asyncHandler(async (req, res) => {
        await usersService.deleteUser(req.params.id);
        res.status(204).send();
    }),
    approveUser: asyncHandler(async (req, res) => {
        const user = await usersService.approveUser(req.params.id);
        res.json(user);
    }),
    bulkApproveUsers: asyncHandler(async (req, res) => {
        const payload = bulkApproveSchema.parse(req.body);
        const users = await usersService.bulkApprove(payload.ids);
        res.json(users);
    }),
    rejectUser: asyncHandler(async (req, res) => {
        const user = await usersService.rejectUser(req.params.id);
        res.json(user);
    }),
};
