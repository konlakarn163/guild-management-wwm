"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LanguageToggle } from "@/components/public/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { apiFetch } from "@/lib/api";
import { getAccessToken, signOut } from "@/lib/client-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/types";

interface CornerWidgetProps {
  /** Use inverted (light) style for LanguageToggle — for dark/image backgrounds */
  inverted?: boolean;
  /** Show the language toggle (default true) */
  showLanguage?: boolean;
  /** Hide this widget when the user has scrolled past 100px (i.e. when FloatingNavbar becomes visible) */
  hideOnScroll?: boolean;
}

const copy = {
  th: {
    profile: "โปรไฟล์",
    editProfile: "แก้ไขโปรไฟล์ตัวละคร",
    dashboard: "สมาชิก",
    admin: "แอดมิน",
    logout: "ออกจากระบบ",
    login: "เข้าสู่ระบบ",
  },
  en: {
    profile: "Profile",
    editProfile: "Edit Character Profile",
    dashboard: "Dashboard",
    admin: "Admin",
    logout: "Logout",
    login: "Login",
  },
} as const;

export function CornerWidget({ inverted = false, showLanguage = true, hideOnScroll = false }: CornerWidgetProps) {
  const { language } = useLanguage();
  const supabaseReady = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const text = copy[language];
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (!hideOnScroll) {
      setScrolled(false);
      return;
    }

    const getScrollTop = () => {
      return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const handleScroll = () => {
      setScrolled(getScrollTop() > 100);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hideOnScroll]);

  useEffect(() => {
    if (!supabaseReady) return;

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  useEffect(() => {
    const loadRole = async () => {
      if (!user) { setRole(null); return; }
      try {
        const token = await getAccessToken();
        if (!token) { setRole(null); return; }
        const profile = await apiFetch<{ role: UserRole }>("/api/profile/me", { token });
        setRole(profile.role);
      } catch {
        setRole(null);
      }
    };
    void loadRole();
  }, [user]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const profileName = useMemo(() => {
    if (!user) return "";
    const fromMetadata =
      user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.user_metadata?.name;
    if (typeof fromMetadata === "string" && fromMetadata.trim().length > 0) return fromMetadata;
    if (user.email) return user.email.split("@")[0] ?? user.email;
    return "Member";
  }, [user]);

  const avatarUrl = useMemo(() => {
    const fromAvatar = user?.user_metadata?.avatar_url;
    if (typeof fromAvatar === "string" && fromAvatar.length > 0) return fromAvatar;
    const fromPicture = user?.user_metadata?.picture;
    if (typeof fromPicture === "string" && fromPicture.length > 0) return fromPicture;
    return null;
  }, [user]);

  const onLogin = async () => {
    if (!supabaseReady) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
      },
    });
  };

  const onLogout = async () => {
    await signOut();
    setIsProfileOpen(false);
  };

  const buttonBorder = inverted ? "border-white/20 bg-black/30 backdrop-blur hover:bg-black/45" : "border-slate-700 bg-slate-900 hover:bg-slate-800";
  const menuBorder = inverted ? "border-white/20 bg-[#040a13]/95 backdrop-blur" : "border-slate-800 bg-[#040a13]";
  const loginBtn = inverted
    ? "border-white/25 bg-black/35 hover:bg-black/50 text-white"
    : "bg-slate-950 hover:bg-slate-800 text-white";

  return (
    <div className={`fixed right-5 top-5 z-40 flex items-center gap-2 transition-all duration-300 md:right-8 md:top-8 ${hideOnScroll && scrolled ? "-translate-y-3 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}>
      {showLanguage ? <LanguageToggle inverted={inverted} /> : null}

      {supabaseReady && user ? (
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((c) => !c)}
            className={`flex items-center gap-2 rounded-full border px-2 py-1 transition ${buttonBorder}`}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            aria-label={text.profile}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profileName}
                className="h-8 w-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold uppercase text-white">
                {profileName.slice(0, 1)}
              </div>
            )}
          </button>

          {isProfileOpen ? (
            <div
              role="menu"
              className={`absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border p-2 shadow-[0_16px_38px_rgba(0,0,0,0.60)] ${menuBorder}`}
            >
              <a
                href="/dashboard"
                role="menuitem"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-slate-50"
                onClick={() => setIsProfileOpen(false)}
              >
                {text.dashboard}
              </a>
              {isAdmin ? (
                <a
                  href="/admin"
                  role="menuitem"
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-slate-50"
                  onClick={() => setIsProfileOpen(false)}
                >
                  {text.admin}
                </a>
              ) : null}
              <hr className="my-1 border-white/10" />
              <a
                href="/dashboard"
                role="menuitem"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-slate-50"
                onClick={() => setIsProfileOpen(false)}
              >
                {text.editProfile}
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => void onLogout()}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-300 transition hover:bg-rose-900/35"
              >
                {text.logout}
              </button>
            </div>
          ) : null}
        </div>
      ) : supabaseReady ? (
        <button
          type="button"
          onClick={() => void onLogin()}
          className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${loginBtn}`}
        >
          {text.login}
        </button>
      ) : null}
    </div>
  );
}
