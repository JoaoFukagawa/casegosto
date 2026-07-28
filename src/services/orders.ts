import { supabase } from "@/integrations/supabase/client";

export async function getOrdersByDate(dayStart: string, dayEnd: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, menu_items(name)), order_payments(*)")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("delivery_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getHaverOrders() {
  const { data: haverPayments } = await supabase
    .from("order_payments")
    .select("order_id")
    .eq("method_value", "haver");
  const ids = Array.from(new Set((haverPayments || []).map((p) => p.order_id)));
  const orFilter = ids.length
    ? `payment_method.eq.haver,id.in.(${ids.join(",")})`
    : "payment_method.eq.haver";
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, menu_items(name)), order_payments(*)")
    .or(orFilter)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecentOrders(limit = 8) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getDashboardTodayOrders(startOfDay: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", startOfDay)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFinanceDayOrders(dayStart: string, dayEnd: string) {
  const { data, error } = await supabase.from("orders").select("*").gte("created_at", dayStart).lte("created_at", dayEnd);
  if (error) throw error;
  return data;
}

export async function getFinanceMonthOrders(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase.from("orders").select("*").gte("created_at", monthStart).lte("created_at", monthEnd);
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

export async function getAssistenteMonthRevenue(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd);
  if (error) throw error;
  return data;
}

export async function getHistoryOrders(selectedDate: string) {
  const dayStart = new Date(selectedDate + "T00:00:00").toISOString();
  const dayEnd = new Date(selectedDate + "T23:59:59").toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, menu_items(name)), order_payments(*)")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllOrders() {
  const { data, error } = await supabase.from("orders").select("customer_name, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReportsOrderData(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, menu_items(name)), order_payments(*)")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
