"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { getAccessToken, getCurrentUser, getUserRole } from "@/lib/client-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/types";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "allowed" | "forbidden">("loading");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isActive = true;
    let didResolve = false;

    const getRoleFromDatabase = async (): Promise<UserRole | null> => {
      try {
        const token = await getAccessToken();
        if (!token) {
          return null;
        }

        const profile = await apiFetch<{ role: UserRole }>("/api/profile/me", { token });
        return profile.role;
      } catch {
        return null;
      }
    };

    const allowIfPermitted = async () => {
      const user = await getCurrentUser();
      if (!isActive) {
        return;
      }

      if (!user) {
        router.replace("/");
        return;
      }

      const role = allowedRoles ? (await getRoleFromDatabase()) ?? getUserRole(user) : getUserRole(user);

      if (allowedRoles && !allowedRoles.includes(role)) {
        didResolve = true;
        setState("forbidden");
        return;
      }

      didResolve = true;
      setState("allowed");
    };

    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!isActive || didResolve) {
        return;
      }

      if (user) {
        await allowIfPermitted();
        return;
      }

      const hasOAuthParams =
        window.location.search.includes("code=") ||
        window.location.search.includes("access_token=") ||
        window.location.hash.includes("access_token=");

      if (!hasOAuthParams) {
        didResolve = true;
        router.replace("/");
        return;
      }

      // After OAuth redirect, Supabase may need a short moment to exchange code for session.
      window.setTimeout(async () => {
        if (!isActive || didResolve) {
          return;
        }

        const retryUser = await getCurrentUser();
        if (!isActive || didResolve) {
          return;
        }

        if (retryUser) {
          await allowIfPermitted();
          return;
        }

        didResolve = true;
        router.replace("/");
      }, 900);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive || didResolve) {
        return;
      }

      if (session?.user) {
        void allowIfPermitted();
        return;
      }

      if (event === "SIGNED_OUT") {
        didResolve = true;
        router.replace("/");
      }
    });

    void checkAuth();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [allowedRoles, router]);

  if (state === "loading") {
    return <p className="px-4 py-8 text-center text-slate-300">Checking permissions...</p>;
  }

  if (state === "forbidden") {
    return <p className="px-4 py-8 text-center text-rose-300">Access denied: you do not have permission for this page.</p>;
  }

  return <>{children}</>;
}