import { supabase } from "@/integrations/supabase/client";

type PratoRaw = { nome_prato: string; data: string; quantidade_vendida: number };

type OrderItemSold = {
  menu_item_id: string;
  quantity: number;
  weight: number | null;
  orders: { status: string; created_at: string } | null;
};

type OrderItemStock = OrderItemSold & {
  menu_items: { stock_by_unit: boolean; unit_type: string } | null;
};

export async function getPratosRaw(monthStart: string, monthEnd: string): Promise<PratoRaw[]> {
  const { data, error } = await supabase
    .from("pratos")
    .select("nome_prato, data, quantidade_vendida")
    .gte("data", monthStart)
    .lte("data", monthEnd)
    .order("data", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPratosRanking(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase
    .from("pratos")
    .select("nome_prato, data, quantidade_vendida")
    .gte("data", monthStart)
    .lte("data", monthEnd);
  if (error) throw error;

  const map: Record<string, { nome: string; dias: Set<string>; qtd: number }> = {};
  for (const p of data || []) {
    const key = p.nome_prato.trim().toLowerCase();
    if (!map[key]) map[key] = { nome: p.nome_prato, dias: new Set(), qtd: 0 };
    map[key].dias.add(p.data);
    map[key].qtd += p.quantidade_vendida || 0;
  }
  return Object.values(map)
    .map((r) => ({ nome: r.nome, dias: r.dias.size, qtd: r.qtd }))
    .sort((a, b) => b.qtd - a.qtd);
}

export async function getSoldToday(dayStart: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, weight, orders!inner(created_at, status)")
    .gte("orders.created_at", dayStart);
  if (error) throw error;

  const sold: Record<string, { qty: number; weight: number }> = {};
  for (const item of (data ?? []) as unknown as OrderItemSold[]) {
    const order = item.orders;
    if (order?.status === "cancelado") continue;
    if (!sold[item.menu_item_id]) sold[item.menu_item_id] = { qty: 0, weight: 0 };
    sold[item.menu_item_id].qty += item.quantity;
    if (item.weight) sold[item.menu_item_id].weight += item.weight;
  }
  return sold;
}

export async function getTodayOrderItems(dayStart: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, weight, orders!inner(status, created_at), menu_items(stock_by_unit, unit_type)")
    .gte("orders.created_at", dayStart);
  if (error) throw error;
  return (data ?? []) as unknown as OrderItemStock[];
}
