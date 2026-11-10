"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { toast } from "react-toastify";
import { PawPrint, SleepingCat } from "@/components/public/cat-decor";
import { TimeRangeSelect } from "@/components/dashboard/time-range-select";
import {
  DEFAULT_AVAILABLE_FROM,
  DEFAULT_AVAILABLE_UNTIL,
  formatTimeRange,
  normalizeTime,
} from "@/lib/war-time";
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

type AvailabilityDialogMode = "register" | "reserve" | "edit";

interface MyAvailability {
  from: string;
  until: string;
}

const DIALOG_TITLES: Record<AvailabilityDialogMode, string> = {
  register: "Register",
  reserve: "Register To Reserve",
  edit: "แก้ไขเวลา",
};

const formatDayTab = (dayId: string) => {
  const [year, month, day] = dayId.split("-");
  return `${day}/${month}/${year.slice(2)}`;
};

export function WarRegistration({ canManageAll = false }: WarRegistrationProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const [myAvailabilityByDay, setMyAvailabilityByDay] = useState<Record<string, MyAvailability>>({});
  const [dialogMode, setDialogMode] = useState<AvailabilityDialogMode | null>(null);
  const [draftFrom, setDraftFrom] = useState(DEFAULT_AVAILABLE_FROM);
  const [draftUntil, setDraftUntil] = useState(DEFAULT_AVAILABLE_UNTIL);
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

    const myAvailability: Record<string, MyAvailability> = {};
    if (me) {
      for (const window of windows) {
        const registrations = response.registrationsByDay?.[window.day_id] ?? [];
        const mine = registrations.find((item) => item.user_id === me.id);
        if (mine) {
          myAvailability[window.day_id] = {
            from: normalizeTime(mine.available_from, DEFAULT_AVAILABLE_FROM),
            until: normalizeTime(mine.available_until, DEFAULT_AVAILABLE_UNTIL),
          };
        }
      }
    }

    return {
      windows,
      myAvailability,
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const payload = await fetchRegistrationData();
      if (!payload) {
        return;
      }

      setOpenWindows(payload.windows);
      setMyAvailabilityByDay(payload.myAvailability);
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

  const openAvailabilityDialog = (mode: AvailabilityDialogMode) => {
    if (!selectedDayId) {
      toast.error("Please select registration day");
      return;
    }

    const current = myAvailabilityByDay[selectedDayId];
    setDraftFrom(mode === "edit" && current ? current.from : DEFAULT_AVAILABLE_FROM);
    setDraftUntil(mode === "edit" && current ? current.until : DEFAULT_AVAILABLE_UNTIL);
    setDialogMode(mode);
  };

  const onSubmitAvailability = async () => {
    if (!dialogMode || !selectedDayId) {
      return;
    }

    if (!draftFrom || !draftUntil || draftFrom >= draftUntil) {
      toast.error("เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const body = JSON.stringify({ dayId: selectedDayId, availableFrom: draftFrom, availableUntil: draftUntil });

      if (dialogMode === "edit") {
        await apiFetch("/api/guild-war/registrations/open/availability", { method: "PATCH", token, body });
        toast.success("อัปเดตเวลาแล้ว");
      } else if (dialogMode === "reserve") {
        await apiFetch("/api/guild-war/registrations/reserve", { method: "POST", token, body });
        toast.success("Registered to reserve successfully");
      } else {
        await apiFetch("/api/guild-war/registrations", { method: "POST", token, body });
        toast.success("Registered successfully");
      }

      setDialogMode(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register");
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

  const myAvailability = selectedDayId ? myAvailabilityByDay[selectedDayId] : undefined;
  const isRegisteredForSelectedDay = Boolean(myAvailability);
  const isRegisterActionDisabled = isSubmitting || isRegisteredForSelectedDay || !selectedDayId;

  return (
    <SectionCard
      cat
      title="War Registration"
      subtitle={weekRangeLabel ? `Week ${weekRangeLabel}` : "ยังไม่เปิดลงทะเบียน"}
    >
      {isLoadingRegistration ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : openWindows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-amber-200/15 px-4 py-6 text-center">
          <SleepingCat className="h-10 w-16 text-[#f28b3c]" />
          <p className="text-sm text-slate-400">ยังไม่เปิดลงทะเบียน รอแอดมินเปิดรอบก่อนนะ</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="วันวอ"
            className="grid gap-1 rounded-lg border border-slate-700/70 bg-slate-900/70 p-1 sm:max-w-sm"
            style={{ gridTemplateColumns: `repeat(${openWindows.length}, minmax(0, 1fr))` }}
          >
            {openWindows.map((window) => {
              const isSelected = selectedDayId === window.day_id;
              const isRegistered = Boolean(myAvailabilityByDay[window.day_id]);

              return (
                <button
                  key={window.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedDayId(window.day_id)}
                  className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition ${
                    isSelected ? "bg-[#f5c548] text-slate-950" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {formatDayTab(window.day_id)}
                  {isRegistered ? (
                    <PawPrint
                      className={`h-3.5 w-3.5 ${isSelected ? "text-slate-900" : "text-[#f28b3c]"}`}
                      aria-label="Registered"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div
            className={`flex-1 rounded-xl border p-4 ${
              isRegisteredForSelectedDay
                ? "border-amber-300/30 bg-amber-400/[0.06]"
                : "border-slate-700/70 bg-slate-900/40"
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <PawPrint className={`h-4 w-4 ${isRegisteredForSelectedDay ? "text-[#f28b3c]" : "text-slate-600"}`} />
              {isRegisteredForSelectedDay ? "ลงทะเบียนแล้ว" : "ยังไม่ได้ลงทะเบียน"}
            </p>
            {myAvailability ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-lg font-semibold text-amber-100">
                  <Clock className="h-4 w-4 text-amber-300" />
                  {formatTimeRange(myAvailability.from, myAvailability.until)}
                </span>
                <button
                  type="button"
                  onClick={() => openAvailabilityDialog("edit")}
                  disabled={isSubmitting}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-amber-200 underline-offset-2 transition hover:bg-amber-400/10 hover:underline"
                >
                  แก้ไขเวลา
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">กดลงทะเบียนแล้วเลือกช่วงเวลาที่อยู่</p>
            )}
          </div>

          {isRegisteredForSelectedDay ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onCancel()}
              disabled={isSubmitting || !selectedDayId}
              className="w-full rounded-lg border-rose-500/40 text-rose-200 hover:bg-rose-500/10 md:h-auto md:w-56"
            >
              ยกเลิกการลงทะเบียน
            </Button>
          ) : (
            <div className="grid gap-2 md:w-56">
              <Button
                type="button"
                onClick={() => openAvailabilityDialog("register")}
                className="w-full rounded-lg"
                disabled={isRegisterActionDisabled}
              >
                Register
              </Button>
              <Button
                type="button"
                onClick={() => openAvailabilityDialog("reserve")}
                variant="outline"
                className="w-full rounded-lg border-amber-300/50 text-amber-100 hover:bg-amber-400/10"
                disabled={isRegisterActionDisabled}
              >
                Register To Reserve
              </Button>
            </div>
          )}
          </div>

          {canManageAll ? (
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Admin • เพิ่มสมาชิก</p>
              <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 sm:w-80">
              {isLoadingActiveUsers ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                <Select value={selectedUserId || undefined} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="เลือกสมาชิก ACTIVE" />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => void onAdminAdd()}
                className="w-full rounded-lg sm:w-auto"
                disabled={!selectedDayId || !selectedUserId}
              >
                Add To Register
              </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {dialogMode
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) setDialogMode(null);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="war-availability-title"
                className="w-full max-w-md rounded-md border border-amber-300/20 bg-[#07101c] p-5 shadow-2xl"
              >
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 shrink-0 text-amber-300" size={20} aria-hidden="true" />
                  <div>
                    <h3 id="war-availability-title" className="text-lg font-semibold text-white">
                      {DIALOG_TITLES[dialogMode]}
                      {selectedDayId ? ` • ${formatDayTab(selectedDayId)}` : ""}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">เลือกช่วงเวลาที่นุดจะเล่น</p>
                  </div>
                </div>
                <TimeRangeSelect
                  className="mt-4"
                  from={draftFrom}
                  until={draftUntil}
                  onChange={(from, until) => {
                    setDraftFrom(from);
                    setDraftUntil(until);
                  }}
                />
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogMode(null)} disabled={isSubmitting}>
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onSubmitAvailability()}
                    disabled={isSubmitting || !draftFrom || !draftUntil}
                  >
                    {isSubmitting ? "กำลังบันทึก..." : "ยืนยัน"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </SectionCard>
  );
}
