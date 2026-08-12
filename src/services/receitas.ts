import { supabase } from "@/integrations/supabase/client";

export async function getMonthReceitas(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase
    .from("receitas")
    .select("*")
    .gte("receita_date", monthStart)
    .lte("receita_date", monthEnd)
    .order("receita_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReportReceitas(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("receitas")
    .select("*")
    .gte("receita_date", startDate)
    .lte("receita_date", endDate)
    .order("receita_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReceita(payload: {
  description: string;
  category: string;
  amount: number;
  receita_date: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("receitas").insert({
    ...payload,
    user_id: u.user.id,
  });
  if (error) throw error;
}

export async function deleteReceita(id: string) {
  const { error } = await supabase.from("receitas").delete().eq("id", id);
  if (error) throw error;
}
