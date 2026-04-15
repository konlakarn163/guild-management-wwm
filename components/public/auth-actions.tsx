"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useLanguage } from "@/components/providers/language-provider";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

interface AuthActionsProps {
  variant?: "default" | "banner";
}

export function AuthActions({ variant = "default" }: AuthActionsProps) {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const hydrateUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        setUser(sessionData.session.user);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
    };

    void hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithDiscord = async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabaseBrowser = getSupabaseBrowserClient();
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/dashboard`,
      },
    });
  };

  if (variant === "banner") {
    if (user) {
      return (
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white px-8 py-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-950 transition-all duration-200 hover:bg-white/90"
          style={{ fontFamily: "var(--font-body)", borderRadius: 0 }}
        >
          {language === "th" ? "ไปหน้า Dashboard" : "Go to Dashboard"}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void signInWithDiscord()}
        className="inline-flex items-center gap-2 bg-white px-8 py-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-950 transition-all duration-200 hover:bg-white/90"
        style={{ fontFamily: "var(--font-body)", borderRadius: 0 }}
      >
        <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor">
          <path d="M20.317 1.492A19.825 19.825 0 0015.19-.001c-.24.417-.46.853-.657 1.298a18.33 18.33 0 00-5.063 0A13.45 13.45 0 008.81 0 19.757 19.757 0 003.68 1.495C.533 6.198-.32 10.787.1 15.315a19.876 19.876 0 006.063 3.056 14.3 14.3 0 001.226-1.994 12.989 12.989 0 01-1.93-.927c.163-.118.322-.24.475-.364a14.153 14.153 0 0012.131 0c.155.126.314.247.476.364-.614.362-1.26.674-1.932.928a14.22 14.22 0 001.226 1.994 19.824 19.824 0 006.063-3.056c.497-5.188-.838-9.733-3.581-13.824zM8.02 12.56c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.427 2.157-2.427 1.2 0 2.186 1.094 2.157 2.427 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.957-2.427 2.157-2.427 1.2 0 2.186 1.094 2.157 2.427 0 1.334-.948 2.419-2.157 2.419z" />
        </svg>
        {language === "th" ? "เข้าสู่ระบบด้วย Discord" : "Login with Discord"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signInWithDiscord()}
      className="w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-50 transition hover:bg-slate-800"
    >
      {language === "th" ? "เข้าสู่ระบบด้วย Discord" : "Login with Discord"}
    </button>
  );
}