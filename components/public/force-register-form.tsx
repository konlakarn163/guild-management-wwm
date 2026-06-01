"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { BuildOption, GuildWarRegistrationWindow } from "@/lib/types";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface OpenWindowsResponse {
  windows: GuildWarRegistrationWindow[];
}

const STORAGE_KEY = "force-register-form-v1";

const formatDayOption = (dayId: string) => {
  const [year, month, day] = dayId.split("-");
  return `${day}/${month}/${year.slice(2)} (${dayId})`;
};

export function ForceRegisterForm() {
  const [characterName, setCharacterName] = useState("");
  const [build, setBuild] = useState("");
  const [dayId, setDayId] = useState("");
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [openWindows, setOpenWindows] = useState<GuildWarRegistrationWindow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOpenDay = openWindows.length > 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as { characterName?: string; build?: string; dayId?: string };
      setCharacterName(parsed.characterName ?? "");
      setBuild(parsed.build ?? "");
      setDayId(parsed.dayId ?? "");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characterName,
        build,
        dayId,
      }),
    );
  }, [build, characterName, dayId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [guildData, windowData] = await Promise.all([
          apiFetch<PublicGuildResponse>("/api/public/guild"),
          apiFetch<OpenWindowsResponse>("/api/public/guild-war/windows/open"),
        ]);

        setBuildOptions(guildData.build_options ?? []);
        const windows = windowData.windows ?? [];
        setOpenWindows(windows);

        setDayId((prev) => {
          if (prev && windows.some((window) => window.day_id === prev)) {
            return prev;
          }

          return windows[0]?.day_id ?? "";
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load force register data");
      }
    };

    void load();
  }, []);

  const selectedBuildColor = useMemo(
    () => buildOptions.find((option) => option.label === build)?.color ?? "#94a3b8",
    [build, buildOptions],
  );

  const onSubmit = async () => {
    if (!characterName.trim()) {
      toast.error("Please enter character name");
      return;
    }

    if (!build.trim()) {
      toast.error("Please select build");
      return;
    }

    if (!dayId.trim()) {
      toast.error("Please select day");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/public/guild-war/force-register", {
        method: "POST",
        body: JSON.stringify({
          characterName: characterName.trim(),
          build: build.trim(),
          dayId,
        }),
      });

      toast.success("Force register completed. You are now in Pool.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to force register");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard
      title="Force Register"
      subtitle="กรณีเข้า Discord ไม่ได้ สามารถลงทะเบียนแทนได้ทันที ระบบจะส่งเข้าหน้า Pool ของวันนั้น"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Character Name</span>
          <Input
            className="h-11 rounded-xl"
            placeholder="AeronWind"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Build / Weapon</span>
          <Select value={build || undefined} onValueChange={setBuild}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select build / weapon" />
            </SelectTrigger>
            <SelectContent>
              {buildOptions.map((option, index) => (
                <SelectItem key={`${option.label}-${option.color}-${index}`} value={option.label}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-300">Registration Day</span>
          <Select value={dayId || undefined} onValueChange={setDayId} disabled={!hasOpenDay}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select open registration day" />
            </SelectTrigger>
            <SelectContent>
              {openWindows.map((window) => (
                <SelectItem key={window.id} value={window.day_id}>
                  {formatDayOption(window.day_id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasOpenDay ? <p className="text-xs text-amber-300">ยังไม่มีวันเปิดลงทะเบียนในตอนนี้</p> : null}
        </label>

        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-xs text-slate-300">
          <p className="font-medium text-slate-200">Preview</p>
          <p className="mt-1 text-slate-400">Character: {characterName || "-"}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-slate-400">
            Build:
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedBuildColor }} />
            {build || "-"}
          </p>
          <p className="mt-1 text-slate-400">Day: {dayId || "-"}</p>
        </div>

        <Button type="button" onClick={() => void onSubmit()} className="md:col-span-2 h-11 rounded-xl" disabled={isSubmitting || !hasOpenDay}>
          {isSubmitting ? "Registering…" : "Register To Pool"}
        </Button>
      </div>
    </SectionCard>
  );
}
