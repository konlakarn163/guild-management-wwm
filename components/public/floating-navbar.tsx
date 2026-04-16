"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LanguageToggle } from "@/components/public/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { apiFetch } from "@/lib/api";
import { getAccessToken, signOut } from "@/lib/client-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { GuildInfo, UserRole } from "@/lib/types";

interface FloatingNavbarProps {
  guildInfo: GuildInfo;
  menuLinksToHome?: boolean;
}

const copy = {
  th: {
    schedule: "ตารางกิจกรรม",
    dashboard: "สมาชิก",
    admin: "แอดมิน",
    home: "หน้าแรก",
    login: "เข้าสู่ระบบ",
    profile: "โปรไฟล์",
    editProfile: "แก้ไขโปรไฟล์ตัวละคร",
    logout: "ออกจากระบบ",
  },
  en: {
    schedule: "Schedule",
    dashboard: "Dashboard",
    admin: "Admin",
    home: "Home",
    login: "Login",
    profile: "Profile",
    editProfile: "Edit Character Profile",
    logout: "Logout",
  },
} as const;

export function FloatingNavbar({ guildInfo, menuLinksToHome = false }: FloatingNavbarProps) {
  const { language } = useLanguage();
  const supabaseReady = isSupabaseConfigured();
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const text = copy[language];
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
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
      const scrollTop = getScrollTop();
      setIsVisible((prev) => {
        const next = scrollTop > 100;
        return prev === next ? prev : next;
      });
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
  }, []);

  useEffect(() => {
    if (!supabaseReady) {
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
  }, [supabaseReady]);

  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setRole(null);
        return;
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          setRole(null);
          return;
        }

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
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const profileName = useMemo(() => {
    if (!user) {
      return "";
    }

    const fromMetadata =
      user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.user_metadata?.name;
    if (typeof fromMetadata === "string" && fromMetadata.trim().length > 0) {
      return fromMetadata;
    }

    if (user.email) {
      return user.email.split("@")[0] ?? user.email;
    }

    return "Member";
  }, [user]);

  const avatarUrl = useMemo(() => {
    const fromAvatar = user?.user_metadata?.avatar_url;
    if (typeof fromAvatar === "string" && fromAvatar.length > 0) {
      return fromAvatar;
    }

    const fromPicture = user?.user_metadata?.picture;
    if (typeof fromPicture === "string" && fromPicture.length > 0) {
      return fromPicture;
    }

    return null;
  }, [user]);

  const onLogin = async () => {
    if (!supabaseReady) return;

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : undefined,
      },
    });

    if (error) {
      console.error("Error logging in:", error.message);
    }
  };

  const onLogout = async () => {
    await signOut();
    setIsProfileOpen(false);
  };

  const onSmoothScroll = (targetId: "top" | "schedule") => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className={`fixed inset-x-0 top-4 z-50 mx-auto w-[min(calc(100%-1.5rem),1100px)] transition-all duration-300 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0 pointer-events-none"
        }`}
    >
      <div className="flex items-center justify-between gap-3 rounded-full border border-amber-100/12 bg-[#010308]/85 px-3 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.70)] backdrop-blur-xl md:px-4">
        {menuLinksToHome ? (
          <a href="/" className="flex min-w-0 items-center gap-3 rounded-full px-2 py-1 transition hover:bg-slate-800/80">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <Image src="/images/icon.jpg" alt="MeawMeaw" fill className="object-cover" sizes="40px" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">{guildInfo.name}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.22em] text-slate-400">{guildInfo.code}</p>
            </div>
          </a>
        ) : (
          <div
            className="flex min-w-0 items-center gap-3 rounded-full px-2 py-1 transition hover:bg-slate-800/80"
            onClick={() => onSmoothScroll("top")}
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <Image src="/images/icon.jpg" alt="MeawMeaw" fill className="object-cover" sizes="40px" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">{guildInfo.name}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.22em] text-slate-400">{guildInfo.code}</p>
            </div>
          </div>
        )}

        <div className="hidden items-center gap-2 md:flex">
          {menuLinksToHome ? (
            <>
              <a href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100">
                {text.home}
              </a>
              <a href="/dashboard" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100">
                {text.dashboard}
              </a>
              {isAdmin ? (
                <a href="/admin" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100">
                  {text.admin}
                </a>
              ) : null}
            </>
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                className="rounded-full cursor-pointer px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
                onClick={() => onSmoothScroll("top")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSmoothScroll("top");
                  }
                }}
              >
                {text.home}
              </div>
              <div
                role="button"
                tabIndex={0}
                className="rounded-full cursor-pointer px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
                onClick={() => onSmoothScroll("schedule")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSmoothScroll("schedule");
                  }
                }}
              >
                {text.schedule}
              </div>
              <a href="/dashboard" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100">
                {text.dashboard}
              </a>
              {isAdmin ? (
                <a href="/admin" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100">
                  {text.admin}
                </a>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />

          {supabaseReady && user ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 transition hover:bg-slate-800"
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
                <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-300 md:block">{profileName}</span>
              </button>

              {isProfileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border border-slate-800 bg-[#040a13] p-2 shadow-[0_16px_38px_rgba(0,0,0,0.60)]"
                >
                  <div className="md:hidden">
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
                    <hr className="my-1 border-slate-800" />
                  </div>
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
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
            >
              {text.login}
            </button>
          ) : null
          }
        </div>
      </div>
    </nav>
  );
}
