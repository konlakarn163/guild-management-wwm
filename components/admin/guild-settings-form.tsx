"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type { BuildOption, GuildSettings } from "@/lib/types";

const ALLOWED_BUILD_COLORS = ["#d65409", "#1253e0", "#167312"] as const;
const DEFAULT_BUILD_COLOR = ALLOWED_BUILD_COLORS[2];

const normalizeBuildColor = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  const match = ALLOWED_BUILD_COLORS.find((color) => color.toLowerCase() === normalized);
  return match ?? DEFAULT_BUILD_COLOR;
};

const defaultValues: GuildSettings = {
  name: "Where Winds Meet TH",
  code: "WWM-TH",
  description: "Competitive war guild",
  discord_invite: "",
  build_options: [
    { label: "HEAL", color: "#167312" },
    { label: "DPS", color: "#1253e0" },
    { label: "TANK", color: "#d65409" },
    { label: "Duo-Chain", color: DEFAULT_BUILD_COLOR },
    { label: "Fan-Tang", color: DEFAULT_BUILD_COLOR },
    { label: "Fan-Um", color: DEFAULT_BUILD_COLOR },
    { label: "Nameless", color: DEFAULT_BUILD_COLOR },
    { label: "Strategic", color: DEFAULT_BUILD_COLOR },
    { label: "TangDao", color: DEFAULT_BUILD_COLOR },
    { label: "Um-Chain", color: DEFAULT_BUILD_COLOR },
  ],
};

export function GuildSettingsForm() {
  const [settings, setSettings] = useState<GuildSettings>(defaultValues);
  const [newBuildOption, setNewBuildOption] = useState("");
  const [newBuildColor, setNewBuildColor] = useState<string>(DEFAULT_BUILD_COLOR);
  const [_message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          return;
        }

        const data = await apiFetch<GuildSettings>("/api/guild-settings", { token });
        setSettings({
          name: data.name,
          code: data.code,
          description: data.description,
          discord_invite: data.discord_invite ?? "",
          build_options: data.build_options?.length
            ? data.build_options.map((item) => ({
                label: item.label,
                color: normalizeBuildColor(item.color),
              }))
            : defaultValues.build_options,
        });
      } catch {
        setSettings(defaultValues);
      }
    };

    void load();
  }, []);

  const onSubmit = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      await apiFetch("/api/guild-settings", {
        method: "PUT",
        token,
        body: JSON.stringify({
          ...settings,
          build_options:
            settings.build_options
              ?.map((item) => ({
                label: item.label.trim(),
                color: normalizeBuildColor(item.color),
              }))
              .filter((item) => Boolean(item.label)) ?? [],
        }),
      });

      setMessage("Guild settings saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  const addBuildOption = () => {
    const normalized = newBuildOption.trim();
    if (!normalized) {
      return;
    }

    setSettings((prev) => {
      const list = prev.build_options ?? [];
      if (list.some((item) => item.label.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }

      const nextOption: BuildOption = {
        label: normalized,
        color: normalizeBuildColor(newBuildColor),
      };

      return { ...prev, build_options: [...list, nextOption] };
    });
    setNewBuildOption("");
    setNewBuildColor(DEFAULT_BUILD_COLOR);
  };

  const removeBuildOption = (optionLabel: string) => {
    setSettings((prev) => ({
      ...prev,
      build_options: (prev.build_options ?? []).filter((item) => item.label !== optionLabel),
    }));
  };

  return (
    <SectionCard title="Super Admin Controls" subtitle="Manage admin users and edit guild public profile">
      <div className="grid gap-3 md:grid-cols-2">
       
        <div className="md:col-span-2 space-y-2">
          <span className="text-sm font-medium text-slate-300">Build / Weapon Options</span>
          <div className="flex flex-wrap gap-2">
            {(settings.build_options ?? []).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => removeBuildOption(option.label)}
                className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 transition hover:bg-rose-900/35 hover:border-rose-500/40"
              >
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ backgroundColor: option.color || DEFAULT_BUILD_COLOR }}
                />
                {option.label} x
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="Add build / weapon"
              value={newBuildOption}
              onChange={(event) => setNewBuildOption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addBuildOption();
                }
              }}
            />
            <div className="flex min-w-48 items-center gap-2">
              <Select value={newBuildColor} onValueChange={setNewBuildColor}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_BUILD_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{color}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span
                className="inline-block h-8 w-8 rounded-md border border-slate-600"
                style={{ backgroundColor: newBuildColor }}
                aria-label={`Selected color ${newBuildColor}`}
                title={newBuildColor}
              />
            </div>
            <button
              type="button"
              onClick={addBuildOption}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onSubmit()}
        className="mt-3 rounded-xl bg-[#f5c548] px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Save Guild Info
      </button>
    </SectionCard>
  );
}