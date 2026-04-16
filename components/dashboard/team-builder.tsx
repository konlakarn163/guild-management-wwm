"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shield, Swords } from "lucide-react";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import { getRealtimeSocket } from "@/lib/realtime";
import type { BuildOption, GuildWarRegistration } from "@/lib/types";
import { getCurrentWeekId } from "@/lib/week-id";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

interface TeamMemberEntry {
  key: string;
  characterName: string;
  build: string;
}

interface TeamState {
  pool: TeamMemberEntry[];
  teams: Record<string, TeamMemberEntry[]>;
}

interface TeamBuilderProps {
  canDrag?: boolean;
}

interface TeamApiMember {
  user_id: string;
}

interface TeamApiRow {
  id: string;
  name: string;
  team_members?: TeamApiMember[];
}

const defaultState: TeamState = {
  pool: [],
  teams: {
    "Team 1": [],
    "Team 2": [],
  },
};

interface DraggableMemberProps {
  member: TeamMemberEntry;
  canManage: boolean;
  currentZone: string;
  zones: string[];
  onMove: (memberKey: string, targetZone: string) => void;
  getBuildColor: (build: string) => string;
  itemClassName?: string;
}

function DraggableMember({ member, canManage, currentZone, zones, onMove, getBuildColor, itemClassName }: DraggableMemberProps) {
  const moveTargets = zones.filter((zone) => zone !== currentZone);

  if (!canManage) {
    return (
      <div
        className={`cursor-default rounded-2xl border px-3 py-2 text-sm font-semibold shadow-[0_8px_18px_rgba(2,6,23,0.35)] opacity-90 ${itemClassName ?? "border-slate-600 bg-slate-900 text-slate-100"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span>{member.characterName}</span>
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
            <span>{member.characterName}</span>
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
  members: TeamMemberEntry[];
  totalCount?: number;
  canManage: boolean;
  zones: string[];
  onMove: (memberKey: string, targetZone: string) => void;
  getBuildColor: (build: string) => string;
  membersGridClassName?: string;
  itemClassName?: string;
}) {
  const isAttackTeam = id === "Team 1";
  const isDefenseTeam = id === "Team 2";
  const zoneFrameClass = isAttackTeam
    ? "border-rose-400/45 bg-rose-950/15"
    : isDefenseTeam
      ? "border-cyan-400/45 bg-cyan-950/15"
      : "border-slate-700 bg-slate-950/70";
  const zoneEmptyClass = isAttackTeam
    ? "border-rose-400/35 text-rose-100/75"
    : isDefenseTeam
      ? "border-cyan-400/35 text-cyan-100/75"
      : "border-slate-700 text-slate-400";

  return (
    <div className={`rounded-md border p-4 transition ${zoneFrameClass}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-100">
        {isAttackTeam ? <Swords className="h-4 w-4 text-rose-300" /> : null}
        {isDefenseTeam ? <Shield className="h-4 w-4 text-cyan-300" /> : null}
        <span>
          {id} ({totalCount ?? members.length})
        </span>
      </h4>
      <div className={membersGridClassName ?? "grid gap-2"}>
        {members.length > 0 ? (
          members.map((member) => (
            <DraggableMember
              key={member.key}
              member={member}
              canManage={canManage}
              currentZone={id}
              zones={zones}
              onMove={onMove}
              getBuildColor={getBuildColor}
              itemClassName={itemClassName}
            />
          ))
        ) : (
          <p className={`rounded-xl border border-dashed px-3 py-3 text-xs ${zoneEmptyClass}`}>No matching members</p>
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
  const [search, setSearch] = useState("");
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [_poolMessage, setPoolMessage] = useState<string | null>(null);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestPersistStateRef = useRef<TeamState>(defaultState);
  const weekId = useMemo(() => getCurrentWeekId(), []);
  const teamKeys = useMemo(() => Object.keys(state.teams), [state.teams]);
  const zones = useMemo(() => ["pool", ...teamKeys], [teamKeys]);
  const normalizedSearch = search.trim().toLowerCase();

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
      next.pool.push(movingMember);
    } else {
      next.teams[targetZone] = [...(next.teams[targetZone] ?? []), movingMember];
    }

    return next;
  };

  const ensureTeamIds = async (token: string) => {
    const teams = await apiFetch<TeamApiRow[]>(`/api/teams/${weekId}`, { token });
    const mapping: Record<string, string> = {};

    for (const team of teams) {
      if ((team.name === "Team 1" || team.name === "Team 2") && !mapping[team.name]) {
        mapping[team.name] = team.id;
      }
    }

    for (const name of ["Team 1", "Team 2"]) {
      if (!mapping[name]) {
        const created = await apiFetch<TeamApiRow>(`/api/teams/${weekId}`, {
          method: "POST",
          token,
          body: JSON.stringify({ name }),
        });
        mapping[name] = created.id;
      }
    }

    setTeamIdByName(mapping);
    return mapping;
  };

  const persistTeams = async (nextState: TeamState) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      const ids = Object.keys(teamIdByName).length ? teamIdByName : await ensureTeamIds(token);

      for (const teamName of ["Team 1", "Team 2"]) {
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

      const [list, teams] = await Promise.all([
        apiFetch<GuildWarRegistration[]>(`/api/guild-war/registrations/${weekId}`, { token }),
        apiFetch<TeamApiRow[]>(`/api/teams/${weekId}`, { token }),
      ]);

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
          };
          uniqueMembers.push(entry);
          memberByKey.set(key, entry);
        }
      }

      const canonicalTeams: Partial<Record<"Team 1" | "Team 2", TeamApiRow>> = {};
      for (const team of teams) {
        if ((team.name === "Team 1" || team.name === "Team 2") && !canonicalTeams[team.name]) {
          canonicalTeams[team.name] = team;
        }
      }

      const mapping: Record<string, string> = {};
      const persistedTeams: Record<string, TeamMemberEntry[]> = {
        "Team 1": [],
        "Team 2": [],
      };

      for (const teamName of ["Team 1", "Team 2"] as const) {
        const team = canonicalTeams[teamName];
        if (!team) {
          continue;
        }

        mapping[teamName] = team.id;
        persistedTeams[teamName] = (team.team_members ?? [])
          .map((member) => memberByKey.get(member.user_id))
          .filter((member): member is TeamMemberEntry => Boolean(member));
      }

      setTeamIdByName(mapping);

      setState(() => {
        const assigned = new Set(Object.values(persistedTeams).flat().map((member) => member.key));
        return {
          pool: uniqueMembers.filter((member) => !assigned.has(member.key)),
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
    socket.emit("guildWar:joinWeek", weekId);

    const onRegistrationsUpdated = (payload: { weekId: string }) => {
      if (payload.weekId !== weekId) {
        return;
      }

      void refreshPoolFromRegistrants();
    };

    const onTeamMoved = (payload: { weekId: string; memberKey: string; targetZone: string }) => {
      if (payload.weekId !== weekId) {
        return;
      }

      applyMove(payload.memberKey, payload.targetZone);
    };

    socket.on("guildWar:registrationsUpdated", onRegistrationsUpdated);
    socket.on("guildWar:teamMoved", onTeamMoved);

    return () => {
      socket.off("guildWar:registrationsUpdated", onRegistrationsUpdated);
      socket.off("guildWar:teamMoved", onTeamMoved);
      socket.emit("guildWar:leaveWeek", weekId);
    };
  }, [weekId]);

  const filteredPool = useMemo(
    () =>
      state.pool.filter((member) => {
        const haystack = `${member.characterName} ${member.build}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
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
      weekId,
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
          ? "Click a member to open popover and move between Pool / Team 1 / Team 2."
          : "Read-only mode. Only ADMIN/SUPER_ADMIN can move and arrange teams."
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

      </div>
      {isLoadingPool ? (
        <TeamBuilderSkeleton />
      ) : (
        <div className="grid gap-4">
          <DropZone
            id="pool"
            members={filteredPool}
            totalCount={filteredPool.length}
            canManage={canDrag}
            zones={zones}
            onMove={moveMember}
            getBuildColor={getBuildColor}
            membersGridClassName="grid gap-2 md:grid-cols-2 xl:grid-cols-3"
            itemClassName="border-slate-600 bg-slate-900 text-slate-100"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {teamKeys.map((team) => (
              <DropZone
                key={team}
                id={team}
                members={filteredTeams[team] ?? []}
                totalCount={(filteredTeams[team] ?? []).length}
                canManage={canDrag}
                zones={zones}
                onMove={moveMember}
                getBuildColor={getBuildColor}
                membersGridClassName="grid gap-2 sm:grid-cols-2"
                itemClassName={
                  team === "Team 1"
                    ? "border-rose-400/55 bg-rose-950/40 text-rose-50"
                    : "border-cyan-400/55 bg-cyan-950/40 text-cyan-50"
                }
              />
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}