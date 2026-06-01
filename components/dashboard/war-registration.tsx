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
import type { BuildOption, GuildWarRegistrationWindow, OpenGuildWarRegistrationResponse, UserRow } from "@/lib/types";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface WarRegistrationProps {
  canManageAll?: boolean;
}

const formatDayTab = (dayId: string) => {
  const [year, month, day] = dayId.split("-");
  return `${day}/${month}/${year.slice(2)}`;
};

export function WarRegistration({ canManageAll = false }: WarRegistrationProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const [registeredDayIds, setRegisteredDayIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);
  const [openWindows, setOpenWindows] = useState<GuildWarRegistrationWindow[]>([]);

  const selectedWindow = useMemo(
    () => openWindows.find((window) => window.day_id === selectedDayId) ?? null,
    [openWindows, selectedDayId],
  );

  const weekRangeLabel = useMemo(() => {
    if (!selectedWindow?.week_id) return null;
    const [yearText, monthText, dayText] = selectedWindow.week_id.split("-");
    const start = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
    start.setUTCDate(start.getUTCDate() + 6);
    const endYear = start.getUTCFullYear();
    const endMonth = String(start.getUTCMonth() + 1).padStart(2, "0");
    const endDay = String(start.getUTCDate()).padStart(2, "0");
    return `${selectedWindow.week_id} — ${endYear}-${endMonth}-${endDay}`;
  }, [selectedWindow?.week_id]);

  const fetchRegistrationData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const me = await getCurrentUser();
    const response = await apiFetch<OpenGuildWarRegistrationResponse>("/api/guild-war/registrations/open", { token });
    const windows = response.windows ?? [];

    const myDayIds = new Set<string>();
    if (me) {
      for (const window of windows) {
        const registrations = response.registrationsByDay?.[window.day_id] ?? [];
        if (registrations.some((item) => item.user_id === me.id)) {
          myDayIds.add(window.day_id);
        }
      }
    }

    return {
      windows,
      myDayIds,
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const payload = await fetchRegistrationData();
      if (!payload) {
        return;
      }

      setOpenWindows(payload.windows);
      setRegisteredDayIds(payload.myDayIds);
      setSelectedDayId((prev) => {
        if (prev && payload.windows.some((window) => window.day_id === prev)) {
          return prev;
        }

        return payload.windows[0]?.day_id ?? "";
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load registrations");
    } finally {
      setIsLoadingRegistration(false);
    }
  }, [fetchRegistrationData]);

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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getRealtimeSocket();

    const weekIds = [...new Set(openWindows.map((window) => window.week_id))];
    weekIds.forEach((weekId) => socket.emit("guildWar:joinWeek", weekId));

    const onRegistrationsUpdated = () => {
      void load();
    };

    socket.on("guildWar:registrationsUpdated", onRegistrationsUpdated);

    return () => {
      socket.off("guildWar:registrationsUpdated", onRegistrationsUpdated);
      weekIds.forEach((weekId) => socket.emit("guildWar:leaveWeek", weekId));
    };
  }, [load, openWindows]);

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
        toast.error(error instanceof Error ? error.message : "Failed to load active users");
      } finally {
        setIsLoadingActiveUsers(false);
      }
    };

    void loadActiveUsers();
  }, [canManageAll]);

  const onRegister = async () => {
    if (!selectedDayId) {
      toast.error("Please select registration day");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      await apiFetch("/api/guild-war/registrations", {
        method: "POST",
        token,
        body: JSON.stringify({ dayId: selectedDayId }),
      });

      toast.success("Registered successfully");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegisterToReserve = async () => {
    if (!selectedDayId) {
      toast.error("Please select registration day");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      await apiFetch("/api/guild-war/registrations/reserve", {
        method: "POST",
        token,
        body: JSON.stringify({ dayId: selectedDayId }),
      });

      toast.success("Registered to reserve successfully");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register to reserve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = async () => {
    if (!selectedDayId) {
      toast.error("Please select registration day");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      await apiFetch("/api/guild-war/registrations/open", {
        method: "DELETE",
        token,
        body: JSON.stringify({ dayId: selectedDayId }),
      });

      toast.success("Registration canceled");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAdminAdd = async () => {
    if (!selectedUserId) {
      toast.error("Please select a member");
      return;
    }

    if (!selectedDayId) {
      toast.error("Please select registration day");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      await apiFetch("/api/guild-war/registrations/admin", {
        method: "POST",
        token,
        body: JSON.stringify({ userId: selectedUserId, dayId: selectedDayId }),
      });

      const selected = activeUsers.find((user) => user.id === selectedUserId);
      toast.success(`Added ${selected?.character_name ?? selected?.username ?? "member"} to registration`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    }
  };

  const getBuildColor = (build: string) => {
    return buildOptions.find((item) => item.label === build)?.color ?? "#94a3b8";
  };

  const isRegisteredForSelectedDay = Boolean(selectedDayId && registeredDayIds.has(selectedDayId));
  const isRegisterActionDisabled = isSubmitting || isRegisteredForSelectedDay || !selectedDayId;

  return (
    <SectionCard
      title="Guild War Registration"
      subtitle={
        selectedWindow && weekRangeLabel
          ? `Day: ${selectedWindow.day_id}  •  Week: ${weekRangeLabel}`
          : "No registration window is currently open"
      }
    >
      {isLoadingRegistration ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ) : openWindows.length === 0 ? (
        <p className="text-sm text-slate-400">Registration is currently closed. Please wait for an admin to open a window.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-slate-950/30">
          <div className="overflow-x-auto rounded-t-2xl bg-slate-950 pt-2">
            <div className="flex min-w-max items-end gap-1 border-b border-slate-700/70">
              {openWindows.map((window) => {
                const isSelected = selectedDayId === window.day_id;
                const isRegistered = registeredDayIds.has(window.day_id);

                return (
                  <Button
                    key={window.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className={[
                      "-mb-px h-10 rounded-b-none rounded-t-xl border px-4 text-sm font-semibold transition-all",
                      isSelected
                        ? "border-slate-600 border-b-slate-950 bg-slate-950 text-amber-100 hover:bg-slate-950"
                        : "border-transparent bg-slate-900/70 text-slate-400 hover:bg-slate-900 hover:text-slate-100",
                    ].join(" ")}
                    onClick={() => setSelectedDayId(window.day_id)}
                  >
                    {formatDayTab(window.day_id)}
                    {isRegistered ? " • Registered" : ""}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="rounded-b-2xl rounded-tr-2xl border border-t-0 border-slate-700/50 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void onRegister()} className="rounded-xl" disabled={isRegisterActionDisabled}>
                Register
              </Button>
              <Button
                type="button"
                onClick={() => void onRegisterToReserve()}
                variant="outline"
                className="rounded-xl border-amber-300/60 text-amber-100 hover:bg-amber-400/10"
                disabled={isRegisterActionDisabled}
              >
                Register To Reserve
              </Button>
              <Button type="button" onClick={() => void onCancel()} variant="outline" className="rounded-xl" disabled={isSubmitting || !selectedDayId}>
                Cancel
              </Button>
              <span className="text-sm font-semibold text-slate-300">
                Status: {isRegisteredForSelectedDay ? "Registered" : "Not registered"}
              </span>
            </div>

            {canManageAll ? (
              <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-200">Admin: Add member to selected day</p>
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
                  <Button type="button" onClick={() => void onAdminAdd()} className="rounded-xl" disabled={!selectedDayId}>
                    Add To Register
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
