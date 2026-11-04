export type UserRole = "MEMBER" | "ADMIN" | "SUPER_ADMIN" | "COMMAND";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}