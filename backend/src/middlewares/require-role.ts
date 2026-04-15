import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/auth.js";
import { HttpError } from "../utils/http-error.js";

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    if (!roles.includes(req.authUser.role)) {
      throw new HttpError(403, "Forbidden");
    }

    next();
  };
};