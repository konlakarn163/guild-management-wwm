export type UserRole = "MEMBER" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED";

export interface BuildOption {
  label: string;
  color: string;
}

export interface GuildInfo {
  name: string;
  code: string;
  description: string;
  memberCount: number;
  build_options?: BuildOption[];
}

export interface GuildWarRegistration {
  id: string;
  day_id?: string | null;
  week_id: string;
  user_id: string;
  users?: {
    username?: string;
    discord_id?: string;
    character_name?: string;
    build?: string;
  };
}

export interface GuildWarRegistrationWindow {
  id: string;
  day_id: string;
  week_id: string;
  is_open: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OpenGuildWarRegistrationResponse {
  window: GuildWarRegistrationWindow | null;
  registrations: GuildWarRegistration[];
}

export interface TeamMember {
  id: string;
  user_id: string;
  username: string;
}

export interface StrategyNode {
  id: string;
  type: "circle" | "line" | "text";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  text?: string;
  color?: string;
}

export interface UserRow {
  id: string;
  username: string;
  discord_id?: string;
  role: UserRole;
  status: UserStatus;
  character_name?: string;
  build?: string;
  created_at?: string;
}

export interface GuildSettings {
  id?: string;
  name: string;
  code: string;
  description: string;
  discord_invite?: string | null;
  build_options?: BuildOption[];
}