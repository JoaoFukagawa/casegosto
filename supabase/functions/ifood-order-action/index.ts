// Edge function: muda o status de um pedido no sistema e, se ele veio do iFood, avisa o iFood antes.
//   pronto   -> readyToPickup
//   entregue -> readyToPickup (se ainda não) + dispatch quando a entrega é da loja (deliveredBy = MERCHANT)
//   cancelado -> não suportado pela API sem motivo: cancela-se pelo Gestor de Pedidos e o sync atualiza aqui.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getOrderDetails, IfoodError, postOrderAction } from "../_shared/ifood-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUSES = ["pendente", "preparando", "pronto", "entregue", "cancelado"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// O dispatch só é aceito depois que o iFood registra o readyToPickup, o que é assíncrono.
async function dispatchWithRetry(db: SupabaseClient, externalId: string) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await postOrderAction(db, externalId, "dispatch", { deliveredBy: "MERCHANT" });
      return;
    } catch (e) {
      lastError = e;
      await sleep(2000);
    }
  }
  throw lastError;
}

async function advanceIfood(db: SupabaseClient, order: any, target: "pronto" | "entregue") {
  const externalStatus = String(order.external_status ?? "").toUpperCase();
  if (externalStatus === "CANCELLED") throw new IfoodError("Este pedido foi cancelado no iFood.", 409);
  if (externalStatus === "CONCLUDED") return;

  const detail = await getOrderDetails(db, order.external_id);
  if (!detail) throw new IfoodError("O iFood não retornou os detalhes deste pedido. Tente de novo em instantes.");
  const merchantDelivery =
    String(detail.orderType ?? "").toUpperCase() === "DELIVERY" &&
    String(detail.delivery?.deliveredBy ?? "").toUpperCase() === "MERCHANT";

  let readyError: unknown = null;
  if (!["READY_TO_PICKUP", "DISPATCHED"].includes(externalStatus)) {
    try {
      await postOrderAction(db, order.external_id, "readyToPickup");
    } catch (e) {
      readyError = e;
    }
  }

  if (target === "entregue" && merchantDelivery && externalStatus !== "DISPATCHED") {
    await dispatchWithRetry(db, order.external_id);
    return;
  }
  if (readyError) throw readyError;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sessão expirada. Entre de novo." }, 401);

    const { orderId, status } = await req.json().catch(() => ({}));
    if (typeof orderId !== "string" || !STATUSES.includes(status)) return json({ error: "Requisição inválida." }, 400);

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, source, external_id, external_status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ error: "Pedido não encontrado." }, 404);

    if (order.source === "ifood" && order.external_id) {
      if (status === "cancelado") {
        return json({
          error: "Pedidos do iFood são cancelados pelo Gestor de Pedidos do iFood (ele pede o motivo). O sistema atualiza sozinho em seguida.",
        }, 409);
      }
      if (status === "pronto" || status === "entregue") await advanceIfood(db, order, status);
    }

    const { error } = await db.from("orders").update({ status }).eq("id", orderId);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, e instanceof IfoodError ? 502 : 500);
  }
});
