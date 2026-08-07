import { supabase } from "@/integrations/supabase/client";
import { uuid } from "@/lib/uuid";

const PUBLIC_ORDER_USER_ID = "f6dd0c90-a2e6-4df9-8a30-1f7bcddd4e3e";

export async function getPublicMenuItems() {
  const { data: sold } = await supabase.rpc("get_today_sold_quantities");

  const soldMap: Record<string, number> = {};
  for (const item of sold || []) {
    soldMap[item.menu_item_id] = (soldMap[item.menu_item_id] || 0) + Number(item.sold_qty);
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
  const { data: sold } = await supabase.rpc("get_today_sold_quantities");

  const soldMap: Record<string, number> = {};
  for (const item of sold || []) {
    soldMap[item.menu_item_id] = (soldMap[item.menu_item_id] || 0) + Number(item.sold_qty);
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

  // Gera o ID no navegador em vez de pedir de volta ao banco (.select()) — o
  // visitante do cardápio online não tem permissão de leitura, só de inserção.
  const orderId = uuid();
  const order = {
    id: orderId,
    customer_name: payload.customer_name.trim(),
    customer_phone: payload.customer_phone?.trim() || null,
    delivery_type: payload.delivery_type,
    delivery_address: payload.delivery_type === "entrega" ? payload.delivery_address?.trim() || null : null,
    delivery_fee: fee,
    notes: payload.notes?.trim() || null,
    payment_method: payload.payment_method,
    status: "pendente",
    total,
    user_id: PUBLIC_ORDER_USER_ID,
    source: "online",
  };

  const { error: orderError } = await supabase.from("orders").insert(order);
  if (orderError) throw new Error(orderError.message);

  const orderItems = payload.items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    weight: item.weight || null,
    user_id: PUBLIC_ORDER_USER_ID,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  const paymentLabel = { pix: "PIX", dinheiro: "Dinheiro", cartao: "Cartão" }[payload.payment_method] || payload.payment_method;
  const { error: payError } = await supabase.from("order_payments").insert({
    order_id: orderId,
    method_value: payload.payment_method,
    method_label: paymentLabel,
    amount: total,
    user_id: PUBLIC_ORDER_USER_ID,
  });
  if (payError) throw new Error(payError.message);

  return order;
}
