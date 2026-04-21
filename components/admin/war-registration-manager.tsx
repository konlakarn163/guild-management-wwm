"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Calendar } from "@/components/ui/calendar";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type { GuildWarRegistrationWindow } from "@/lib/types";

function formatDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
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

export function WarRegistrationManager() {
  const [windows, setWindows] = useState<GuildWarRegistrationWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaningRegistrations, setIsCleaningRegistrations] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    setActionLoading(id + "_open");
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
    setActionLoading(id + "_close");
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

  const handleDelete = async (id: string, dayId: string) => {
    const confirmed = window.confirm(`Delete registration window for ${dayId}?`);
    if (!confirmed) {
      return;
    }

    setActionLoading(id + "_delete");
    try {
      const token = await getAccessToken();
      if (!token) return;
      await apiFetch(`/api/guild-war/windows/${id}`, { method: "DELETE", token });
      toast.success("Window deleted");
      await loadWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete window");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupOldRegistrations = async () => {
    const confirmed = window.confirm("Delete registration records from previous months? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setIsCleaningRegistrations(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const result = await apiFetch<{ cutoffDate: string; deletedCount: number }>(
        "/api/guild-war/registrations/cleanup/previous-months",
        { method: "DELETE", token },
      );

      toast.success(`Deleted ${result.deletedCount} registrations before ${result.cutoffDate}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clean old registrations");
    } finally {
      setIsCleaningRegistrations(false);
    }
  };

  const openCount = windows.filter((w) => w.is_open).length;

  return (
    <SectionCard title="War Registration Windows" subtitle="Create and manage registration windows for Guild War days">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Date picker */}
        <div className="flex-shrink-0 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-200">Pick a Saturday or Sunday</p>
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start rounded-xl text-left text-slate-100">
                {formatPickerDate(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" sideOffset={8} collisionPadding={16} className="w-[19rem] overflow-visible p-0">
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

        {/* Windows list */}
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
                const isLoadingOpen = actionLoading === win.id + "_open";
                const isLoadingClose = actionLoading === win.id + "_close";
                const isLoadingDelete = actionLoading === win.id + "_delete";

                return (
                  <li
                    key={win.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      isOpen
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-slate-700/60 bg-slate-900/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">{formatDateLabel(win.day_id)}</p>
                      <p className="text-xs text-slate-400">Week: {win.week_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isOpen
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-700/60 text-slate-400"
                        }`}
                      >
                        {isOpen ? "OPEN" : "CLOSED"}
                      </span>
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
  );
}
