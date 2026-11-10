"use client";

import { useEffect, useState } from "react";
// import { AdminApprovals } from "@/components/dashboard/admin-approvals";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { CommandAnnouncementPanel } from "@/components/dashboard/command-announcement-panel";
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
  const canUseCommandAnnouncements =
    profile?.role === "COMMAND" || profile?.role === "ADMIN" || isSuperAdmin;

  const quickLinks = [
    { id: "section-command", label: "Command", show: canUseCommandAnnouncements },
    { id: "section-profile", label: "Profile", show: true },
    { id: "section-registration", label: "ลงทะเบียนวอ", show: isActive },
    { id: "section-teams", label: "จัดทีม", show: isActive },
  ].filter((link) => link.show);

  return (
    <>
      {quickLinks.length > 1 ? (
        <nav aria-label="Dashboard sections" className="flex flex-wrap gap-1.5 lg:hidden">
          {quickLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-300/40 hover:text-amber-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}

      {profileError ? <p className="text-sm text-rose-300">{profileError}</p> : null}

      {canUseCommandAnnouncements ? (
        <div id="section-command" className="scroll-mt-24">
          <CommandAnnouncementPanel />
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        <div id="section-profile" className="min-w-0 scroll-mt-24">
          <ProfileCard />
        </div>

        {isActive ? (
          <div id="section-registration" className="min-w-0 scroll-mt-24">
            <WarRegistration canManageAll={Boolean(isSuperAdmin)} />
          </div>
        ) : null}

        {!isLoadingProfile && profile && !isActive ? (
          <p className="rounded-xl border border-amber-300/25 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
            Account is pending approval. You can edit profile now; other dashboard features unlock after admin approval.
          </p>
        ) : null}
      </div>

      {isLoadingProfile ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : null}

      {isActive ? (
        <div id="section-teams" className="scroll-mt-24">
          <TeamBuilder canDrag={Boolean(isSuperAdmin)} />
        </div>
      ) : null}
    </>
  );
}
