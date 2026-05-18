"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import { getRealtimeSocket } from "@/lib/realtime";
import type { BuildOption, GuildWarRegistration, GuildWarRegistrationWindow, GuildWarTeam, GuildWarTeamType } from "@/lib/types";
import { getCurrentWeekId } from "@/lib/week-id";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface TeamMemberEntry {
  key: string;
  characterName: string;
  build: string;
  registrationIndex: number;
}

interface TeamState {
  pool: TeamMemberEntry[];
  teams: Record<string, TeamMemberEntry[]>;
}

interface TeamDefinition extends GuildWarTeam {
  team_members?: { id: string; user_id: string }[];
}

const getTeamType = (team?: GuildWarTeam | null): GuildWarTeamType => {
  const type = team?.team_type;
  if (type === "atk" || type === "def") {
    return type;
  }

  return "other";
};

const sortTeamsByName = (teams: TeamDefinition[]) => [...teams].sort((left, right) => left.name.localeCompare(right.name));

interface TeamBuilderProps {
  canDrag?: boolean;
}

const defaultState: TeamState = {
  pool: [],
  teams: {},
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
}: DraggableMemberProps) {
  const moveTargets = zones.filter((zone) => zone !== currentZone);

  if (!canManage) {
    return (
      <div
        className={`cursor-default rounded-2xl border px-3 py-2 text-sm font-semibold shadow-[0_8px_18px_rgba(2,6,23,0.35)] opacity-90 ${itemClassName ?? "border-slate-600 bg-slate-900 text-slate-100"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span>
            {displayIndex ? `${displayIndex}. ` : ""}
            {member.characterName}
          </span>
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: getBuildColor(member.build) }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getBuildColor(member.build) }} />
            {member.build}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`rounded-2xl border px-3 py-2 text-sm font-semibold shadow-[0_8px_18px_rgba(2,6,23,0.35)] ${itemClassName ?? "border-slate-600 bg-slate-900 text-slate-100"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>
              {displayIndex ? `${displayIndex}. ` : ""}
              {member.characterName}
            </span>
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: getBuildColor(member.build) }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getBuildColor(member.build) }} />
              {member.build}
            </span>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Move {member.characterName}</p>
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
}) {
  const zoneStyle = accentColor
    ? {
        borderColor: `${accentColor}66`,
        backgroundColor: `${accentColor}12`,
      }
    : undefined;

  return (
    <div className="rounded-md border border-slate-700 bg-slate-950/70 p-4 transition" style={zoneStyle}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-100">
        {accentColor ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} /> : null}
        <span>
          {label} ({totalCount ?? members.length})
        </span>
      </h4>
      {description ? <p className="mb-3 text-xs leading-5 text-slate-300/80">{description}</p> : null}
      <div className={membersGridClassName ?? "grid gap-2"}>
        {members.length > 0 ? (
          members.map((member, index) => (
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
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-400">No matching members</p>
        )}
      </div>
    </div>
  );
}

function TeamBuilderSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-slate-700 bg-slate-950/70 p-4">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`pool-skeleton-${index}`} className="h-12 w-full rounded-2xl" />
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
                <Skeleton key={`team-member-skeleton-${zoneIndex}-${cardIndex}`} className="h-12 w-full rounded-2xl" />
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
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [_poolMessage, setPoolMessage] = useState<string | null>(null);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestPersistStateRef = useRef<TeamState>(defaultState);
  const currentDayIdRef = useRef<string | null>(null);
  const weekId = useMemo(() => getCurrentWeekId(), []);
  const [socketWeekId, setSocketWeekId] = useState(weekId);
  const teamKeys = useMemo(() => teamDefinitions.map((team) => team.name), [teamDefinitions]);
  const zones = useMemo(() => ["pool", ...teamKeys], [teamKeys]);
  const normalizedSearch = search.trim().toLowerCase();
  const attackTeams = useMemo(() => sortTeamsByName(teamDefinitions.filter((team) => getTeamType(team) === "atk")), [teamDefinitions]);
  const defenseTeams = useMemo(() => sortTeamsByName(teamDefinitions.filter((team) => getTeamType(team) === "def")), [teamDefinitions]);
  const otherTeams = useMemo(() => sortTeamsByName(teamDefinitions.filter((team) => getTeamType(team) === "other")), [teamDefinitions]);
  const attackRegisteredCount = useMemo(
    () => attackTeams.reduce((total, team) => total + (state.teams[team.name]?.length ?? 0), 0),
    [attackTeams, state.teams],
  );
  const defenseRegisteredCount = useMemo(
    () => defenseTeams.reduce((total, team) => total + (state.teams[team.name]?.length ?? 0), 0),
    [defenseTeams, state.teams],
  );
  const attackDefenseRegisteredCount = attackRegisteredCount + defenseRegisteredCount;

  const sortByRegistrationOrder = (members: TeamMemberEntry[]) => {
    return [...members].sort((left, right) => left.registrationIndex - right.registrationIndex);
  };

  const computeMovedState = (prev: TeamState, memberKey: string, targetZone: string): TeamState => {
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
      next.teams[targetZone] = [...(next.teams[targetZone] ?? []), movingMember];
    }

    return next;
  };

  const syncTeamIds = async (token: string) => {
    const teams = await apiFetch<TeamDefinition[]>("/api/teams", { token });
    const mapping: Record<string, string> = {};

    for (const team of teams) {
      mapping[team.name] = team.id;
    }

    setTeamIdByName(mapping);
    setTeamDefinitions(teams);
    return mapping;
  };

  const persistTeams = async (nextState: TeamState) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      const dayId = currentDayIdRef.current;
      if (!dayId) {
        return;
      }

      const ids = Object.keys(teamIdByName).length ? teamIdByName : await syncTeamIds(token);

      for (const teamName of teamKeys) {
        const teamId = ids[teamName];
        if (!teamId) {
          continue;
        }

        const userIds = [...new Set((nextState.teams[teamName] ?? []).map((member) => member.key))];
        await apiFetch(`/api/teams/${teamId}/members`, {
          method: "PUT",
          token,
          body: JSON.stringify({ userIds }),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save team changes";
      setPoolMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const refreshPoolFromRegistrants = async () => {
    try {
      setIsLoadingPool(true);
      setPoolMessage(null);

      const token = await getAccessToken();
      if (!token) {
        setPoolMessage("Please login first");
        return;
      }

      const openData = await apiFetch<{ window: GuildWarRegistrationWindow | null; registrations: GuildWarRegistration[] }>("/api/guild-war/registrations/open", { token });
      const { window: openWindow, registrations: list } = openData;

      if (!openWindow) {
        currentDayIdRef.current = null;
        setSocketWeekId(weekId);
        setState({ pool: [], teams: {} });
        setTeamIdByName({});
        setTeamDefinitions([]);
        setIsLoadingPool(false);
        return;
      }

      const dayId = openWindow.day_id;
      currentDayIdRef.current = dayId;
      setSocketWeekId(openWindow.week_id);

      const teams = await apiFetch<TeamDefinition[]>("/api/teams", { token });

      const uniqueMembers: TeamMemberEntry[] = [];
      const seen = new Set<string>();
      const memberByKey = new Map<string, TeamMemberEntry>();

      for (const item of list) {
        const key = item.user_id;
        if (!seen.has(key)) {
          seen.add(key);
          const entry = {
            key,
            characterName: item.users?.character_name ?? item.users?.username ?? `User-${item.user_id.slice(0, 8)}`,
            build: item.users?.build ?? "-",
            registrationIndex: uniqueMembers.length + 1,
          };
          uniqueMembers.push(entry);
          memberByKey.set(key, entry);
        }
      }

      const mapping: Record<string, string> = {};
      const persistedTeams: Record<string, TeamMemberEntry[]> = {};

      for (const team of teams) {
        mapping[team.name] = team.id;
        persistedTeams[team.name] = (team.team_members ?? [])
          .map((member) => memberByKey.get(member.user_id))
          .filter((member): member is TeamMemberEntry => Boolean(member));
      }

      setTeamIdByName(mapping);
      setTeamDefinitions(teams);

      setState(() => {
        const assigned = new Set(Object.values(persistedTeams).flat().map((member) => member.key));
        return {
          pool: sortByRegistrationOrder(uniqueMembers.filter((member) => !assigned.has(member.key))),
          teams: persistedTeams,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load registrants";
      setPoolMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingPool(false);
    }
  };

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
    void refreshPoolFromRegistrants();
  }, [weekId]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    socket.emit("guildWar:joinWeek", socketWeekId);

    const onRegistrationsUpdated = (_payload: { weekId: string; dayId?: string }) => {
      void refreshPoolFromRegistrants();
    };

    const onTeamMoved = (payload: { weekId: string; memberKey: string; targetZone: string }) => {
      if (payload.weekId !== socketWeekId) {
        return;
      }

      applyMove(payload.memberKey, payload.targetZone);
    };

    socket.on("guildWar:registrationsUpdated", onRegistrationsUpdated);
    socket.on("guildWar:teamMoved", onTeamMoved);

    return () => {
      socket.off("guildWar:registrationsUpdated", onRegistrationsUpdated);
      socket.off("guildWar:teamMoved", onTeamMoved);
      socket.emit("guildWar:leaveWeek", socketWeekId);
    };
  }, [socketWeekId]);

  const filteredPool = useMemo(
    () =>
      sortByRegistrationOrder(
        state.pool.filter((member) => {
          const haystack = `${member.characterName} ${member.build}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        }),
      ),
    [normalizedSearch, state.pool],
  );

  const filteredTeams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.teams).map(([team, members]) => [
          team,
          members.filter((member) => {
            const haystack = `${member.characterName} ${member.build}`.toLowerCase();
            return haystack.includes(normalizedSearch);
          }),
        ]),
      ),
    [normalizedSearch, state.teams],
  );

  const applyMove = (memberKey: string, targetZone: string) => {
    setState((prev) => computeMovedState(prev, memberKey, targetZone));
  };

  const enqueuePersistTeams = (nextState: TeamState) => {
    latestPersistStateRef.current = nextState;
    persistQueueRef.current = persistQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await persistTeams(latestPersistStateRef.current);
      });
  };

  const moveMember = (memberKey: string, targetZone: string) => {
    setState((prev) => {
      const next = computeMovedState(prev, memberKey, targetZone);
      if (canDrag) {
        enqueuePersistTeams(next);
      }

      return next;
    });

    const socket = getRealtimeSocket();
    socket.emit("guildWar:teamMoved", {
      weekId: socketWeekId,
      memberKey,
      targetZone,
    });
  };

  const getBuildColor = (build: string) => {
    return buildOptions.find((item) => item.label === build)?.color ?? "#94a3b8";
  };

  return (
    <SectionCard
      title="Guild War Team Builder"
      subtitle={
        canDrag
          ? "Click a member to open popover and move between Pool and any configured team."
          : "Read-only mode. Only ADMIN/SUPER_ADMIN can move and arrange teams."
      }
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open("https://gvgmapwwm.vcross.gg/", "_blank")}
          className="rounded-xl"
        >
          <ExternalLink className="h-4 w-4" />
          View Map
        </Button>
      }
    >
      <div className="mb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search member name..."
          className="h-10 rounded-xl"
        />
        {isLoadingPool ? <Skeleton className="mt-2 h-3 w-52" /> : null}

        {!isLoadingPool ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-sm text-rose-100">
              <span className="font-semibold">ATK:</span> {attackRegisteredCount}
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">
              <span className="font-semibold">DEF:</span> {defenseRegisteredCount}
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
              <span className="font-semibold">ATK + DEF:</span> {attackDefenseRegisteredCount}
            </div>
          </div>
        ) : null}

      </div>
      {isLoadingPool ? (
        <TeamBuilderSkeleton />
      ) : (
        <div className="grid gap-4">
          <DropZone
            id="pool"
            label="Pool"
            members={filteredPool}
            totalCount={filteredPool.length}
            canManage={canDrag}
            zones={zones}
            onMove={moveMember}
            getBuildColor={getBuildColor}
            membersGridClassName="grid gap-2 md:grid-cols-2 xl:grid-cols-3"
            itemClassName="border-slate-600 bg-slate-900 text-slate-100"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-3">
              <div className="rounded-md border border-rose-500/25 bg-rose-950/10 px-4 py-3">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-200">ATK</p>
              </div>
              {attackTeams.length > 0 ? (
                attackTeams.map((team) => (
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
                    itemClassName="border-slate-600 bg-slate-900 text-slate-100"
                  />
                ))
              ) : (
                <p className="rounded-md border border-dashed border-rose-400/30 px-4 py-5 text-sm text-rose-100/70">No ATK teams</p>
              )}
            </div>

            <div className="grid gap-3">
              <div className="rounded-md border border-cyan-500/25 bg-cyan-950/10 px-4 py-3">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">DEF</p>
              </div>
              {defenseTeams.length > 0 ? (
                defenseTeams.map((team) => (
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
                    itemClassName="border-slate-600 bg-slate-900 text-slate-100"
                  />
                ))
              ) : (
                <p className="rounded-md border border-dashed border-cyan-400/30 px-4 py-5 text-sm text-cyan-100/70">No DEF teams</p>
              )}
            </div>
          </div>

          {otherTeams.length > 0 ? (
            <div className="grid gap-3">
              <div className="rounded-md border border-amber-500/25 bg-amber-950/10 px-4 py-3">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">OTHER</p>
              </div>
              <div className={`grid gap-3 ${otherTeams.length === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
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
                    itemClassName="border-slate-600 bg-slate-900 text-slate-100"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}