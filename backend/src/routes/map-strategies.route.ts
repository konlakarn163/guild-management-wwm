import { Router } from "express";
import { requireRole } from "../middlewares/require-role.js";
import { mapStrategiesController } from "../controllers/map-strategies.controller.js";

export const mapStrategiesRouter = Router();

mapStrategiesRouter.get("/", mapStrategiesController.list);
mapStrategiesRouter.post("/", requireRole("ADMIN", "SUPER_ADMIN"), mapStrategiesController.create);
mapStrategiesRouter.put("/:id", requireRole("ADMIN", "SUPER_ADMIN"), mapStrategiesController.update);