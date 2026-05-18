"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type {
  GuildWarTeam,
  GuildWarTeamType,
} from "@/lib/types";

const DEFAULT_TEAM_COLOR = "#3b82f6";
const RESERVED_TEAM_NAME = "Reserve";

const normalizeTeamColor = (value?: string | null) => {
  const match = String(value ?? "")
    .trim()
    .match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : DEFAULT_TEAM_COLOR;
};

interface TeamFormState {
  name: string;
  description: string;
  color: string;
  teamType: GuildWarTeamType;
}

const TEAM_TYPE_OPTIONS: Array<{ value: GuildWarTeamType; label: string }> = [
  { value: "atk", label: "ATK" },
  { value: "def", label: "DEF" },
  { value: "other", label: "OTHER" },
];

const getTeamTypeLabel = (teamType?: GuildWarTeamType | null) => {
  return (
    TEAM_TYPE_OPTIONS.find((option) => option.value === teamType)?.label ??
    "OTHER"
  );
};

const getTeamTypeOrder = (teamType?: GuildWarTeamType | null) => {
  switch (teamType) {
    case "atk":
      return 0;
    case "def":
      return 1;
    default:
      return 2;
  }
};

const isProtectedTeam = (team?: Pick<GuildWarTeam, "name"> | null) =>
  team?.name === RESERVED_TEAM_NAME;

const emptyForm = (): TeamFormState => ({
  name: "",
  description: "",
  color: DEFAULT_TEAM_COLOR,
  teamType: "other",
});

function TeamRowSkeleton() {
  return <Skeleton className="h-24 w-full rounded-2xl" />;
}

export function TeamManagementPanel() {
  const [teams, setTeams] = useState<GuildWarTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamFormState>(emptyForm());
  const [message, setMessage] = useState<string | null>(null);
  const isEditingProtectedTeam = useMemo(
    () =>
      teams.some((team) => team.id === editingTeamId && isProtectedTeam(team)),
    [editingTeamId, teams],
  );

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((left, right) => {
        const typeOrder =
          getTeamTypeOrder(left.team_type) - getTeamTypeOrder(right.team_type);
        return typeOrder !== 0
          ? typeOrder
          : left.name.localeCompare(right.name);
      }),
    [teams],
  );

  const loadTeams = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      const teamRows = await apiFetch<GuildWarTeam[]>("/api/teams", {
        token,
      });
      setTeams(teamRows);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load teams";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const resetForm = () => {
    setEditingTeamId(null);
    setForm(emptyForm());
  };

  const beginEdit = (team: GuildWarTeam) => {
    setEditingTeamId(team.id);
    setForm({
      name: team.name,
      description: team.description ?? "",
      color: normalizeTeamColor(team.color),
      teamType: team.team_type ?? "other",
    });
  };

  const saveTeam = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: normalizeTeamColor(form.color),
        teamType: form.teamType,
      };

      if (!payload.name) {
        setMessage("Team name is required");
        return;
      }

      setIsSaving(true);

      if (editingTeamId) {
        await apiFetch(`/api/teams/${editingTeamId}`, {
          method: "PUT",
          token,
          body: JSON.stringify(payload),
        });
        toast.success("Team updated");
      } else {
        await apiFetch("/api/teams", {
          method: "POST",
          token,
          body: JSON.stringify({
            ...payload,
          }),
        });
        toast.success("Team created");
      }

      resetForm();
      await loadTeams();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save team";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const removeTeam = async (team: GuildWarTeam) => {
    if (!window.confirm(`Delete team \"${team.name}\"?`)) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      await apiFetch(`/api/teams/${team.id}`, {
        method: "DELETE",
        token,
      });

      if (editingTeamId === team.id) {
        resetForm();
      }

      toast.success("Team deleted");
      await loadTeams();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete team";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <SectionCard
      title="Guild War Teams"
      subtitle="Create, edit, delete teams, and choose a color for each one"
    >
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-100">
              {editingTeamId ? "Edit Team" : "Create Team"}
            </p>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Team Name
              </span>
              <input
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/70"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Example: Attack Team"
                disabled={isEditingProtectedTeam}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Description
              </span>
              <textarea
                className="min-h-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/70"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Team role, strategy, or notes"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Color
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-11 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                />
                <input
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/70"
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                  placeholder="#3b82f6"
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Type
              </span>
              <select
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/70"
                value={form.teamType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    teamType: event.target.value as GuildWarTeamType,
                  }))
                }
                disabled={isEditingProtectedTeam}
              >
                {TEAM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.color ? (
              <div
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100"
                style={{
                  backgroundColor: `${normalizeTeamColor(form.color)}22`,
                  borderColor: `${normalizeTeamColor(form.color)}55`,
                }}
              >
                Preview:{" "}
                <span style={{ color: normalizeTeamColor(form.color) }}>
                  {form.name || "Team name"}
                </span>{" "}
                • {getTeamTypeLabel(form.teamType)}
              </div>
            ) : null}

            {message ? (
              <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {message}
              </p>
            ) : null}

            {isEditingProtectedTeam ? (
              <p className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                Reserve เป็นทีมพิเศษ เปลี่ยนชื่อหรือลบไม่ได้
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => void saveTeam()}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving…"
                  : editingTeamId
                    ? "Save Changes"
                    : "Create Team"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Existing Teams
              </p>
              <p className="text-xs text-slate-400">
                Set each team to ATK, DEF, or OTHER.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadTeams()}
            >
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TeamRowSkeleton />
              <TeamRowSkeleton />
              <TeamRowSkeleton />
            </div>
          ) : sortedTeams.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400">
              No teams yet. Create the first one from the form on the left.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedTeams.map((team) => {
                const teamColor = normalizeTeamColor(team.color);
                const protectedTeam = isProtectedTeam(team);

                return (
                  <div
                    key={team.id}
                    className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                    style={{
                      borderColor: `${teamColor}55`,
                      backgroundColor: `${teamColor}0D`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: teamColor }}
                          />
                          <h3 className="truncate text-base font-bold text-slate-100">
                            {team.name}
                          </h3>
                          <span className="rounded-full border border-slate-600/80 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
                            {getTeamTypeLabel(team.team_type)}
                          </span>
                        </div>
                        {team.description ? (
                          <p className="mt-1 text-sm text-slate-300/90">
                            {team.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => beginEdit(team)}
                      >
                        Edit
                      </Button>
                      {!protectedTeam ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                          onClick={() => void removeTeam(team)}
                        >
                          Delete
                        </Button>
                      ) : (
                        <span className="inline-flex items-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                          Protected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
