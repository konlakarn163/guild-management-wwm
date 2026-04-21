import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";
import type { UserRole, UserStatus } from "../types/auth.js";

export interface UserFilter {
  status?: UserStatus;
  role?: UserRole;
  build?: string;
  search?: string;
}

export const usersService = {
  async listUsers(filter: UserFilter) {
    let query = supabaseAdmin
      .from("users")
      .select("id, username, discord_id, role, status, character_name, build, created_at")
      .order("created_at", { ascending: false });

    if (filter.status) {
      query = query.eq("status", filter.status);
    }

    if (filter.role) {
      query = query.eq("role", filter.role);
    }

    if (filter.build) {
      query = query.eq("build", filter.build);
    }

    if (filter.search) {
      query = query.ilike("username", `%${filter.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async updateUser(
    id: string,
    payload: { role?: UserRole; character_name?: string; build?: string; status?: UserStatus },
  ) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update(payload)
      .eq("id", id)
      .select("id, username, role, status, character_name, build")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async deleteUser(id: string) {
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (error) {
      throw new HttpError(500, error.message);
    }
  },

  async approveUser(id: string) {
    return this.updateUser(id, { status: "ACTIVE" });
  },

  async bulkApprove(ids: string[]) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ status: "ACTIVE" })
      .in("id", ids)
      .select("id, username, role, status");

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async rejectUser(id: string) {
    return this.updateUser(id, { status: "REJECTED" });
  },
};