import { supabaseAdmin } from "../lib/supabase.js";
import { HttpError } from "../utils/http-error.js";

export const mapStrategiesService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from("map_strategies")
      .select("id, title, plan_date, data, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return data;
  },

  async create(payload: { title: string; plan_date: string; data: unknown; created_by: string }) {
    const { data, error } = await supabaseAdmin
      .from("map_strategies")
      .insert(payload)
      .select("id, title, plan_date, data, created_at")
      .single();

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },

  async update(id: string, payload: { title?: string; plan_date?: string; data?: unknown }) {
    const { data, error } = await supabaseAdmin
      .from("map_strategies")
      .update(payload)
      .eq("id", id)
      .select("id, title, plan_date, data, created_at")
      .single();

    if (error) {
      throw new HttpError(400, error.message);
    }

    return data;
  },
};