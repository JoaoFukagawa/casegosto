// Cliente da Merchant API do iFood (app centralizado, grantType client_credentials).
// O token fica em ifood_state e é reaproveitado até perto de expirar: o iFood pode bloquear o app
// se pedirmos token novo antes da hora.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://merchant-api.ifood.com.br";
const RENEW_MARGIN_MS = 10 * 60_000;

export class IfoodError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

async function requestNewToken(db: SupabaseClient): Promise<string> {
  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new IfoodError("Credenciais do iFood não configuradas (IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET nos Secrets do Supabase).", 500);
  }
  const res = await fetch(`${BASE}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grantType: "client_credentials", clientId, clientSecret }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.accessToken) {
    throw new IfoodError(`Falha ao obter token do iFood (HTTP ${res.status})${body?.error?.message ? `: ${body.error.message}` : ""}`);
  }
  const expiresInS = Number(body.expiresIn) > 0 ? Number(body.expiresIn) : 3 * 3600;
  await db
    .from("ifood_state")
    .update({
      access_token: body.accessToken,
      token_expires_at: new Date(Date.now() + expiresInS * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");
  return body.accessToken;
}

async function getAccessToken(db: SupabaseClient, forceRenew: boolean): Promise<string> {
  if (!forceRenew) {
    const { data } = await db.from("ifood_state").select("access_token, token_expires_at").eq("id", "default").single();
    if (data?.access_token && data.token_expires_at && Date.parse(data.token_expires_at) - Date.now() > RENEW_MARGIN_MS) {
      return data.access_token;
    }
  }
  return requestNewToken(db);
}

export async function ifoodRequest(
  db: SupabaseClient,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
  const send = (token: string) =>
    fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  const res = await send(await getAccessToken(db, false));
  if (res.status !== 401) return res;
  return send(await getAccessToken(db, true));
}

export async function describeError(res: Response, what: string): Promise<string> {
  const text = await res.text().catch(() => "");
  return `${what}: HTTP ${res.status}${text ? ` — ${text.slice(0, 300)}` : ""}`;
}

// null = detalhes ainda não disponíveis (o evento PLACED pode chegar antes deles).
export async function getOrderDetails(db: SupabaseClient, orderId: string): Promise<any | null> {
  const res = await ifoodRequest(db, `/order/v1.0/orders/${encodeURIComponent(orderId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new IfoodError(await describeError(res, "Detalhes do pedido"));
  return res.json();
}

export async function postOrderAction(
  db: SupabaseClient,
  orderId: string,
  action: "confirm" | "readyToPickup" | "dispatch",
  body?: unknown,
): Promise<void> {
  const res = await ifoodRequest(db, `/order/v1.0/orders/${encodeURIComponent(orderId)}/${action}`, { method: "POST", body });
  if (!res.ok) throw new IfoodError(await describeError(res, `Ação ${action} no iFood`), res.status);
}
