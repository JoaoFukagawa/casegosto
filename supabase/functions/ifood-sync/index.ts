// Edge function: polling de eventos do iFood (chamada a cada 30s pelo pg_cron).
// Pedido novo (PLACED) -> grava no sistema e confirma no iFood. Eventos de status -> atualizam o pedido local.
// O polling também mantém a loja online no iFood.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { mapIfoodOrder, nextLocalStatus } from "../_shared/ifood-map.ts";
import { describeError, getOrderDetails, ifoodRequest, postOrderAction } from "../_shared/ifood-api.ts";

const ORDER_STATUS_CODES = new Set(["PLACED", "CONFIRMED", "READY_TO_PICKUP", "DISPATCHED", "CONCLUDED", "CANCELLED"]);
const MIN_INTERVAL_MS = 25_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const now = () => new Date().toISOString();

async function discoverMerchantIds(db: SupabaseClient): Promise<string | null> {
  const res = await ifoodRequest(db, "/merchant/v1.0/merchants?page=1&size=100");
  if (!res.ok) return null;
  const list = await res.json().catch(() => []);
  const ids = (Array.isArray(list) ? list : []).map((m: any) => m?.id).filter(Boolean);
  if (!ids.length) return null;
  const joined = ids.join(",");
  await db.from("ifood_state").update({ merchant_ids: joined }).eq("id", "default");
  return joined;
}

async function importOrder(db: SupabaseClient, orderId: string): Promise<{ ack: boolean; imported: boolean }> {
  const detail = await getOrderDetails(db, orderId);
  if (!detail) return { ack: false, imported: false };

  const { data: existing } = await db.from("orders").select("id").eq("external_id", orderId).maybeSingle();
  if (!existing) {
    const { data: menu, error: menuError } = await db.from("menu_items").select("id, name, active");
    if (menuError) throw new Error(`Ler cardápio: ${menuError.message}`);
    const mapped = mapIfoodOrder(detail, menu ?? []);
    const { error } = await db.rpc("ifood_insert_order", {
      p_order: mapped.order,
      p_items: mapped.items,
      p_payments: mapped.payments,
    });
    if (error) throw new Error(`Gravar pedido: ${error.message}`);
  }

  // Confirmar de novo é ignorado pelo iFood, então reprocessar o evento é seguro.
  const status = String(detail.status ?? "").toUpperCase();
  if (!status || status === "PLACED") await postOrderAction(db, orderId, "confirm");
  return { ack: true, imported: !existing };
}

async function applyStatus(db: SupabaseClient, orderId: string, fullCode: string) {
  const { data: order } = await db.from("orders").select("id, status").eq("external_id", orderId).maybeSingle();
  if (!order) return;
  const next = nextLocalStatus(order.status, fullCode);
  const { error } = await db
    .from("orders")
    .update({ external_status: fullCode, ...(next ? { status: next } : {}) })
    .eq("id", order.id);
  if (error) throw new Error(`Atualizar status: ${error.message}`);
}

async function handleEvent(db: SupabaseClient, ev: any): Promise<{ ack: boolean; imported: boolean }> {
  const code = String(ev?.fullCode ?? "").toUpperCase();
  const orderId = typeof ev?.orderId === "string" ? ev.orderId : null;
  if (!orderId || !ORDER_STATUS_CODES.has(code)) return { ack: true, imported: false };
  if (code === "PLACED") return importOrder(db, orderId);
  await applyStatus(db, orderId, code);
  return { ack: true, imported: false };
}

async function sync(db: SupabaseClient, state: any) {
  const merchantIds = state?.merchant_ids ?? (await discoverMerchantIds(db));
  const res = await ifoodRequest(db, "/events/v1.0/events:polling", {
    headers: merchantIds ? { "x-polling-merchants": merchantIds } : {},
  });
  await db.from("ifood_state").update({ last_poll_at: now() }).eq("id", "default");
  if (res.status === 204) {
    // Fila vazia: não há evento antigo a ignorar, então a partir daqui tudo é importado.
    if (!state?.baseline_done) await db.from("ifood_state").update({ baseline_done: true }).eq("id", "default");
    return { events: 0, imported: 0, acked: 0, errors: [] as string[] };
  }
  if (!res.ok) throw new Error(await describeError(res, "Polling de eventos"));

  const raw = await res.json().catch(() => []);
  const events = (Array.isArray(raw) ? raw : [])
    .filter((e: any) => typeof e?.id === "string")
    .sort((a: any, b: any) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));

  const ack: string[] = [];
  const errors: string[] = [];
  let imported = 0;

  if (!state?.baseline_done) {
    // Primeira execução: só reconhece o que já estava na fila, sem importar pedidos anteriores à ativação.
    ack.push(...events.map((e: any) => e.id));
  } else {
    for (const ev of events) {
      try {
        const r = await handleEvent(db, ev);
        if (r.ack) ack.push(ev.id);
        if (r.imported) imported++;
      } catch (e) {
        errors.push(`${ev.fullCode ?? ev.code} ${ev.orderId ?? ""}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (ack.length) {
    const ackRes = await ifoodRequest(db, "/events/v1.0/events/acknowledgment", {
      method: "POST",
      body: ack.map((id) => ({ id })),
    });
    if (!ackRes.ok) errors.push(await describeError(ackRes, "Acknowledgment"));
    else if (!state?.baseline_done) await db.from("ifood_state").update({ baseline_done: true }).eq("id", "default");
  } else if (!state?.baseline_done) {
    await db.from("ifood_state").update({ baseline_done: true }).eq("id", "default");
  }

  return { events: events.length, imported, acked: ack.length, errors };
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: locked, error: lockError } = await db.rpc("ifood_try_lock", { p_seconds: 55 });
  if (lockError) return json({ error: lockError.message }, 500);
  if (!locked) return json({ skipped: "sincronização já em andamento" });

  try {
    const { data: state } = await db
      .from("ifood_state")
      .select("last_poll_at, baseline_done, merchant_ids")
      .eq("id", "default")
      .single();
    if (state?.last_poll_at && Date.now() - Date.parse(state.last_poll_at) < MIN_INTERVAL_MS) {
      return json({ skipped: "polling recente" });
    }

    const result = await sync(db, state);
    await db
      .from("ifood_state")
      .update(result.errors.length
        ? { last_error: result.errors.join(" | ").slice(0, 2000), last_error_at: now() }
        : { last_error: null, last_error_at: null })
      .eq("id", "default");
    return json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("ifood_state").update({ last_error: message.slice(0, 2000), last_error_at: now() }).eq("id", "default");
    return json({ error: message }, 500);
  } finally {
    await db.rpc("ifood_release_lock");
  }
});
