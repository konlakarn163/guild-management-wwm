import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { mapStrategiesService } from "../services/map-strategies.service.js";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data: z.unknown(),
});

const updateSchema = createSchema.partial();

export const mapStrategiesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const strategies = await mapStrategiesService.list();
    res.json(strategies);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = createSchema.parse(req.body);
    const strategy = await mapStrategiesService.create({
      title: payload.title,
      plan_date: payload.plan_date,
      data: payload.data,
      created_by: req.authUser.id,
    });
    res.status(201).json(strategy);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const payload = updateSchema.parse(req.body);
    const strategy = await mapStrategiesService.update(req.params.id, payload);
    res.json(strategy);
  }),
};