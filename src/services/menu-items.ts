import { supabase } from "@/integrations/supabase/client";

export async function getMenuItems() {
  const { data, error } = await supabase.from("menu_items").select("*").order("category").order("name");
  if (error) throw error;
  return data;
}

export async function getActiveMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createMenuItem(payload: any) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("menu_items").insert({ ...payload, user_id: u.user.id });
  if (error) throw error;
}

export async function updateMenuItem(id: string, payload: any) {
  const { error } = await supabase.from("menu_items").update(payload).eq("id", id);
  if (error) throw error;
}

export async function toggleMenuItemActive(id: string, active: boolean) {
  const { error } = await supabase.from("menu_items").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function updateMenuItemStock(id: string, stock: number | null) {
  const { error } = await supabase.from("menu_items").update({ stock }).eq("id", id);
  if (error) throw error;
}

export async function updateMenuItemStockByUnit(id: string, stock_by_unit: boolean) {
  const { error } = await supabase.from("menu_items").update({ stock_by_unit }).eq("id", id);
  if (error) throw error;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}
