import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export async function sendChatMessage(messages: { role: string; content: string }[]) {
  const { data, error } = await supabase.functions.invoke("assistente-financeiro", {
    body: { messages },
  });
  if (error) throw error;
  return data as { reply: string; actions: any[]; paid: number };
}

export async function getMonthRevenue() {
  const ini = startOfMonth(new Date()).toISOString();
  const fim = endOfMonth(new Date()).toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select("total,status")
    .gte("created_at", ini)
    .lte("created_at", fim);
  if (error) throw error;
  return (data ?? []).filter((o: any) => o.status !== "cancelado").reduce((s: number, o: any) => s + Number(o.total), 0);
}
