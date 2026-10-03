// Tradução do pedido do iFood (GET /order/v1.0/orders/{id}) para as tabelas do sistema.
// Sem dependências: usado pelas Edge Functions (Deno) e testado com Vitest.

export const OWNER_USER_ID = "f6dd0c90-a2e6-4df9-8a30-1f7bcddd4e3e";

export type MenuItemRef = { id: string; name: string; active?: boolean };

export type OrderOption = { name: string; quantity: number | null; group: string | null };

export type MappedItem = {
  menu_item_id: string | null;
  item_name: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  options: OrderOption[] | null;
};

export type MappedPayment = { method_value: string; method_label: string; amount: number };

export type MappedOrder = {
  order: Record<string, string | number | null>;
  items: MappedItem[];
  payments: MappedPayment[];
  unmatched: string[];
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export const normalizeName = (s: unknown) =>
  (typeof s === "string" ? s : "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function timeInSaoPaulo(iso: unknown): string | null {
  const s = str(iso);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const hhmm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${hhmm}:00`;
}

function formatAddress(addr: any): string | null {
  if (!addr || typeof addr !== "object") return null;
  const street = str(addr.formattedAddress) ?? [str(addr.streetName), str(addr.streetNumber)].filter(Boolean).join(", ");
  const parts = [street, str(addr.neighborhood), str(addr.complement)];
  const ref = str(addr.reference);
  if (ref) parts.push(`Ref: ${ref}`);
  return parts.filter(Boolean).join(", ") || null;
}

function flattenOptions(options: unknown): OrderOption[] {
  if (!Array.isArray(options)) return [];
  const out: OrderOption[] = [];
  for (const o of options) {
    const name = str(o?.name);
    if (!name) continue;
    out.push({ name, quantity: num(o?.quantity), group: str(o?.groupName) });
    if (Array.isArray(o?.customizations)) {
      for (const c of o.customizations) {
        const cName = str(c?.name);
        if (cName) out.push({ name: cName, quantity: num(c?.quantity), group: name });
      }
    }
  }
  return out;
}

const OFFLINE_METHODS: Record<string, [string, string]> = {
  CASH: ["dinheiro", "Dinheiro"],
  CREDIT: ["cartao", "Cartão de crédito"],
  DEBIT: ["cartao", "Cartão de débito"],
  PIX: ["pix", "PIX"],
  MEAL_VOUCHER: ["vale", "Vale-refeição"],
  FOOD_VOUCHER: ["vale", "Vale-alimentação"],
};

function mapPayments(payments: any): { list: MappedPayment[]; changeFor: number | null } {
  const methods = Array.isArray(payments?.methods) ? payments.methods : [];
  const list: MappedPayment[] = [];
  let changeFor: number | null = null;
  for (const m of methods) {
    const amount = round2(num(m?.value) ?? 0);
    const method = String(m?.method ?? "").toUpperCase();
    const prepaid = m?.prepaid === true || String(m?.type ?? "").toUpperCase() === "ONLINE";
    if (prepaid) {
      list.push({ method_value: "ifood", method_label: "iFood (pago online)", amount });
      continue;
    }
    const [value, label] = OFFLINE_METHODS[method] ?? ["outro", str(m?.method) ?? "Outro"];
    const brand = str(m?.card?.brand);
    list.push({ method_value: value, method_label: `${label}${brand ? ` ${brand}` : ""} (na entrega)`, amount });
    const change = num(m?.cash?.changeFor);
    if (change !== null && change > 0) changeFor = change;
  }
  return { list, changeFor };
}

export function mapIfoodOrder(detail: any, menuItems: MenuItemRef[]): MappedOrder {
  // Ativos por último para vencerem em nomes repetidos.
  const byName = new Map<string, string>();
  for (const m of [...menuItems].sort((a, b) => Number(a.active ?? true) - Number(b.active ?? true))) {
    byName.set(normalizeName(m.name), m.id);
  }

  const unmatched: string[] = [];
  const items: MappedItem[] = (Array.isArray(detail?.items) ? detail.items : []).map((it: any) => {
    const quantity = Math.max(1, Math.round(num(it?.quantity) ?? 1));
    const total = num(it?.totalPrice) ?? ((num(it?.unitPrice) ?? 0) + (num(it?.optionsPrice) ?? 0)) * quantity;
    const options = flattenOptions(it?.options);
    const name = str(it?.name);
    // Item sem par no cardápio: tenta pelo complemento (cardápios do iFood que vendem "Marmita" e o prato como opção).
    let menuItemId = byName.get(normalizeName(name)) ?? null;
    if (!menuItemId) {
      const viaOption = [...new Set(options.map((o) => byName.get(normalizeName(o.name))).filter(Boolean))];
      if (viaOption.length === 1) menuItemId = viaOption[0] as string;
    }
    if (!menuItemId && name) unmatched.push(name);
    return {
      menu_item_id: menuItemId,
      item_name: name,
      quantity,
      unit_price: round2(total / quantity),
      notes: str(it?.observations),
      options: options.length ? options : null,
    };
  });

  const { list: payments, changeFor } = mapPayments(detail?.payments);
  const paymentValues = [...new Set(payments.map((p) => p.method_value))];

  const orderType = String(detail?.orderType ?? "").toUpperCase();
  const isDelivery = orderType === "DELIVERY";
  const delivery = detail?.delivery ?? {};
  const scheduledStart = detail?.schedule?.deliveryDateTimeStart ?? detail?.scheduled?.schedule?.deliveryDateTimeStart;
  const deliveryTime = String(detail?.orderTiming ?? "").toUpperCase() === "SCHEDULED" ? timeInSaoPaulo(scheduledStart) : null;

  const phone = str(detail?.customer?.phone?.number);
  const localizer = str(detail?.customer?.phone?.localizer);

  const notes = [
    unmatched.length ? `Itens sem correspondência no cardápio (não baixam estoque): ${unmatched.join(", ")}` : null,
    changeFor !== null ? `Levar troco para ${brl(changeFor)}` : null,
    deliveryTime ? `Pedido agendado para ${deliveryTime.slice(0, 5)}` : null,
    str(delivery?.observations) ? `Obs. entrega: ${str(delivery.observations)}` : null,
    str(detail?.takeout?.observations) ? `Obs. retirada: ${str(detail.takeout.observations)}` : null,
    str(detail?.extraInfo) ? `Info: ${str(detail.extraInfo)}` : null,
    str(delivery?.pickupCode) ? `Código de coleta: ${str(delivery.pickupCode)}` : null,
  ].filter(Boolean).join("\n");

  return {
    order: {
      external_id: str(detail?.id),
      display_id: str(detail?.displayId),
      external_status: str(detail?.status)?.toUpperCase() ?? "PLACED",
      customer_name: str(detail?.customer?.name) ?? "Cliente iFood",
      customer_phone: phone ? (localizer ? `${phone} · ID ${localizer}` : phone) : null,
      status: nextLocalStatus("pendente", String(detail?.status ?? "").toUpperCase()) ?? "pendente",
      notes: notes || null,
      total: round2(num(detail?.total?.orderAmount) ?? items.reduce((s, i) => s + i.unit_price * i.quantity, 0)),
      created_at: str(detail?.createdAt),
      delivery_type: isDelivery ? "entrega" : "retirada",
      delivery_address: isDelivery ? formatAddress(delivery?.deliveryAddress) : null,
      payment_method: paymentValues.length === 1 ? paymentValues[0] : paymentValues.length > 1 ? "misto" : "ifood",
      delivery_fee: isDelivery ? round2(num(detail?.total?.deliveryFee) ?? 0) : 0,
      delivery_time: deliveryTime,
      user_id: OWNER_USER_ID,
    },
    items,
    payments,
    unmatched,
  };
}

const LOCAL_RANK: Record<string, number> = { pendente: 0, preparando: 1, pronto: 2, entregue: 3 };

const IFOOD_TO_LOCAL: Record<string, string> = {
  READY_TO_PICKUP: "pronto",
  DISPATCHED: "entregue",
  CONCLUDED: "entregue",
  CANCELLED: "cancelado",
};

// Status que um evento do iFood deve aplicar ao pedido local; null = não mexe. Só avança, nunca volta.
export function nextLocalStatus(current: string, fullCode: string): string | null {
  const target = IFOOD_TO_LOCAL[fullCode];
  if (!target || current === "cancelado") return null;
  if (target === "cancelado") return "cancelado";
  return (LOCAL_RANK[target] ?? 0) > (LOCAL_RANK[current] ?? 0) ? target : null;
}
