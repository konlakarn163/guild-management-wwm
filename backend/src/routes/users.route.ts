import { Router } from "express";
import { requireRole } from "../middlewares/require-role.js";
import { usersController } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", requireRole("ADMIN", "SUPER_ADMIN"), usersController.listUsers);
usersRouter.patch("/:id", requireRole("ADMIN", "SUPER_ADMIN"), usersController.updateUser);
usersRouter.delete("/:id", requireRole("SUPER_ADMIN"), usersController.deleteUser);
usersRouter.post("/:id/approve", requireRole("ADMIN", "SUPER_ADMIN"), usersController.approveUser);
usersRouter.post("/bulk-approve", requireRole("ADMIN", "SUPER_ADMIN"), usersController.bulkApproveUsers);
usersRouter.post("/:id/reject", requireRole("ADMIN", "SUPER_ADMIN"), usersController.rejectUser);