import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
import type { UserRole } from "../types/auth.js";

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing bearer token");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new HttpError(401, "Invalid token");
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      throw new HttpError(401, "Invalid token");
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      throw new HttpError(500, profileError.message);
    }

    const role = (profileData?.role as UserRole | undefined) ?? "MEMBER";

    req.authUser = {
      id: authData.user.id,
      email: authData.user.email,
      role,
    };

    next();
  } catch (error) {
    next(error);
  }
};