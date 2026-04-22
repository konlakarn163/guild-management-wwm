"use client";

import { useEffect, useState } from "react";
// import { AdminApprovals } from "@/components/dashboard/admin-approvals";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { TeamBuilder } from "@/components/dashboard/team-builder";
import { WarRegistration } from "@/components/dashboard/war-registration";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import type { UserRole, UserStatus } from "@/lib/types";

interface DashboardProfile {
  role: UserRole;
  status: UserStatus;
}

export function DashboardShell() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setProfileError("Please login first");
          return;
        }

        const data = await apiFetch<DashboardProfile>("/api/profile/me", { token });
        setProfile(data);
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();
  }, []);

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";
  const isActive = profile?.status === "ACTIVE";

  return (
    <>
      <ProfileCard />

      {isLoadingProfile ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : null}

      {profileError ? <p className="text-sm text-rose-300">{profileError}</p> : null}

      {!isLoadingProfile && profile && !isActive ? (
        <p className="rounded-xl border border-amber-300/25 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          Account is pending approval. You can edit profile now; other dashboard features unlock after admin approval.
        </p>
      ) : null}

      {isActive ? (
        <>
          <WarRegistration canManageAll={Boolean(isSuperAdmin)} />
          <TeamBuilder canDrag={Boolean(isSuperAdmin)} />
          {/* {isAdmin ? <AdminApprovals /> : null} */}
        </>
      ) : null}
    </>
  );
}
