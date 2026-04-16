"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/components/providers/language-provider";
import type { GuildInfo } from "@/lib/types";
import { AuthActions } from "@/components/public/auth-actions";
import { CornerWidget } from "@/components/public/corner-widget";
import { apiFetch } from "@/lib/api";
import { getAccessToken, signOut } from "@/lib/client-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/types";

interface HeroBannerProps {
  guildInfo: GuildInfo;
}

export function HeroBanner({ guildInfo }: HeroBannerProps) {
  const { language } = useLanguage();
  const supabaseReady = isSupabaseConfigured();
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const videoRef = useRef<HTMLVideoElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cornerTLRef = useRef<HTMLDivElement>(null);
  const cornerTRRef = useRef<HTMLDivElement>(null);
  const cornerBLRef = useRef<HTMLDivElement>(null);
  const cornerBRRef = useRef<HTMLDivElement>(null);

  const copy = {
    th: {
      eyebrow: "Where Winds Meet · Thai Guild",
      description: "กิลด์ไทยสำหรับผู้เล่นที่ต้องการลง Guild War, กิจกรรมประจำสัปดาห์ และคอนเทนต์ทีมทั่วไป",
      guildId: "Guild ID",
      activeMembers: "สมาชิกที่พร้อมลุย",
      discordInvite: "ดูตารางกิจกรรม",
      scroll: "เลื่อนลงเพื่อดูตารางกิจกรรม",
      profile: "โปรไฟล์",
      editProfile: "แก้ไขโปรไฟล์ตัวละคร",
      dashboard: "สมาชิก",
      admin: "แอดมิน",
      logout: "ออกจากระบบ",
      login: "เข้าสู่ระบบ",
    },
    en: {
      eyebrow: "Where Winds Meet · Thai Guild",
      description: "A Thai guild for players who want coordinated Guild War, weekly party content, and scheduled team-based progression.",
      guildId: "Guild ID",
      activeMembers: "Active Members",
      discordInvite: "View Schedule",
      scroll: "Scroll down for the schedule",
      profile: "Profile",
      editProfile: "Edit Character Profile",
      dashboard: "Dashboard",
      admin: "Admin",
      logout: "Logout",
      login: "Login",
    },
  } as const;

  const text = copy[language];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        bgRef.current,
        { scale: 1.08, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2.2, ease: "power2.out" },
        0,
      );

      const corners = [cornerTLRef.current, cornerTRRef.current, cornerBLRef.current, cornerBRRef.current];
      gsap.set(corners, { width: 0, height: 0 });
      tl.to(corners, { width: 48, height: 48, duration: 0.9, ease: "expo.out", stagger: 0.07 }, 0.7);

      tl.fromTo(labelRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 }, 1.0);
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 50, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: "expo.out" },
        1.2,
      );
      tl.fromTo(
        dividerRef.current,
        { opacity: 0, scaleX: 0.4 },
        { opacity: 1, scaleX: 1, duration: 0.7, transformOrigin: "center" },
        1.7,
      );
      tl.fromTo(descRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.65 }, 2.0);
      tl.fromTo(ctaRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, 2.2);
      tl.fromTo(badgeRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 2.4);

      tl.fromTo(scrollRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.6);
      tl.add(() => {
        gsap.to(scrollRef.current, {
          y: 7,
          duration: 1.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      gsap.to(bgRef.current, {
        yPercent: 10,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      gsap.to(overlayRef.current, {
        opacity: 0.75,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldLoadVideo) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoadVideo]);

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
    if (!supabaseReady) {
      return;
    }

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

  const onVideoReady = () => {
    setIsVideoReady(true);
    void videoRef.current?.play().catch(() => {
      // Keep the image fallback if autoplay is blocked.
    });
  };

  return (
    <section id="top" ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      <div ref={bgRef} className="absolute inset-0 overflow-hidden" style={{ opacity: 0 }}>
        <Image
          src="/images/bg.jpeg"
          alt="Guild Banner Background"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      </div>

      {shouldLoadVideo ? (
        <div
          className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
            isVideoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover object-center"
            src="/video/banner-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onCanPlayThrough={onVideoReady}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div ref={overlayRef} className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-black/30 via-transparent to-black/30" />

      <CornerWidget inverted hideOnScroll />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p
          ref={labelRef}
          className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-white/55"
          style={{ fontFamily: "var(--font-body)", opacity: 0 }}
        >
          {text.eyebrow}
        </p>

        <h1
          ref={titleRef}
          className="mt-3 leading-none text-white"
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "clamp(4.5rem, 12vw, 10rem)",
            textShadow: "0 4px 40px rgba(0,0,0,0.6)",
            opacity: 0,
          }}
        >
          {guildInfo.name}
        </h1>

        <div ref={dividerRef} className="mt-4 flex items-center gap-5" style={{ opacity: 0 }}>
          <div className="flex items-center gap-2">
            <span className="block h-px w-8 bg-white/40" />
            <span className="block h-px w-16 bg-white/25" />
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <svg width="14" height="14" viewBox="0 0 14 14" className="opacity-60">
              <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="currentColor" strokeWidth="1" />
              <polygon points="7,3.5 10.5,7 7,10.5 3.5,7" fill="currentColor" opacity="0.4" />
            </svg>
            <span
              className="text-[0.7rem] uppercase tracking-[0.45em] text-white/65"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {text.guildId} &nbsp;:&nbsp; 10068118
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" className="opacity-60">
              <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="currentColor" strokeWidth="1" />
              <polygon points="7,3.5 10.5,7 7,10.5 3.5,7" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="block h-px w-16 bg-white/25" />
            <span className="block h-px w-8 bg-white/40" />
          </div>
        </div>

        <p
          ref={descRef}
          className="mt-5 max-w-md text-sm leading-7 text-white/55"
          style={{ fontFamily: "var(--font-body)", opacity: 0 }}
        >
          {text.description}
        </p>

        <div ref={ctaRef} className="mt-8 flex flex-wrap items-center justify-center gap-4" style={{ opacity: 0 }}>
          <AuthActions variant="banner" />
          <a
            href="#schedule"
            className="inline-flex items-center gap-2 rounded-none border border-white/50 bg-transparent px-8 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white transition-all duration-200 hover:border-white hover:bg-white/10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor" opacity="0.7">
              <path d="M20.317 1.492A19.825 19.825 0 0015.19-.001c-.24.417-.46.853-.657 1.298a18.33 18.33 0 00-5.063 0A13.45 13.45 0 008.81 0 19.757 19.757 0 003.68 1.495C.533 6.198-.32 10.787.1 15.315a19.876 19.876 0 006.063 3.056 14.3 14.3 0 001.226-1.994 12.989 12.989 0 01-1.93-.927c.163-.118.322-.24.475-.364a14.153 14.153 0 0012.131 0c.155.126.314.247.476.364-.614.362-1.26.674-1.932.928a14.22 14.22 0 001.226 1.994 19.824 19.824 0 006.063-3.056c.497-5.188-.838-9.733-3.581-13.824zM8.02 12.56c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.427 2.157-2.427 1.2 0 2.186 1.094 2.157 2.427 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.957-2.427 2.157-2.427 1.2 0 2.186 1.094 2.157 2.427 0 1.334-.948 2.419-2.157 2.419z" />
            </svg>
            {text.discordInvite}
          </a>
        </div>

        <div
          ref={badgeRef}
          className="mt-7 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.4em] text-white/40"
          style={{ fontFamily: "var(--font-body)", opacity: 0 }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span>
            {guildInfo.memberCount} {text.activeMembers}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ opacity: 0 }}
      >
        <p
          className="text-[0.6rem] uppercase tracking-[0.5em] text-white/35"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {text.scroll}
        </p>
        <div className="h-6 w-px bg-linear-to-b from-white/30 to-transparent" />
      </div>

      <div ref={cornerTLRef} className="pointer-events-none absolute left-6 top-6 border-l border-t border-white/20" style={{ width: 0, height: 0 }} />
      <div ref={cornerTRRef} className="pointer-events-none absolute right-6 top-6 border-r border-t border-white/20" style={{ width: 0, height: 0 }} />
      <div ref={cornerBLRef} className="pointer-events-none absolute bottom-6 left-6 border-b border-l border-white/20" style={{ width: 0, height: 0 }} />
      <div ref={cornerBRRef} className="pointer-events-none absolute bottom-6 right-6 border-b border-r border-white/20" style={{ width: 0, height: 0 }} />
    </section>
  );
}
