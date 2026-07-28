import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export async function sendChatMessage(messages: { role: string; content: string }[]) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch("/api/assistente", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || `Erro ${res.status}`);
  }

  return res.json() as Promise<{ reply: string; actions: any[]; paid: number }>;
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
