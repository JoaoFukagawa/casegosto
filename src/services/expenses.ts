import { supabase } from "@/integrations/supabase/client";

export async function getMonthExpenses(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", monthStart)
    .lte("expense_date", monthEnd)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReportExpenses(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createExpense(payload: {
  description: string;
  category: string;
  amount: number;
  expense_date: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("expenses").insert({
    ...payload,
    user_id: u.user.id,
  });
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
