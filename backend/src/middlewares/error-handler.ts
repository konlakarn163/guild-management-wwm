import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  void next;

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};