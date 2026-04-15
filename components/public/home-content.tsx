"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { LandingReveal } from "@/components/public/landing-reveal";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { GuildInfo } from "@/lib/types";

interface HomeContentProps {
  guildInfo: GuildInfo;
}

const scheduleCopy = {
  th: {
    badge: "อิงตามเวลาไทย",
    title: "กิจกรรมประจำกิลด์",
    subtitle: "ตารางหลักสำหรับสมาชิก MeawMeaw เพื่อเช็กเวลาออนไลน์ร่วมกัน",
    ctaDashboard: "เข้าสู่ Member Dashboard",
    ctaAdmin: "เปิด Admin Panel",
    ctaGuide: "ดูตารางกิจกรรม",
    timezone: "เวลาทั้งหมดเป็น ICT (UTC+7)",
    registerWar: "ลงทะเบียน Guild War",
  },
  en: {
    badge: "Thai Time Reference",
    title: "Guild Activity Schedule",
    subtitle: "Core weekly schedule for MeawMeaw members, aligned around Thailand time.",
    ctaDashboard: "Enter Member Dashboard",
    ctaAdmin: "Open Admin Panel",
    ctaGuide: "View Schedule",
    timezone: "All times are listed in ICT (UTC+7)",
    registerWar: "Register Guild War",
  },
} as const;

const activities = [
  {
    image: "/images/guild-war.jpg",
    dayTh: "เสาร์ - อาทิตย์",
    dayEn: "Saturday - Sunday",
    time: "19:30 - 22:00",
    placeTh: "สนามรบกิลด์",
    placeEn: "Guild Battlefield",
    titleTh: "Guild War",
    titleEn: "Guild War",
    subtitleTh: "สงครามกิลด์",
    subtitleEn: "Guild Campaign",
  },
  {
    image: "/images/guild-party.jpg",
    dayTh: "อังคาร - เสาร์",
    dayEn: "Tuesday - Saturday",
    time: "20:30",
    placeTh: "ลานกิลด์หลัก",
    placeEn: "Guild Hall",
    titleTh: "Guild Party",
    titleEn: "Guild Party",
    subtitleTh: "ปาร์ตี้สำนัก",
    subtitleEn: "Night Gathering",
  },
  {
    image: "/images/hero-realm.jpg",
    dayTh: "ทุกวัน",
    dayEn: "Daily",
    time: "เริ่ม 19:30",
    placeTh: "หอทดสอบ",
    placeEn: "Realm Gate",
    titleTh: "Hero's Realm",
    titleEn: "Hero's Realm",
    subtitleTh: "แดนวีรชน",
    subtitleEn: "Realm Challenge",
  },
  {
    image: "/images/breaking-army.jpg",
    dayTh: "พฤหัสบดี - ศุกร์",
    dayEn: "Thursday - Friday",
    time: "20:00 - 22:00",
    placeTh: "แนวหน้า",
    placeEn: "Frontline",
    titleTh: "Breaking Army",
    titleEn: "Breaking Army",
    subtitleTh: "ทะลายทัพ",
    subtitleEn: "Siege Break",
  },
  {
    image: "/images/test-your-skill.jpg",
    dayTh: "พฤหัสบดี - ศุกร์",
    dayEn: "Thursday - Friday",
    time: "21:00",
    placeTh: "สนามฝึก",
    placeEn: "Arena",
    titleTh: "Test Your Skills",
    titleEn: "Test Your Skills",
  },
  {
    image: "/images/sword-trial.jpg",
    dayTh: "ทุกวัน",
    dayEn: "Daily",
    time: "เปิดตลอดเมื่อมีคนชวน",
    placeTh: "หอคมกระบี่",
    placeEn: "Blade Shrine",
    titleTh: "Sword Trial",
    titleEn: "Sword Trial",
  },
] as const;

export function HomeContent({ guildInfo }: HomeContentProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const supabaseReady = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const scheduleText = scheduleCopy[language];

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

  const onRegisterGuildWar = () => {
    if (!user) {
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
      <LandingReveal>
        <section
          id="schedule"
          className="relative overflow-hidden "
        >
          {/* <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.12),transparent_45%)]" /> */}

          <header data-reveal className="relative mb-5 border-b border-amber-100/12 pb-4 md:mb-6 md:pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-amber-200/75">{scheduleText.badge}</p>
                <h2 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-amber-50 md:text-4xl">
                  {scheduleText.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/85">{scheduleText.subtitle}</p>
              </div>

              <div className="rounded-md border border-amber-100/15 bg-amber-50/5 px-4 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.32em] text-amber-100/60">{scheduleText.timezone}</p>
                <p className="mt-1 text-sm font-semibold text-amber-100">
                  {guildInfo.name} · {guildInfo.code}
                </p>
              </div>
            </div>
          </header>

          <div data-reveal className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <article
                key={`${activity.titleEn}-${activity.time}`}
                className="group relative min-h-80 overflow-hidden border border-white/5 bg-[#01030a]"
              >
                <img
                  src={activity.image}
                  alt={language === "th" ? activity.titleTh : activity.titleEn}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,3,10,0.22),rgba(1,3,10,0.88)_52%,rgba(1,3,10,0.98)_100%)]" />

                {activity.titleEn === "Guild War" && user ? (
                  <div className="absolute left-5 top-5 z-10">
                    <button
                      type="button"
                      onClick={onRegisterGuildWar}
                      className="inline-flex items-center rounded-md border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/25 disabled:opacity-60"
                    >
                      {scheduleText.registerWar}
                    </button>
                  </div>
                ) : null}



                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-[2rem] font-semibold leading-none text-slate-50 md:text-[2.2rem]">
                    {language === "th" ? activity.titleTh : activity.titleEn}
                  </h3>
                  <p className="mt-1 text-xl italic leading-none text-[#f5c548]">
                    {language === "th" ? activity.dayTh : activity.dayEn}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
                    <span>{activity.time}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>


      </LandingReveal>
    </main>
  );
}
