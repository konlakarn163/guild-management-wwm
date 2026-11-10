"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Swords } from "lucide-react";
import { CatFace } from "@/components/public/cat-decor";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type { BuildOption } from "@/lib/types";

interface ProfileResponse {
  id: string;
  username: string;
  character_name?: string;
  build?: string;
  status?: string;
}

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

export function ProfileCard() {
  const [characterName, setCharacterName] = useState("");
  const [build, setBuild] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(true);
  const [isPendingLocked, setIsPendingLocked] = useState(false);
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingBuildOptions, setIsLoadingBuildOptions] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setMessageType("error");
          setMessage("Please login first");
          setIsLoadingBuildOptions(false);
          return;
        }

        const [profile, guildInfo] = await Promise.all([
          apiFetch<ProfileResponse>("/api/profile/me", { token }),
          apiFetch<PublicGuildResponse>("/api/public/guild"),
        ]);

        setProfileStatus(profile.status);
        setCharacterName(profile.character_name ?? "");
        setBuild(profile.build ?? "");
        setIsEditMode(profile.status !== "ACTIVE");
        setIsPendingLocked(Boolean(profile.status === "PENDING" && profile.character_name && profile.build));

        const options = guildInfo.build_options ?? [];
        setBuildOptions(options);
        if (profile.build && options.length > 0 && !options.some((item) => item.label === profile.build)) {
          
          setBuildOptions((prev) => [
            {
              label: profile.build as string,
              color: "#94a3b8",
            },
            ...prev,
          ]);
        }
      } catch (error) {
        setMessageType("error");
        setMessage(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setIsLoadingBuildOptions(false);
        setIsInitialLoading(false);
      }
    };

    void load();
  }, []);

  const onSave = async () => {
    setMessage(null);

    if (isPendingLocked) {
      setMessageType("error");
      setMessage("Your profile is pending admin approval. You cannot edit until approved.");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setMessageType("error");
        setMessage("Please login first");
        return;
      }

      await apiFetch<ProfileResponse>("/api/profile/me", {
        method: "PUT",
        token,
        body: JSON.stringify({ character_name: characterName, build }),
      });

      const refreshed = await apiFetch<ProfileResponse>("/api/profile/me", { token });
      setProfileStatus(refreshed.status);

      if (refreshed.status === "PENDING") {
        setIsPendingLocked(true);
      }

      if (refreshed.status === "ACTIVE") {
        setIsEditMode(false);
      }

      setMessageType("success");
      setMessage("Profile updated");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Failed to save profile");
    }
  };

  const statusText = profileStatus ?? "UNKNOWN";
  const showForm = isEditMode || profileStatus !== "ACTIVE";
  const isFormDisabled = isPendingLocked;
  const selectedBuildOption = buildOptions.find((option) => option.label === build);

  if (isInitialLoading) {
    return (
      <SectionCard
        cat
        title="Profile"
        subtitle="Character Name / Build จะถูกใช้ในการจัดทีม Guild War และต้องอัปเดตให้ตรงกับในเกม"
      >
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      cat
      title="Profile"
      subtitle="Character Name / Build จะถูกใช้ในการจัดทีม Guild War และต้องอัปเดตให้ตรงกับในเกม"
    >
      {!showForm ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10">
              <CatFace mood={profileStatus === "ACTIVE" ? "success" : "warning"} className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate font-semibold text-slate-100">{characterName || "-"}</span>
                {build ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      borderColor: `${selectedBuildOption?.color ?? "#94a3b8"}66`,
                      color: selectedBuildOption?.color ?? "#94a3b8",
                      backgroundColor: `${selectedBuildOption?.color ?? "#94a3b8"}1A`,
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: selectedBuildOption?.color ?? "#94a3b8" }}
                    />
                    {build}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">ยังไม่ได้เลือก Build</span>
                )}
              </p>
              <p className="text-xs text-slate-400">Status: {statusText}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setIsEditMode(true)}>
              แก้ไข Profile
            </Button>
          </div>
          {message ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                messageType === "success"
                  ? "border border-emerald-500/30 bg-emerald-900/20 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-900/20 text-rose-300"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
      <form className="grid gap-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-300">Character Name</span>
          <Input
            className="h-9 rounded-lg"
            placeholder="AeronWind"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
            disabled={isFormDisabled}
          />
          <p className="text-xs text-slate-400">ใส่ชื่อตัวละครหลักที่ใช้จริงในเกม</p>
        </label>

        <label className="space-y-1">
          <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Swords className="h-4 w-4 text-amber-300" />
              Build / Weapon
            </span>
           
          </span>
          {isLoadingBuildOptions ? (
            <Skeleton className="h-9 w-full rounded-lg" />
          ) : (
            <Select value={build || undefined} onValueChange={setBuild} disabled={isFormDisabled}>
              <SelectTrigger className="h-9 rounded-lg">
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
          )}

         
        </label>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-xs text-slate-300">
          <p className="font-medium text-slate-200">ข้อมูลที่ใช้จัดทีม Guild War</p>
          <p className="mt-1 text-slate-400">
            Character Name และ Build / Weapon จะถูกใช้ในหน้า Team Builder และ War Registration เพื่อจัดทีมอัตโนมัติ
          </p>
          <p className="mt-1 text-slate-400">Account Status: {statusText}</p>
          {build ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-900/20 px-2 py-0.5 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedBuildOption?.color ?? "#94a3b8" }}
              />
              Selected: {build}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={() => void onSave()}
          className="h-9 rounded-lg"
          disabled={isFormDisabled}
        >
          {isFormDisabled ? "Waiting for Admin Approval" : "Save Profile"}
        </Button>

        {profileStatus === "ACTIVE" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditMode(false)}
            className="h-9 rounded-lg"
          >
            ยกเลิกการแก้ไข
          </Button>
        ) : null}

        {message ? (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              messageType === "success"
                ? "border border-emerald-500/30 bg-emerald-900/20 text-emerald-300"
                : "border border-rose-500/30 bg-rose-900/20 text-rose-300"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
      ) : null}
    </SectionCard>
  );
}