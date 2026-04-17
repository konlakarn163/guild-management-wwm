"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type { BuildOption, UserRole, UserRow, UserStatus } from "@/lib/types";

interface PublicGuildResponse {
  build_options?: BuildOption[];
}

export function UserManagementPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | UserStatus>("ALL");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [buildOptions, setBuildOptions] = useState<BuildOption[]>([]);
  const [isLoadingBuildOptions, setIsLoadingBuildOptions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchUsers = async (nextSearch: string, nextStatus: "ALL" | UserStatus) => {
    const token = await getAccessToken();
    if (!token) {
      setMessage("Please login first");
      return [] as UserRow[];
    }

    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }
    if (nextStatus !== "ALL") {
      params.set("status", nextStatus);
    }

    const query = params.toString();
    return apiFetch<UserRow[]>(`/api/users${query ? `?${query}` : ""}`, { token });
  };

  const loadUsers = async (nextSearch = search, nextStatus = status) => {
    try {
      const data = await fetchUsers(nextSearch, nextStatus);
      setUsers(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load users");
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchUsers("", "ALL");
        setUsers(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load users");
      }
    };

    void run();
  }, []);

  useEffect(() => {
    const loadBuildOptions = async () => {
      try {
        const guildInfo = await apiFetch<PublicGuildResponse>("/api/public/guild");
        setBuildOptions(guildInfo.build_options ?? []);
      } catch {
        setBuildOptions([]);
      } finally {
        setIsLoadingBuildOptions(false);
      }
    };

    void loadBuildOptions();
  }, []);

  const getBuildOptionsForUser = (user: UserRow) => {
    if (!user.build) {
      return buildOptions;
    }

    if (buildOptions.some((option) => option.label === user.build)) {
      return buildOptions;
    }

    return [{ label: user.build, color: "#94a3b8" }, ...buildOptions];
  };

  const onRoleChange = async (id: string, role: UserRole) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      await apiFetch(`/api/users/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Role update failed");
    }
  };

  const onStatusChange = async (id: string, nextStatus: UserStatus) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      await apiFetch(`/api/users/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status update failed");
    }
  };

  const onUserFieldChange = (id: string, key: "character_name" | "build", value: string) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== id) {
          return user;
        }

        return {
          ...user,
          [key]: value,
        };
      }),
    );
  };

  const onSaveCharacterData = async (user: UserRow) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      const characterName = user.character_name?.trim();
      const build = user.build?.trim();

      const payload: { character_name?: string; build?: string } = {};
      if (characterName) {
        payload.character_name = characterName;
      }
      if (build) {
        payload.build = build;
      }

      if (!payload.character_name && !payload.build) {
        setMessage("Character name or build is required to save");
        return;
      }

      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      setMessage("Character data updated");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Character update failed");
    }
  };

  const onDelete = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      await apiFetch(`/api/users/${id}`, { method: "DELETE", token });
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  };

  return (
    <SectionCard title="User Management" subtitle="Search by username, filter by status, manage role and character data">
      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <input
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          placeholder="Search username"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={status} onValueChange={(value) => setStatus(value as "ALL" | UserStatus)}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="REJECTED">REJECT</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => void loadUsers(search, status)}
          className="rounded-xl bg-[#f5c548] px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Run Search
        </button>
      </div>

      {message ? <p className="mb-3 text-sm text-slate-300">{message}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-170 text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-2">Username</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2">Character</th>
              <th className="py-2">Build</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-800">
                <td className="py-2 font-semibold text-slate-100">{user.username}</td>
                <td className="py-2 text-slate-300">
                  <Select value={user.role} onValueChange={(value) => void onRoleChange(user.id, value as UserRole)}>
                    <SelectTrigger className="h-9 w-42.5 rounded-md px-2 py-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">MEMBER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 text-slate-300">
                  <Select value={user.status} onValueChange={(value) => void onStatusChange(user.id, value as UserStatus)}>
                    <SelectTrigger className="h-9 w-36 rounded-md px-2 py-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="REJECTED">REJECT</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 text-slate-300">
                  <input
                    className="h-9 w-44 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    value={user.character_name ?? ""}
                    placeholder="Character name"
                    onChange={(event) => onUserFieldChange(user.id, "character_name", event.target.value)}
                  />
                </td>
                <td className="py-2 text-slate-300">
                  <Select
                    value={user.build || undefined}
                    onValueChange={(value) => onUserFieldChange(user.id, "build", value)}
                    disabled={isLoadingBuildOptions}
                  >
                    <SelectTrigger className="h-9 w-44 rounded-md px-2 py-1">
                      <SelectValue placeholder="Select build / weapon" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBuildOptionsForUser(user).map((option, index) => (
                        <SelectItem key={`${option.label}-${option.color}-${index}`} value={option.label}>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onSaveCharacterData(user)}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(user.id)}
                      className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-1 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}