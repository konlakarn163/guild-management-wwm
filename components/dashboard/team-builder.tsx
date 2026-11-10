"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Clock, ExternalLink, Search, Send, Table2, Wand2, X } from "lucide-react";
import { TimeRangeSelect } from "@/components/dashboard/time-range-select";
import {
  DEFAULT_AVAILABLE_FROM,
  DEFAULT_AVAILABLE_UNTIL,
  coversTimeRange,
  formatTimeRange,
  getTimelinePosition,
  getTimelineTicks,
  isAvailabilityExpired,
  normalizeTime,
} from "@/lib/war-time";
import { toBlob } from "html-to-image";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { SleepingCat } from "@/components/public/cat-decor";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import { getRealtimeSocket } from "@/lib/realtime";
import type {
  BuildOption,
  GuildWarRegistrationWindow,
  GuildWarTeam,
  GuildWarTeamType,
  OpenGuildWarRegistrationResponse,
} from "@/lib/types";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface TeamMemberEntry {
  key: string;
  userId: string | null;
  characterName: string;
  build: string;
  registrationIndex: number;
  isForce: boolean;
  availableFrom: string;
  availableUntil: string;
}

interface TeamState {
  pool: TeamMemberEntry[];
  teams: Record<string, TeamMemberEntry[]>;
}

interface TeamDefinition extends GuildWarTeam {
  team_members?: {
    id: string;
    user_id?: string | null;
    registration_id?: string | null;
  }[];
}

const getTeamType = (team?: GuildWarTeam | null): GuildWarTeamType => {
  const type = team?.team_type;
  if (type === "atk" || type === "def") {
    return type;
  }

  return "other";
};

const sortTeamsByName = (teams: TeamDefinition[]) =>
  [...teams].sort((left, right) => left.name.localeCompare(right.name));

type SummaryStatusFilter = "all" | "present" | "expired";

interface PreviousAssignmentsResponse {
  previousDayId: string | null;
  assignments: Array<{
    teamId: string;
    userId: string | null;
    characterName: string | null;
    isForce: boolean;
  }>;
}

interface TeamBuilderProps {
  canDrag?: boolean;
}

const defaultState: TeamState = {
  pool: [],
  teams: {},
};

const formatDayTab = (dayId: string) => {
  const [year, month, day] = dayId.split("-");
  return `${day}/${month}/${year.slice(2)}`;
};

interface DraggableMemberProps {
  member: TeamMemberEntry;
  canManage: boolean;
  currentZone: string;
  zones: string[];
  onMove: (memberKey: string, targetZone: string) => void;
  getBuildColor: (build: string) => string;
  displayIndex?: number;
  itemClassName?: string;
  isInactive?: boolean;
}

function DraggableMember({
  member,
  canManage,
  currentZone,
  zones,
  onMove,
  getBuildColor,
  displayIndex,
  itemClassName,
  isInactive,
}: DraggableMemberProps) {
  const moveTargets = zones.filter((zone) => zone !== currentZone);

  const buildColor = getBuildColor(member.build);

  const content = (
    <div className={`flex items-center gap-3 ${isInactive ? "opacity-45" : ""}`}>
      {displayIndex ? (
        <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">
          {displayIndex}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-100">{member.characterName}</span>
          {member.isForce ? (
            <span className="shrink-0 rounded border border-amber-400/40 px-1 text-[9px] font-semibold leading-4 text-amber-200">
              FORCE
            </span>
          ) : null}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[11px] ${isInactive ? "text-rose-300 line-through" : "text-slate-500"}`}
        >
          <Clock className="h-3 w-3" />
          {formatTimeRange(member.availableFrom, member.availableUntil)}
        </span>
      </span>
      <span
        className="inline-flex max-w-[45%] shrink-0 items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold"
        style={{ color: buildColor, borderColor: `${buildColor}55`, backgroundColor: `${buildColor}14` }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: buildColor }} />
        <span className="truncate">{member.build}</span>
      </span>
    </div>
  );

  if (!canManage) {
    return (
      <div
        className={`cursor-default rounded-lg border px-3 py-2 ${itemClassName ?? "border-slate-700/80 bg-slate-900/80"}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`cursor-pointer rounded-lg border px-3 py-2 transition hover:border-amber-300/40 hover:bg-slate-800/80 ${itemClassName ?? "border-slate-700/80 bg-slate-900/80"}`}
        >
          {content}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
          Move {member.characterName}
        </p>
        <div className="grid gap-1">
          {moveTargets.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onMove(member.key, zone);
              }}
              className="rounded-md border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800/80"
            >
              Move to {zone}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DropZone({
  id,
  label,
  description,
  accentColor,
  members,
  totalCount,
  canManage,
  zones,
  onMove,
  getBuildColor,
  membersGridClassName,
  itemClassName,
  isMemberInactive,
}: {
  id: string;
  label: string;
  description?: string | null;
  accentColor?: string | null;
  members: TeamMemberEntry[];
  totalCount?: number;
  canManage: boolean;
  zones: string[];
  onMove: (memberKey: string, targetZone: string) => void;
  getBuildColor: (build: string) => string;
  membersGridClassName?: string;
  itemClassName?: string;
  isMemberInactive?: (member: TeamMemberEntry) => boolean;
}) {
  const zoneStyle = accentColor
    ? {
        borderColor: `${accentColor}66`,
        backgroundColor: `${accentColor}12`,
      }
    : undefined;

  return (
    <div
      className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-4 transition"
      style={zoneStyle}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {accentColor ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            ) : null}
            <span className="truncate">{label}</span>
          </h4>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-slate-800/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {totalCount ?? members.length}
        </span>
      </div>
      {members.length > 0 ? (
        <div className={membersGridClassName ?? "grid gap-2"}>
          {members.map((member, index) => (
            <DraggableMember
              key={member.key}
              member={member}
              canManage={canManage}
              currentZone={id}
              zones={zones}
              onMove={onMove}
              getBuildColor={getBuildColor}
              displayIndex={id === "pool" ? index + 1 : undefined}
              itemClassName={itemClassName}
              isInactive={isMemberInactive?.(member)}
            />
          ))}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">
          <SleepingCat className="h-5 w-8 shrink-0 text-amber-200/50" />
          ยังไม่มีสมาชิก
        </p>
      )}
    </div>
  );
}

function TeamBuilderSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-slate-700 bg-slate-950/70 p-4">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={`pool-skeleton-${index}`}
              className="h-10 w-full rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, zoneIndex) => (
          <div
            key={`team-zone-skeleton-${zoneIndex}`}
            className="rounded-md border border-slate-700 bg-slate-950/70 p-4"
          >
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <Skeleton
                  key={`team-member-skeleton-${zoneIndex}-${cardIndex}`}
                  className="h-10 w-full rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamBuilder({ canDrag = false }: TeamBuilderProps) {
  const [state, setState] = useState<TeamState>(defaultState);
  const [teamIdByName, setTeamIdByName] = useState<Record<string, string>>({});
  const [teamDefinitions, setTeamDefinitions] = useState<TeamDefinition[]>([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [hideExpired, setHideExpired] = useState(true);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryRangeFrom, setSummaryRangeFrom] = useState("");
  const [summaryRangeTo, setSummaryRangeTo] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatusFilter>("all");
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSendingCapture, setIsSendingCapture] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [openWindows, setOpenWindows] = useState<GuildWarRegistrationWindow[]>(
    [],
  );
  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestWeekIdRef = useRef<string | null>(null);
  const teamKeys = useMemo(
    () => teamDefinitions.map((team) => team.name),
    [teamDefinitions],
  );
  const zones = useMemo(() => ["pool", ...teamKeys], [teamKeys]);
  const normalizedSearch = search.trim().toLowerCase();
  const attackTeams = useMemo(
    () =>
      sortTeamsByName(
        teamDefinitions.filter((team) => getTeamType(team) === "atk"),
      ),
    [teamDefinitions],
  );
  const defenseTeams = useMemo(
    () =>
      sortTeamsByName(
        teamDefinitions.filter((team) => getTeamType(team) === "def"),
      ),
    [teamDefinitions],
  );
  const otherTeams = useMemo(
    () =>
      sortTeamsByName(
        teamDefinitions.filter((team) => getTeamType(team) === "other"),
      ),
    [teamDefinitions],
  );
  const attackRegisteredCount = useMemo(
    () =>
      attackTeams.reduce(
        (total, team) => total + (state.teams[team.name]?.length ?? 0),
        0,
      ),
    [attackTeams, state.teams],
  );
  const defenseRegisteredCount = useMemo(
    () =>
      defenseTeams.reduce(
        (total, team) => total + (state.teams[team.name]?.length ?? 0),
        0,
      ),
    [defenseTeams, state.teams],
  );
  const attackDefenseRegisteredCount =
    attackRegisteredCount + defenseRegisteredCount;

  const sortByRegistrationOrder = (members: TeamMemberEntry[]) => {
    return [...members].sort(
      (left, right) => left.registrationIndex - right.registrationIndex,
    );
  };


  const computeMovedState = (
    prev: TeamState,
    memberKey: string,
    targetZone: string,
  ): TeamState => {
    const movingMember =
      prev.pool.find((member) => member.key === memberKey) ||
      Object.values(prev.teams)
        .flat()
        .find((member) => member.key === memberKey);

    if (!movingMember) {
      return prev;
    }

    const next: TeamState = {
      pool: prev.pool.filter((member) => member.key !== memberKey),
      teams: Object.fromEntries(
        Object.entries(prev.teams).map(([team, members]) => [
          team,
          members.filter((member) => member.key !== memberKey),
        ]),
      ),
    };

    if (targetZone === "pool") {
      next.pool = sortByRegistrationOrder([...next.pool, movingMember]);
    } else {
      next.teams[targetZone] = [
        ...(next.teams[targetZone] ?? []),
        movingMember,
      ];
    }

    return next;
  };

  const syncTeamIds = async (token: string, dayId: string) => {
    const teams = await apiFetch<TeamDefinition[]>(
      `/api/teams?dayId=${encodeURIComponent(dayId)}`,
      { token },
    );
    const mapping: Record<string, string> = {};

    for (const team of teams) {
      mapping[team.name] = team.id;
    }

    setTeamIdByName(mapping);
    setTeamDefinitions(teams);
    return { mapping, teams };
  };

  const persistTeams = async (nextState: TeamState, teamNames: string[]) => {
    try {
      const token = await getAccessToken();
      if (!token || !selectedDayId) {
        return;
      }

      const ids = Object.keys(teamIdByName).length
        ? teamIdByName
        : (await syncTeamIds(token, selectedDayId)).mapping;

      for (const teamName of teamNames) {
        const teamId = ids[teamName];
        if (!teamId) {
          continue;
        }

        const registrationIds = [
          ...new Set(
            (nextState.teams[teamName] ?? []).map((member) => member.key),
          ),
        ];
        await apiFetch(`/api/teams/${teamId}/members`, {
          method: "PUT",
          token,
          body: JSON.stringify({ dayId: selectedDayId, registrationIds }),
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save team changes",
      );
    }
  };

  const refreshPoolFromRegistrants = useCallback(async () => {
    try {
      setIsLoadingPool(true);

      const token = await getAccessToken();
      if (!token) {
        return;
      }

      const openData = await apiFetch<OpenGuildWarRegistrationResponse>(
        "/api/guild-war/registrations/open",
        { token },
      );
      const windows = openData.windows ?? [];
      setOpenWindows(windows);

      const targetDayId =
        selectedDayId &&
        windows.some((window) => window.day_id === selectedDayId)
          ? selectedDayId
          : (windows[0]?.day_id ?? "");

      setSelectedDayId(targetDayId);

      if (!targetDayId) {
        latestWeekIdRef.current = null;
        setState({ pool: [], teams: {} });
        setTeamIdByName({});
        setTeamDefinitions([]);
        return;
      }

      const targetWindow =
        windows.find((window) => window.day_id === targetDayId) ?? null;
      latestWeekIdRef.current = targetWindow?.week_id ?? null;

      const list = openData.registrationsByDay?.[targetDayId] ?? [];
      const { mapping, teams } = await syncTeamIds(token, targetDayId);

      const uniqueMembers: TeamMemberEntry[] = [];
      const memberByKey = new Map<string, TeamMemberEntry>();

      for (const item of list) {
        const key = item.id;
        if (!memberByKey.has(key)) {
          const isForce = Boolean(item.is_force);
          const characterName =
            item.character_name ??
            item.users?.character_name ??
            item.users?.username ??
            `User-${String(item.user_id ?? item.id).slice(0, 8)}`;
          const build = item.build ?? item.users?.build ?? "-";
          const entry = {
            key,
            userId: item.user_id ?? null,
            characterName,
            build,
            registrationIndex: uniqueMembers.length + 1,
            isForce,
            availableFrom: normalizeTime(item.available_from, DEFAULT_AVAILABLE_FROM),
            availableUntil: normalizeTime(item.available_until, DEFAULT_AVAILABLE_UNTIL),
          };
          uniqueMembers.push(entry);
          memberByKey.set(key, entry);
        }
      }

      const persistedTeams: Record<string, TeamMemberEntry[]> = {};

      for (const team of teams) {
        mapping[team.name] = team.id;
        const rawMembers = team.team_members ?? [];
        const picked = rawMembers
          .map((member) => {
            if (member.registration_id) {
              return memberByKey.get(member.registration_id) ?? null;
            }

            if (!member.user_id) {
              return null;
            }
            return (
              uniqueMembers.find((entry) => entry.userId === member.user_id) ??
              null
            );
          })
          .filter((member): member is TeamMemberEntry => Boolean(member));

        const deduped = [
          ...new Map(picked.map((member) => [member.key, member])).values(),
        ];
        persistedTeams[team.name] = deduped;
      }

      setTeamIdByName(mapping);
      setTeamDefinitions(teams);

      setState(() => {
        const assigned = new Set(
          Object.values(persistedTeams)
            .flat()
            .map((member) => member.key),
        );
        return {
          pool: sortByRegistrationOrder(
            uniqueMembers.filter((member) => !assigned.has(member.key)),
          ),
          teams: persistedTeams,
        };
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load registrants",
      );
    } finally {
      setIsLoadingPool(false);
    }
  }, [selectedDayId]);

  useEffect(() => {
    const loadBuildOptions = async () => {
      try {
        const guildInfo =
          await apiFetch<PublicGuildResponse>("/api/public/guild");
        setBuildOptions(guildInfo.build_options ?? []);
      } catch {
        setBuildOptions([]);
      }
    };

    void loadBuildOptions();
  }, []);

  useEffect(() => {
    void refreshPoolFromRegistrants();
  }, [refreshPoolFromRegistrants]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const weekId = latestWeekIdRef.current;

    if (weekId) {
      socket.emit("guildWar:joinWeek", weekId);
    }

    const onRegistrationsUpdated = (_payload: {
      weekId: string;
      dayId?: string;
    }) => {
      void refreshPoolFromRegistrants();
    };

    const onTeamMoved = (payload: {
      weekId: string;
      dayId?: string;
      memberKey: string;
      targetZone: string;
    }) => {
      if (
        !latestWeekIdRef.current ||
        payload.weekId !== latestWeekIdRef.current
      ) {
        return;
      }

      if (payload.dayId && selectedDayId && payload.dayId !== selectedDayId) {
        return;
      }

      applyMove(payload.memberKey, payload.targetZone);
    };

    socket.on("guildWar:registrationsUpdated", onRegistrationsUpdated);
    socket.on("guildWar:teamMoved", onTeamMoved);

    return () => {
      socket.off("guildWar:registrationsUpdated", onRegistrationsUpdated);
      socket.off("guildWar:teamMoved", onTeamMoved);
      if (weekId) {
        socket.emit("guildWar:leaveWeek", weekId);
      }
    };
  }, [refreshPoolFromRegistrants, selectedDayId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const isMemberExpired = useCallback(
    (member: TeamMemberEntry) =>
      Boolean(selectedDayId) &&
      isAvailabilityExpired(selectedDayId, member.availableUntil, now),
    [now, selectedDayId],
  );

  const isRangeFilterActive = Boolean(rangeFrom && rangeTo);

  const isMemberInactive = useCallback(
    (member: TeamMemberEntry) => {
      if (hideExpired && isMemberExpired(member)) {
        return true;
      }

      if (
        isRangeFilterActive &&
        !coversTimeRange(member.availableFrom, member.availableUntil, rangeFrom, rangeTo)
      ) {
        return true;
      }

      return false;
    },
    [hideExpired, isMemberExpired, isRangeFilterActive, rangeFrom, rangeTo],
  );

  const hiddenPoolCount = useMemo(
    () => state.pool.filter(isMemberInactive).length,
    [isMemberInactive, state.pool],
  );

  const filteredPool = useMemo(
    () =>
      sortByRegistrationOrder(
        state.pool.filter((member) => {
          if (isMemberInactive(member)) {
            return false;
          }
          const haystack =
            `${member.characterName} ${member.build}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        }),
      ),
    [isMemberInactive, normalizedSearch, state.pool],
  );

  const zoneByMemberKey = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const member of state.pool) {
      mapping.set(member.key, "Pool");
    }
    for (const [teamName, members] of Object.entries(state.teams)) {
      for (const member of members) {
        mapping.set(member.key, teamName);
      }
    }
    return mapping;
  }, [state.pool, state.teams]);

  const summaryBaseRows = useMemo(() => {
    const all = [
      ...state.pool,
      ...Object.values(state.teams).flat(),
    ];
    const unique = [...new Map(all.map((member) => [member.key, member])).values()];
    const isSummaryRangeActive = Boolean(summaryRangeFrom && summaryRangeTo);

    return unique
      .filter(
        (member) =>
          !isSummaryRangeActive ||
          coversTimeRange(
            member.availableFrom,
            member.availableUntil,
            summaryRangeFrom,
            summaryRangeTo,
          ),
      )
      .sort(
        (left, right) =>
          left.availableFrom.localeCompare(right.availableFrom) ||
          left.availableUntil.localeCompare(right.availableUntil) ||
          left.registrationIndex - right.registrationIndex,
      );
  }, [state.pool, state.teams, summaryRangeFrom, summaryRangeTo]);

  const summaryExpiredCount = useMemo(
    () => summaryBaseRows.filter(isMemberExpired).length,
    [isMemberExpired, summaryBaseRows],
  );

  const summaryRows = useMemo(() => {
    if (summaryStatus === "all") {
      return summaryBaseRows;
    }

    const wantExpired = summaryStatus === "expired";
    return summaryBaseRows.filter((member) => isMemberExpired(member) === wantExpired);
  }, [isMemberExpired, summaryBaseRows, summaryStatus]);

  const summaryStatusOptions: Array<{ value: SummaryStatusFilter; label: string; count: number; activeClassName: string }> = [
    {
      value: "all",
      label: "ทั้งหมด",
      count: summaryBaseRows.length,
      activeClassName: "border-amber-300/50 bg-amber-400/15 text-amber-100",
    },
    {
      value: "present",
      label: "อยู่",
      count: summaryBaseRows.length - summaryExpiredCount,
      activeClassName: "border-emerald-400/50 bg-emerald-950/50 text-emerald-100",
    },
    {
      value: "expired",
      label: "ไม่อยู่",
      count: summaryExpiredCount,
      activeClassName: "border-rose-400/50 bg-rose-950/50 text-rose-100",
    },
  ];

  const timelineTicks = useMemo(() => getTimelineTicks(), []);

  const filteredTeams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.teams).map(([team, members]) => [
          team,
          members.filter((member) => {
            const haystack =
              `${member.characterName} ${member.build}`.toLowerCase();
            return haystack.includes(normalizedSearch);
          }),
        ]),
      ),
    [normalizedSearch, state.teams],
  );

  const applyMove = (memberKey: string, targetZone: string) => {
    setState((prev) => computeMovedState(prev, memberKey, targetZone));
  };

  const enqueuePersistTeams = (nextState: TeamState, teamNames: string[]) => {
    persistQueueRef.current = persistQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await persistTeams(nextState, teamNames);
      });
  };

  const moveMember = (memberKey: string, targetZone: string) => {
    setState((prev) => {
      const sourceZone = prev.pool.some((member) => member.key === memberKey)
        ? "pool"
        : Object.entries(prev.teams).find(([, members]) =>
            members.some((member) => member.key === memberKey),
          )?.[0] ?? null;
      const next = computeMovedState(prev, memberKey, targetZone);
      if (canDrag) {
        const zonesToPersist = [sourceZone, targetZone].filter(
          (zone): zone is string => Boolean(zone && zone !== "pool"),
        );
        if (zonesToPersist.length > 0) {
          enqueuePersistTeams(next, [...new Set(zonesToPersist)]);
        }
      }

      return next;
    });

    const socket = getRealtimeSocket();
    if (latestWeekIdRef.current) {
      socket.emit("guildWar:teamMoved", {
        weekId: latestWeekIdRef.current,
        dayId: selectedDayId,
        memberKey,
        targetZone,
      });
    }
  };

  const onAutoAssign = async () => {
    if (!selectedDayId) {
      return;
    }

    setIsAutoAssigning(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const result = await apiFetch<PreviousAssignmentsResponse>(
        `/api/guild-war/teams/previous-assignments?dayId=${encodeURIComponent(selectedDayId)}`,
        { token },
      );

      if (!result.previousDayId || result.assignments.length === 0) {
        toast.info("ไม่พบการจัดทีมรอบก่อนหน้า");
        return;
      }

      const teamNameById = new Map(teamDefinitions.map((team) => [team.id, team.name]));
      const teamByUserId = new Map<string, string>();
      const teamByName = new Map<string, string>();

      for (const assignment of result.assignments) {
        const teamName = teamNameById.get(assignment.teamId);
        if (!teamName) {
          continue;
        }
        if (assignment.userId) {
          teamByUserId.set(assignment.userId, teamName);
        } else if (assignment.characterName) {
          teamByName.set(assignment.characterName.trim().toLowerCase(), teamName);
        }
      }

      const moves = state.pool
        .map((member) => {
          const teamName = member.userId
            ? teamByUserId.get(member.userId)
            : teamByName.get(member.characterName.trim().toLowerCase());
          return teamName ? { memberKey: member.key, teamName } : null;
        })
        .filter((move): move is { memberKey: string; teamName: string } => Boolean(move));

      if (moves.length === 0) {
        toast.info(`ไม่มีคนใน Pool ที่ซ้ำกับรอบ ${formatDayTab(result.previousDayId)}`);
        return;
      }

      const next = moves.reduce(
        (current, move) => computeMovedState(current, move.memberKey, move.teamName),
        state,
      );
      setState(next);
      enqueuePersistTeams(next, [...new Set(moves.map((move) => move.teamName))]);

      const socket = getRealtimeSocket();
      if (latestWeekIdRef.current) {
        for (const move of moves) {
          socket.emit("guildWar:teamMoved", {
            weekId: latestWeekIdRef.current,
            dayId: selectedDayId,
            memberKey: move.memberKey,
            targetZone: move.teamName,
          });
        }
      }

      toast.success(`จัด ${moves.length} คนลงทีมเดิมจากรอบ ${formatDayTab(result.previousDayId)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Auto จัดทีมไม่สำเร็จ");
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const getBuildColor = (build: string) => {
    return (
      buildOptions.find((item) => item.label === build)?.color ?? "#94a3b8"
    );
  };

  const captureBlob = (node: HTMLElement) =>
    toBlob(node, {
      pixelRatio: 2,
      backgroundColor: "#040a13",
      filter: (element) => !(element instanceof HTMLElement && element.dataset.captureIgnore !== undefined),
    }).then((blob) => {
      if (!blob) {
        throw new Error("Capture failed");
      }
      return blob;
    });

  const onCaptureAndSend = async () => {
    const node = captureRef.current?.closest("section");
    if (!node) {
      return;
    }

    setIsSendingCapture(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const blob = await captureBlob(node);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      await apiFetch("/api/guild-war/notices/send-image", {
        method: "POST",
        token,
        body: JSON.stringify({
          image: dataUrl,
          filename: `team-builder-${selectedDayId || "teams"}.png`,
        }),
      });
      toast.success("ส่งรูปไป Discord แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งรูปไป Discord ไม่สำเร็จ");
    } finally {
      setIsSendingCapture(false);
    }
  };

  const onCapture = async () => {
    const node = captureRef.current?.closest("section");
    if (!node) {
      return;
    }

    setIsCapturing(true);
    const blobPromise = captureBlob(node);

    try {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
        toast.success("คัดลอกรูปแล้ว กด Ctrl+V เพื่อวางได้เลย");
      } catch {
        const url = URL.createObjectURL(await blobPromise);
        const link = document.createElement("a");
        link.href = url;
        link.download = `team-builder-${selectedDayId || "teams"}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("เบราว์เซอร์นี้คัดลอกรูปไม่ได้ เลยดาวน์โหลดไฟล์ให้แทน");
      }
    } catch {
      toast.error("Capture ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <SectionCard
      cat
      title="Guild War Team Builder"
      subtitle={
        canDrag
          ? "Click a member to open popover and move between Pool and any configured team."
          : "Read-only mode. Only ADMIN/SUPER_ADMIN can move and arrange teams."
      }
      action={
        <div ref={captureRef} data-capture-ignore className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onCapture()}
            disabled={isCapturing}
            className="rounded-lg"
          >
            <Camera className="h-3.5 w-3.5" />
            {isCapturing ? "Capturing..." : "Capture"}
          </Button>
          {canDrag ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onCaptureAndSend()}
              disabled={isSendingCapture}
              className="rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
              {isSendingCapture ? "Sending..." : "ส่ง Discord"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("https://gvgmapwwm.vcross.gg/", "_blank")}
            className="rounded-lg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Map
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {openWindows.length > 0 ? (
            <div
              role="tablist"
              aria-label="วันวอ"
              className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-1"
            >
              {openWindows.map((window) => {
                const isActive = selectedDayId === window.day_id;

                return (
                  <button
                    key={window.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedDayId(window.day_id)}
                    className={`h-8 rounded-md px-4 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[#f5c548] text-slate-950"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    {formatDayTab(window.day_id)}
                  </button>
                );
              })}
            </div>
          ) : !isLoadingPool ? (
            <p className="text-sm text-slate-400">No open registration day</p>
          ) : (
            <Skeleton className="h-10 w-48 rounded-lg" />
          )}

          {!isLoadingPool && openWindows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full border border-rose-500/30 bg-rose-950/30 px-2.5 py-1 text-rose-100">
                ATK <span className="font-semibold tabular-nums">{attackRegisteredCount}</span>
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-cyan-100">
                DEF <span className="font-semibold tabular-nums">{defenseRegisteredCount}</span>
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-amber-100">
                รวม <span className="font-semibold tabular-nums">{attackDefenseRegisteredCount}</span>
              </span>
            </div>
          ) : null}
        </div>

        <div
          data-capture-ignore
          className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 lg:flex-row lg:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อหรือ build..."
              className="rounded-lg pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TimeRangeSelect
              from={rangeFrom}
              until={rangeTo}
              onChange={(from, until) => {
                setRangeFrom(from);
                setRangeTo(until);
              }}
            />
            {rangeFrom || rangeTo ? (
              <button
                type="button"
                onClick={() => {
                  setRangeFrom("");
                  setRangeTo("");
                }}
                aria-label="ล้างช่วงเวลา"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setHideExpired((prev) => !prev)}
              aria-pressed={hideExpired}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                hideExpired
                  ? "border-amber-300/50 bg-amber-400/15 text-amber-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {hideExpired ? "ซ่อนนุดที่ไม่อยู่แล้ว" : "แสดงนุดทั้งหมด"}
            </button>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-slate-700 lg:block" />
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsSummaryOpen(true)}
              disabled={!selectedDayId}
            >
              <Table2 className="h-4 w-4" />
              ตารางเวลา
            </Button>
            {canDrag ? (
              <Button
                type="button"
                className="rounded-lg"
                onClick={() => void onAutoAssign()}
                disabled={!selectedDayId || isAutoAssigning || isLoadingPool || state.pool.length === 0}
                title="จัดคนใน Pool ที่เคยลงรอบล่าสุดเข้าทีมเดิม"
              >
                <Wand2 className="h-4 w-4" />
                {isAutoAssigning ? "กำลังจัด..." : "Auto"}
              </Button>
            ) : null}
          </div>
        </div>

        {isLoadingPool ? (
          <TeamBuilderSkeleton />
        ) : (
          <div className="space-y-6">
            <DropZone
              id="pool"
              label="Pool"
              description={
                hiddenPoolCount > 0
                  ? `ซ่อนอยู่ ${hiddenPoolCount} คน (หมดเวลาหรืออยู่นอกช่วงเวลาที่เลือก)`
                  : "คนที่ลงทะเบียนแล้วแต่ยังไม่มีทีม"
              }
              members={filteredPool}
              totalCount={filteredPool.length}
              canManage={canDrag}
              zones={zones}
              onMove={moveMember}
              getBuildColor={getBuildColor}
              membersGridClassName="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />

            <div className="grid items-start gap-6 xl:grid-cols-2">
              {[
                { key: "atk", label: "ATK", teams: attackTeams, count: attackRegisteredCount, tone: "text-rose-200", bar: "bg-rose-400" },
                { key: "def", label: "DEF", teams: defenseTeams, count: defenseRegisteredCount, tone: "text-cyan-200", bar: "bg-cyan-400" },
              ].map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <p className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] ${group.tone}`}>
                      <span className={`h-4 w-1 rounded-full ${group.bar}`} />
                      {group.label}
                    </p>
                    <span className="text-xs text-slate-400">
                      {group.teams.length} ทีม • {group.count} คน
                    </span>
                  </div>
                  {group.teams.length > 0 ? (
                    group.teams.map((team) => (
                      <DropZone
                        key={team.name}
                        id={team.name}
                        label={team.name}
                        description={team.description}
                        accentColor={team.color}
                        members={filteredTeams[team.name] ?? []}
                        totalCount={(filteredTeams[team.name] ?? []).length}
                        canManage={canDrag}
                        zones={zones}
                        onMove={moveMember}
                        getBuildColor={getBuildColor}
                        membersGridClassName="grid gap-2 sm:grid-cols-2"
                        isMemberInactive={isMemberInactive}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-700/80 px-4 py-6 text-center text-xs text-slate-500">
                      ยังไม่มีทีม {group.label}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {otherTeams.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-200">
                    <span className="h-4 w-1 rounded-full bg-amber-400" />
                    Other
                  </p>
                  <span className="text-xs text-slate-400">{otherTeams.length} ทีม</span>
                </div>
                <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {otherTeams.map((team) => (
                    <DropZone
                      key={team.name}
                      id={team.name}
                      label={team.name}
                      description={team.description}
                      accentColor={team.color}
                      members={filteredTeams[team.name] ?? []}
                      totalCount={(filteredTeams[team.name] ?? []).length}
                      canManage={canDrag}
                      zones={zones}
                      onMove={moveMember}
                      getBuildColor={getBuildColor}
                      membersGridClassName="grid gap-2"
                      isMemberInactive={isMemberInactive}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isSummaryOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsSummaryOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="war-time-summary-title"
                className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-md border border-amber-300/20 bg-[#07101c] shadow-2xl"
              >
                <div className="border-b border-slate-700/70 p-4">
                  <div className="flex items-center gap-3">
                    <h3 id="war-time-summary-title" className="text-lg font-semibold text-white">
                      ตารางสรุปเวลา
                      {selectedDayId ? ` • ${formatDayTab(selectedDayId)}` : ""}
                    </h3>
                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-slate-300">
                      {summaryRows.length} คน
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSummaryOpen(false)}
                      className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/40 p-2 md:flex-row md:items-center md:justify-between">
                    <div
                      role="radiogroup"
                      aria-label="สถานะ"
                      className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950/60 p-1"
                    >
                      {summaryStatusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={summaryStatus === option.value}
                          onClick={() => setSummaryStatus(option.value)}
                          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition ${
                            summaryStatus === option.value
                              ? option.activeClassName
                              : "border-transparent text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {option.label}
                          <span className="rounded-full bg-black/30 px-1.5 text-xs tabular-nums">{option.count}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        อยู่ตลอดช่วง
                      </span>
                      <TimeRangeSelect
                        from={summaryRangeFrom}
                        until={summaryRangeTo}
                        onChange={(from, until) => {
                          setSummaryRangeFrom(from);
                          setSummaryRangeTo(until);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSummaryRangeFrom("");
                          setSummaryRangeTo("");
                        }}
                        disabled={!summaryRangeFrom && !summaryRangeTo}
                        aria-label="ล้างช่วงเวลา"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-auto p-4">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                        <th className="w-10 px-2 py-1.5">#</th>
                        <th className="px-2 py-1.5">ชื่อ</th>
                        <th className="px-2 py-1.5">เวลา</th>
                        <th className="w-[40%] px-2 py-1.5">
                          <div className="relative h-4">
                            {timelineTicks.map((tick, tickIndex) => (
                              <span
                                key={tick}
                                className={`absolute text-[10px] font-medium normal-case tracking-normal ${
                                  tickIndex === 0
                                    ? ""
                                    : tickIndex === timelineTicks.length - 1
                                      ? "-translate-x-full"
                                      : "-translate-x-1/2"
                                }`}
                                style={{ left: `${getTimelinePosition(tick, tick).left}%` }}
                              >
                                {tick}
                              </span>
                            ))}
                          </div>
                        </th>
                        <th className="px-2 py-1.5">ทีม</th>
                        <th className="px-2 py-1.5">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center text-slate-400">
                            ไม่มีคนในช่วงเวลานี้
                          </td>
                        </tr>
                      ) : (
                        summaryRows.map((member, index) => {
                          const expired = isMemberExpired(member);
                          const bar = getTimelinePosition(member.availableFrom, member.availableUntil);

                          return (
                            <tr key={member.key} className="border-t border-slate-800/80">
                              <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                              <td className="px-2 py-1.5">
                                <div className="font-semibold text-slate-100">{member.characterName}</div>
                                <div className="text-xs" style={{ color: getBuildColor(member.build) }}>
                                  {member.build}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-200">
                                {formatTimeRange(member.availableFrom, member.availableUntil)}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="relative h-3 rounded-full bg-slate-800/80">
                                  {timelineTicks.map((tick) => (
                                    <span
                                      key={tick}
                                      className="absolute top-0 h-full w-px bg-slate-700/70"
                                      style={{ left: `${getTimelinePosition(tick, tick).left}%` }}
                                    />
                                  ))}
                                  <span
                                    className={`absolute top-0 h-full rounded-full ${expired ? "bg-slate-500/60" : "bg-amber-400/80"}`}
                                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-slate-300">{zoneByMemberKey.get(member.key) ?? "-"}</td>
                              <td className="px-2 py-1.5">
                                {expired ? (
                                  <span className="rounded-full border border-rose-400/40 bg-rose-950/40 px-2 py-0.5 text-xs text-rose-200">
                                    หมดเวลา
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-emerald-400/40 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-200">
                                    อยู่
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </SectionCard>
  );
}
