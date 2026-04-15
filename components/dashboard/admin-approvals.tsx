"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { getAccessToken, getCurrentUser, getUserRole } from "@/lib/client-auth";
import type { UserRow } from "@/lib/types";

export function AdminApprovals() {
  const [pendingUsers, setPendingUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const pendingIds = useMemo(() => pendingUsers.map((user) => user.id), [pendingUsers]);

  const fetchPendingUsers = async () => {
    const user = await getCurrentUser();
    const role = getUserRole(user);
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      setMessage("Admin permissions required");
      return [] as UserRow[];
    }

    const token = await getAccessToken();
    if (!token) {
      setMessage("Please login first");
      return [] as UserRow[];
    }

    return apiFetch<UserRow[]>("/api/users?status=PENDING", { token });
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const users = await fetchPendingUsers();
      setPendingUsers(users);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const users = await fetchPendingUsers();
        setPendingUsers(users);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load pending users");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  const onApprove = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      await apiFetch(`/api/users/${id}/approve`, { method: "POST", token });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approve failed");
    }
  };

  const onReject = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      await apiFetch(`/api/users/${id}/reject`, { method: "POST", token });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reject failed");
    }
  };

  const onBulkApprove = async () => {
    if (pendingIds.length === 0) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setMessage("Please login first");
        return;
      }

      await apiFetch("/api/users/bulk-approve", {
        method: "POST",
        token,
        body: JSON.stringify({ ids: pendingIds }),
      });

      setMessage("Bulk approve completed");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk approve failed");
    }
  };

  return (
    <SectionCard title="Pending Approvals" subtitle="ADMIN สามารถ approve / reject พร้อมรองรับ bulk approval ได้">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => void onBulkApprove()}
          disabled={isLoading || pendingIds.length === 0}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300"
        >
          Bulk Approve
        </button>
      </div>
      {message ? <p className="mb-2 text-sm text-slate-300">{message}</p> : null}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`approval-skeleton-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {pendingUsers.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3"
            >
              <div>
                <p className="font-semibold text-slate-100">{user.username}</p>
                <p className="text-sm text-slate-300">
                  {user.character_name ?? "-"} / {user.build ?? "-"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onApprove(user.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void onReject(user.id)}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}