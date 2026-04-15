"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase-browser";
import type { UserRole } from "./types";

export async function getAccessToken() {
  const supabaseBrowser = getSupabaseBrowserClient();
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token;
}

export async function getCurrentUser() {
  const supabaseBrowser = getSupabaseBrowserClient();
  const { data } = await supabaseBrowser.auth.getUser();
  return data.user;
}

export function getUserRole(user: User | null): UserRole {
  const rawRole =
    user?.user_metadata?.role ??
    user?.app_metadata?.role ??
    user?.user_metadata?.user_role ??
    user?.app_metadata?.user_role;

  const normalizedRole = String(rawRole ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalizedRole === "ADMIN") {
    return "ADMIN";
  }

  if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "SUPERADMIN") {
    return "SUPER_ADMIN";
  }

  return "MEMBER";
}

export async function signOut() {
  const supabaseBrowser = getSupabaseBrowserClient();
  await supabaseBrowser.auth.signOut();
}