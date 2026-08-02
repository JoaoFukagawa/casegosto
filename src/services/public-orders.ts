import { supabase } from "@/integrations/supabase/client";

export async function getPublicMenuItems() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const { data: sold } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, orders!inner(created_at, status)")
    .gte("orders.created_at", startOfDay);

  const soldMap: Record<string, number> = {};
  for (const item of sold || []) {
    const order = item.orders as any;
    if (order?.status === "cancelado") continue;
    soldMap[item.menu_item_id] = (soldMap[item.menu_item_id] || 0) + item.quantity;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, description, price, category, unit_type, stock, photo_url, stock_by_unit")
    .eq("active", true)
    .order("category")
    .order("name");
  if (error) throw error;

  return (data || []).map((item) => {
    const base = item.stock as number | null;
    const remaining = base == null ? null : Math.max(0, base - (soldMap[item.id] || 0));
    return {
      ...item,
      stock: remaining,
    };
  });
}

export async function checkStock(items: { menu_item_id: string; quantity: number }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const { data: sold } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, orders!inner(created_at, status)")
    .gte("orders.created_at", startOfDay)
    .in("menu_item_id", items.map((i) => i.menu_item_id));

  const soldMap: Record<string, number> = {};
  for (const item of sold || []) {
    const order = item.orders as any;
    if (order?.status === "cancelado") continue;
    soldMap[item.menu_item_id] = (soldMap[item.menu_item_id] || 0) + item.quantity;
  }

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, stock")
    .in("id", items.map((i) => i.menu_item_id));

  const stockMap: Record<string, { name: string; stock: number | null }> = {};
  for (const mi of menuItems || []) {
    stockMap[mi.id] = { name: mi.name, stock: mi.stock as number | null };
  }

  const outOfStock: string[] = [];
  for (const item of items) {
    const info = stockMap[item.menu_item_id];
    if (!info || info.stock == null) continue;
    const soldQty = soldMap[item.menu_item_id] || 0;
    const remaining = info.stock - soldQty;
    if (remaining < item.quantity) {
      outOfStock.push(`${info.name} (disponível: ${Math.max(0, remaining)}, pedido: ${item.quantity})`);
    }
  }

  return { ok: outOfStock.length === 0, errors: outOfStock };
}

export async function createPublicOrder(payload: {
  customer_name: string;
  customer_phone?: string;
  delivery_type: "retirada" | "entrega";
  delivery_address?: string;
  notes?: string;
  payment_method: string;
  items: { menu_item_id: string; quantity: number; unit_price: number; weight?: number }[];
}) {
  const fee = payload.delivery_type === "entrega" ? 7 : 0;
  const total = payload.items.reduce((sum, item) => {
    if (item.weight) return sum + item.unit_price * item.weight;
    return sum + item.unit_price * item.quantity;
  }, 0) + fee;

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    customer_name: payload.customer_name.trim(),
    customer_phone: payload.customer_phone?.trim() || null,
    delivery_type: payload.delivery_type,
    delivery_address: payload.delivery_type === "entrega" ? payload.delivery_address?.trim() || null : null,
    delivery_fee: fee,
    notes: payload.notes?.trim() || null,
    payment_method: payload.payment_method,
    status: "pendente",
    total,
  }).select().single();

  if (orderError) throw new Error(orderError.message);

  const orderItems = payload.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    weight: item.weight || null,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  return order;
}
