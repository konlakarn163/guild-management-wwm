"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { getAccessToken, getCurrentUser } from "@/lib/client-auth";
import { getRealtimeSocket } from "@/lib/realtime";
import type { BuildOption, GuildWarRegistration, UserRow } from "@/lib/types";
import { getCurrentWeekId } from "@/lib/week-id";

interface WarRegistrant {
  id: string;
  characterName: string;
  discordName: string;
  discordId: string;
  build: string;
}

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface WarRegistrationProps {
  canManageAll?: boolean;
}

export function WarRegistration({ canManageAll = false }: WarRegistrationProps) {
  const [registered, setRegistered] = useState(false);
  const [_registrants, setRegistrants] = useState<WarRegistrant[]>([]);
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [_expandedRegistrantId, _setExpandedRegistrantId] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [_message, setMessage] = useState<string | null>(null);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);
  const weekId = useMemo(() => getCurrentWeekId(), []);
  const weekRangeLabel = useMemo(() => {
    const [yearText, monthText, dayText] = weekId.split("-");
    const start = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
    start.setUTCDate(start.getUTCDate() + 6);
    const endYear = start.getUTCFullYear();
    const endMonth = String(start.getUTCMonth() + 1).padStart(2, "0");
    const endDay = String(start.getUTCDate()).padStart(2, "0");
    return `${weekId} - ${endYear}-${endMonth}-${endDay}`;
  }, [weekId]);

  const fetchRegistrationData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const me = await getCurrentUser();
    const list = await apiFetch<GuildWarRegistration[]>(`/api/guild-war/registrations/${weekId}`, { token });

    return {
      mapped: list.map((item) => ({
        id: item.id,
        characterName: item.users?.character_name ?? "Unknown Character",
        discordName: item.users?.username ?? "Unknown",
        discordId: item.users?.discord_id ?? "-",
        build: item.users?.build ?? "-",
      })),
      isRegistered: Boolean(me && list.some((item) => item.user_id === me.id)),
    };
  }, [weekId]);

  useEffect(() => {
    const loadBuildOptions = async () => {
      try {
        const guildInfo = await apiFetch<PublicGuildResponse>("/api/public/guild");
        setBuildOptions(guildInfo.build_options ?? []);
      } catch {
        setBuildOptions([]);
      }
    };

    void loadBuildOptions();
  }, []);

  const load = async () => {
    try {
      const payload = await fetchRegistrationData();
      if (!payload) {
        return;
      }

      setRegistrants(payload.mapped);
      setRegistered(payload.isRegistered);
    } finally {
      setIsLoadingRegistration(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const payload = await fetchRegistrationData();
        if (!payload) {
          return;
        }

        setRegistrants(payload.mapped);
        setRegistered(payload.isRegistered);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load registrations";
        setMessage(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingRegistration(false);
      }
    };

    void run();
  }, [fetchRegistrationData]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    socket.emit("guildWar:joinWeek", weekId);

    const onRegistrationsUpdated = (payload: { weekId: string }) => {
      if (payload.weekId !== weekId) {
        return;
      }

      void load();
    };

    socket.on("guildWar:registrationsUpdated", onRegistrationsUpdated);

    return () => {
      socket.off("guildWar:registrationsUpdated", onRegistrationsUpdated);
      socket.emit("guildWar:leaveWeek", weekId);
    };
  }, [weekId]);

  useEffect(() => {
    if (!canManageAll) {
      return;
    }

    const loadActiveUsers = async () => {
      try {
        setIsLoadingActiveUsers(true);
        const token = await getAccessToken();
        if (!token) {
          return;
        }

        const users = await apiFetch<UserRow[]>("/api/users?status=ACTIVE", { token });
        setActiveUsers(users);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load active users");
      } finally {
        setIsLoadingActiveUsers(false);
      }
    };

    void loadActiveUsers();
  }, [canManageAll]);

  const onRegister = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        const errorMessage = "Please login first";
        setMessage(errorMessage);
        toast.error(errorMessage);
        return;
      }

      await apiFetch("/api/guild-war/registrations", {
        method: "POST",
        token,
        body: JSON.stringify({ weekId }),
      });

      setMessage("Registered successfully");
      toast.success("Registered successfully");
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to register";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onCancel = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        const errorMessage = "Please login first";
        setMessage(errorMessage);
        toast.error(errorMessage);
        return;
      }

      await apiFetch(`/api/guild-war/registrations/${weekId}`, {
        method: "DELETE",
        token,
      });

      setMessage("Registration canceled");
      toast.success("Registration canceled");
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onAdminAdd = async () => {
    if (!selectedUserId) {
      const errorMessage = "Please select a member";
      setMessage(errorMessage);
      toast.error(errorMessage);
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        const errorMessage = "Please login first";
        setMessage(errorMessage);
        toast.error(errorMessage);
        return;
      }

      await apiFetch("/api/guild-war/registrations/admin", {
        method: "POST",
        token,
        body: JSON.stringify({ weekId, userId: selectedUserId }),
      });

      const selected = activeUsers.find((user) => user.id === selectedUserId);
      const successMessage = `Added ${selected?.character_name ?? selected?.username ?? "member"} to registration`;
      setMessage(successMessage);
      toast.success(successMessage);
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add member";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const getBuildColor = (build: string) => {
    return buildOptions.find((item) => item.label === build)?.color ?? "#94a3b8";
  };

  return (
    <SectionCard title="Guild War Registration" subtitle={`Week: ${weekRangeLabel}`}>
      {isLoadingRegistration ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void onRegister()}
            className="rounded-xl"
          >
            Register
          </Button>
          <Button
            type="button"
            onClick={() => void onCancel()}
            variant="outline"
            className="rounded-xl"
          >
            Cancel
          </Button>
          <span className="text-sm font-semibold text-slate-300">Status: {registered ? "Registered" : "Not registered"}</span>
        </div>
      )}

      {canManageAll ? (
        <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-200">Admin: Add member to this week</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:max-w-sm">
              {isLoadingActiveUsers ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <Select value={selectedUserId || undefined} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select ACTIVE member" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{user.character_name ?? user.username}</span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              borderColor: `${getBuildColor(user.build ?? "-")}66`,
                              color: getBuildColor(user.build ?? "-"),
                              backgroundColor: `${getBuildColor(user.build ?? "-")}1A`,
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getBuildColor(user.build ?? "-") }} />
                            {user.build ?? "-"}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="button" onClick={() => void onAdminAdd()} className="rounded-xl">
              Add To Register
            </Button>
          </div>
        </div>
      ) : null}

      {/* <ul className="mt-4 space-y-2">
        {registrants.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => setExpandedRegistrantId((prev) => (prev === user.id ? null : user.id))}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">{user.characterName}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{
                    borderColor: `${getBuildColor(user.build)}66`,
                    color: getBuildColor(user.build),
                    backgroundColor: `${getBuildColor(user.build)}1A`,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getBuildColor(user.build) }} />
                  {user.build}
                </span>
              </div>
              {expandedRegistrantId === user.id ? (
                <p className="mt-2 text-xs text-slate-400">Discord: {user.discordName} ({user.discordId})</p>
              ) : null}
            </button>
          </li>
        ))}
      </ul> */}
    </SectionCard>
  );
}