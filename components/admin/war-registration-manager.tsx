"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Calendar } from "@/components/ui/calendar";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type {
  BuildOption,
  GuildWarCleanupPreviousMonthsResponse,
  GuildWarRegistration,
  GuildWarRegistrationWindow,
  GuildWarRegistrationWindowDetails,
} from "@/lib/types";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface TeamMemberEntry {
  key: string;
  characterName: string;
  build: string;
  registrationIndex: number;
}

const TEAM_NAMES = ["Team 1", "Team 2", "Reserve"] as const;

function formatDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatPickerDate(date?: Date) {
  if (!date) {
    return "Pick a Saturday or Sunday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function RegistrationGroup({
  title,
  members,
  getBuildColor,
}: {
  title: string;
  members: TeamMemberEntry[];
  getBuildColor: (build: string) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">{members.length}</span>
      </div>

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-400">No members</p>
      ) : (
        <div className="grid gap-2">
          {members.map((member, index) => (
            <div
              key={`${title}-${member.key}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-semibold text-slate-100">
                {title === "Pool" ? `${index + 1}. ` : ""}
                {member.characterName}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{
                  borderColor: `${getBuildColor(member.build)}66`,
                  color: getBuildColor(member.build),
                  backgroundColor: `${getBuildColor(member.build)}1A`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getBuildColor(member.build) }} />
                {member.build}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WarRegistrationManager() {
  const [windows, setWindows] = useState<GuildWarRegistrationWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaningRegistrations, setIsCleaningRegistrations] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedWindowDetails, setSelectedWindowDetails] = useState<GuildWarRegistrationWindowDetails | null>(null);
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);

  const loadWindows = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const data = await apiFetch<GuildWarRegistrationWindow[]>("/api/guild-war/windows", { token });
      setWindows(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load windows");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWindows();
  }, [loadWindows]);

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

  const getBuildColor = (build: string) => {
    return buildOptions.find((item) => item.label === build)?.color ?? "#94a3b8";
  };

  const handleCreate = async () => {
    if (!selectedDate) {
      toast.error("Please select a Saturday or Sunday");
      return;
    }
    if (!isWeekend(selectedDate)) {
      toast.error("Only Saturday or Sunday can be selected");
      return;
    }

    setIsCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      const dayId = `${y}-${m}-${d}`;

      await apiFetch("/api/guild-war/windows", {
        method: "POST",
        token,
        body: JSON.stringify({ dayId }),
      });

      toast.success(`Window created for ${dayId}`);
      setSelectedDate(undefined);
      await loadWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create window");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpen = async (id: string) => {
    setActionLoading(`${id}_open`);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await apiFetch(`/api/guild-war/windows/${id}/open`, { method: "POST", token });
      toast.success("Window opened");
      await loadWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open window");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string) => {
    setActionLoading(`${id}_close`);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await apiFetch(`/api/guild-war/windows/${id}/close`, { method: "POST", token });
      toast.success("Window closed");
      await loadWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close window");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewRegistrants = async (id: string) => {
    setDetailsLoadingId(id);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const details = await apiFetch<GuildWarRegistrationWindowDetails>(`/api/guild-war/windows/${id}/details`, { token });
      setSelectedWindowDetails(details);
      setIsDetailsOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load registrants");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const handleDelete = async (id: string, dayId: string) => {
    const confirmed = window.confirm(
      `Delete registration window for ${dayId}? This will also delete all registrations and team assignments for that day.`,
    );
    if (!confirmed) {
      return;
    }

    setActionLoading(`${id}_delete`);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const result = await apiFetch<{ deletedRegistrationsCount?: number; deletedTeamCount?: number }>(`/api/guild-war/windows/${id}`, {
        method: "DELETE",
        token,
      });

      if (selectedWindowDetails?.window.id === id) {
        setIsDetailsOpen(false);
        setSelectedWindowDetails(null);
      }

      toast.success(
        `Window deleted • removed ${result.deletedRegistrationsCount ?? 0} registrations and ${result.deletedTeamCount ?? 0} teams`,
      );
      await loadWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete window");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupOldRegistrations = async () => {
    const confirmed = window.confirm(
      "Delete previous months registrations and old existing windows? This will also remove related team assignments. This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setIsCleaningRegistrations(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const result = await apiFetch<GuildWarCleanupPreviousMonthsResponse>(
        "/api/guild-war/registrations/cleanup/previous-months",
        { method: "DELETE", token },
      );

      setIsDetailsOpen(false);
      setSelectedWindowDetails(null);
      await loadWindows();

      toast.success(
        `Deleted ${result.deletedCount} registrations, ${result.deletedTeamCount} teams, and ${result.deletedWindowCount} windows before ${result.cutoffDate}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clean old registrations");
    } finally {
      setIsCleaningRegistrations(false);
    }
  };

  const openCount = windows.filter((w) => w.is_open).length;

  const groupedDetails = useMemo(() => {
    if (!selectedWindowDetails) {
      return null;
    }

    const uniqueRegistrations: TeamMemberEntry[] = [];
    const memberByKey = new Map<string, TeamMemberEntry>();
    const seen = new Set<string>();

    selectedWindowDetails.registrations.forEach((registration: GuildWarRegistration) => {
      const key = registration.user_id;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      const entry = {
        key,
        characterName:
          registration.users?.character_name ??
          registration.users?.username ??
          `User-${registration.user_id.slice(0, 8)}`,
        build: registration.users?.build ?? "-",
        registrationIndex: uniqueRegistrations.length + 1,
      };

      uniqueRegistrations.push(entry);
      memberByKey.set(key, entry);
    });

    const teams = {
      "Team 1": [] as TeamMemberEntry[],
      "Team 2": [] as TeamMemberEntry[],
      Reserve: [] as TeamMemberEntry[],
    };

    selectedWindowDetails.teams.forEach((team) => {
      if (!TEAM_NAMES.includes(team.name as (typeof TEAM_NAMES)[number])) {
        return;
      }

      const uniqueMembers = new Map<string, TeamMemberEntry>();
      for (const member of team.team_members ?? []) {
        const existing = memberByKey.get(member.user_id) ?? {
          key: member.user_id,
          characterName: `User-${member.user_id.slice(0, 8)}`,
          build: "-",
          registrationIndex: Number.MAX_SAFE_INTEGER,
        };
        uniqueMembers.set(existing.key, existing);
      }

      teams[team.name as keyof typeof teams] = [...uniqueMembers.values()].sort(
        (left, right) => left.registrationIndex - right.registrationIndex,
      );
    });

    const assignedKeys = new Set(Object.values(teams).flat().map((member) => member.key));
    const pool = uniqueRegistrations
      .filter((member) => !assignedKeys.has(member.key))
      .sort((left, right) => left.registrationIndex - right.registrationIndex);

    return {
      pool,
      teams,
      totalRegistrations: uniqueRegistrations.length,
    };
  }, [selectedWindowDetails]);

  return (
    <>
      <SectionCard title="War Registration Windows" subtitle="Create and manage registration windows for Guild War days">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-200">Pick a Saturday or Sunday</p>
            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start rounded-xl text-left text-slate-100">
                  {formatPickerDate(selectedDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" sideOffset={8} collisionPadding={16} className="w-76 overflow-visible p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) {
                      setIsPickerOpen(false);
                    }
                  }}
                  disabled={(date) => !isWeekend(date)}
                  className="rounded-lg"
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              className="mt-3 w-full rounded-xl"
              onClick={() => void handleCreate()}
              disabled={isCreating || !selectedDate}
            >
              {isCreating ? "Creating…" : "Create Window"}
            </Button>
          </div>

          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-200">
                Existing Windows
                {openCount > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {openCount} open
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg border-rose-500/40 px-3 text-xs text-rose-300 hover:bg-rose-500/10"
                onClick={() => void handleCleanupOldRegistrations()}
                disabled={isCleaningRegistrations}
              >
                {isCleaningRegistrations ? "Cleaning…" : "Clean Previous Months Registrations"}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : windows.length === 0 ? (
              <p className="text-sm text-slate-400">No registration windows yet. Create one using the calendar.</p>
            ) : (
              <ul className="space-y-2">
                {windows.map((win) => {
                  const isOpen = win.is_open;
                  const isLoadingOpen = actionLoading === `${win.id}_open`;
                  const isLoadingClose = actionLoading === `${win.id}_close`;
                  const isLoadingDelete = actionLoading === `${win.id}_delete`;
                  const isLoadingDetails = detailsLoadingId === win.id;

                  return (
                    <li
                      key={win.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        isOpen ? "border-emerald-500/40 bg-emerald-500/10" : "border-slate-700/60 bg-slate-900/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{formatDateLabel(win.day_id)}</p>
                        <p className="text-xs text-slate-400">Week: {win.week_id}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/60 text-slate-400"
                          }`}
                        >
                          {isOpen ? "OPEN" : "CLOSED"}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg border-slate-600 px-3 text-xs text-slate-200 hover:bg-slate-800/70"
                          onClick={() => void handleViewRegistrants(win.id)}
                          disabled={isLoadingDetails}
                        >
                          {isLoadingDetails ? "Loading…" : "View Registrants"}
                        </Button>
                        {isOpen ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-lg border-rose-500/40 px-3 text-xs text-rose-300 hover:bg-rose-500/10"
                            onClick={() => void handleClose(win.id)}
                            disabled={isLoadingClose}
                          >
                            {isLoadingClose ? "Closing…" : "Close"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="h-8 rounded-lg px-3 text-xs"
                            onClick={() => void handleOpen(win.id)}
                            disabled={isLoadingOpen}
                          >
                            {isLoadingOpen ? "Opening…" : "Open"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg border-rose-500/40 px-3 text-xs text-rose-300 hover:bg-rose-500/10"
                          onClick={() => void handleDelete(win.id, win.day_id)}
                          disabled={isLoadingDelete}
                        >
                          {isLoadingDelete ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>

      {isDetailsOpen && selectedWindowDetails && groupedDetails ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-[#020817] shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">Existing Window</p>
                <h3 className="mt-1 text-xl font-black text-slate-100">{formatDateLabel(selectedWindowDetails.window.day_id)}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Week: {selectedWindowDetails.window.week_id} • Registrations: {groupedDetails.totalRegistrations}
                </p>
              </div>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <RegistrationGroup title="Pool" members={groupedDetails.pool} getBuildColor={getBuildColor} />
                <RegistrationGroup title="Team 1" members={groupedDetails.teams["Team 1"]} getBuildColor={getBuildColor} />
                <RegistrationGroup title="Team 2" members={groupedDetails.teams["Team 2"]} getBuildColor={getBuildColor} />
                <RegistrationGroup title="Reserve" members={groupedDetails.teams.Reserve} getBuildColor={getBuildColor} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
