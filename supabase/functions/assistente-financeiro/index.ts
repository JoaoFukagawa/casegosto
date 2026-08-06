// Edge function: chat com IA para o assistente financeiro da marmitaria
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BILL_CATEGORIES, mapBillCategoryToExpenseCategory } from "../_shared/finance-categories.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtBRL(n: number) {
  return `R$ ${Number(n).toFixed(2)}`;
}

function formatBills(bills: any[]) {
  if (!bills?.length) return "Nenhuma conta pendente cadastrada.";
  return bills
    .map((b, i) => {
      const venc = b.due_date ? new Date(b.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data";
      const atraso = b.meses_atrasada > 0 ? `, ${b.meses_atrasada}m atrasada` : "";
      return `${i + 1}. [id:${b.id}] ${b.nome} — ${fmtBRL(b.valor)} | ${b.categoria} | venc: ${venc} | ${b.status}${atraso}`;
    })
    .join("\n");
}

function formatPaidBills(bills: any[]) {
  if (!bills?.length) return "Nenhuma conta paga ainda.";
  return bills
    .map((b, i) => {
      const pago = b.paid_at ? new Date(b.paid_at).toLocaleDateString("pt-BR") : "?";
      return `${i + 1}. ${b.nome} — ${fmtBRL(b.valor)} | ${b.categoria} | pago em ${pago}`;
    })
    .join("\n");
}

function formatMenu(items: any[]) {
  if (!items?.length) return "Nenhum item de cardápio cadastrado.";
  return items
    .map((m, i) => `${i + 1}. ${m.name} (${m.category}) — ${fmtBRL(m.price)}${m.stock != null ? ` | estoque: ${m.stock} ${m.unit_type}` : ""}${m.active ? "" : " [inativo]"}`)
    .join("\n");
}

function formatStock(items: any[]) {
  if (!items?.length) return "Nenhum gasto/ingrediente recente registrado.";
  return items
    .map((e, i) => `${i + 1}. ${e.description} (${e.category}) — ${fmtBRL(e.amount)} em ${new Date(e.expense_date).toLocaleDateString("pt-BR")}`)
    .join("\n");
}

function statusFromDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() < today.getTime()) return "atrasada";
  if (d.getTime() === today.getTime()) return "vence-hoje";
  return "proxima";
}
function mesesAtrasados(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() >= today.getTime()) return 0;
  return Math.max(1, (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth()));
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "registrar_conta",
      description:
        "Registra/cadastra uma nova conta ou despesa do usuário no sistema. Use SEMPRE que o usuário mencionar que teve um gasto, uma conta nova, uma despesa imprevista, ou pedir para anotar/lançar algo (ex: 'Tive uma conta de R$100', 'Gastei R$50 com gás', 'Lança aí R$80 de água').",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome curto e descritivo da conta. Ex: 'Gás', 'Conta de luz extra', 'Manutenção fogão'." },
          valor: { type: "number", description: "Valor em reais (apenas número, sem R$)." },
          categoria: {
            type: "string",
            description: `Categoria da conta. Sugestões: ${BILL_CATEGORIES.join(", ")}.`,
          },
          due_date: {
            type: "string",
            description: "Data de vencimento no formato YYYY-MM-DD. Se o usuário não mencionar data, use a data de hoje.",
          },
        },
        required: ["nome", "valor", "categoria", "due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dar_baixa_conta",
      description:
        "Marca uma conta JÁ CADASTRADA como paga. Use quando o usuário disser que pagou/deu baixa em uma conta existente (ex: 'Paguei o aluguel hoje', 'Dei baixa na conta de luz', 'A água foi paga'). Identifique pelo nome/categoria da conta na lista de contas pendentes informada no system prompt e passe o ID correspondente. Se houver ambiguidade (várias contas com nomes parecidos), pergunte ao usuário antes de chamar.",
      parameters: {
        type: "object",
        properties: {
          bill_id: { type: "string", description: "UUID da conta a ser marcada como paga (use o id mostrado entre colchetes na lista de contas pendentes)." },
        },
        required: ["bill_id"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, contexto } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    const fim = new Date(ini); fim.setMonth(fim.getMonth() + 1);

    const [billsRes, menuRes, expensesRes, ordersRes] = await Promise.all([
      supabase.from("bills").select("id,nome,valor,categoria,status,meses_atrasada,due_date,paid_at").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("menu_items").select("name,category,price,stock,unit_type,active").order("category"),
      supabase.from("expenses").select("description,category,amount,expense_date").gte("expense_date", ini.toISOString().slice(0, 10)).order("expense_date", { ascending: false }).limit(30),
      supabase.from("orders").select("total,status,created_at").gte("created_at", ini.toISOString()).lt("created_at", fim.toISOString()),
    ]);

    const allBills = billsRes.data ?? [];
    const pendingBills = allBills.filter((b: any) => b.status !== "paga");
    const paidBills = allBills.filter((b: any) => b.status === "paga").slice(0, 15);
    const menu = menuRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const orders = (ordersRes.data ?? []).filter((o: any) => o.status !== "cancelado");

    const totalDividas = pendingBills.reduce((s: number, b: any) => s + Number(b.valor), 0);
    const receitaMes = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const qtdPedidos = orders.length;

    const hoje = new Date().toISOString().slice(0, 10);
    const hojeBR = new Date().toLocaleDateString("pt-BR");

    const systemContent = `Você é um assistente completo de uma marmitaria familiar brasileira chamada CASEGOSTO. Você ajuda com finanças, cardápio e gestão.

DATA DE HOJE: ${hoje} (${hojeBR})

=== CONTAS PENDENTES A PAGAR (total: ${fmtBRL(totalDividas)}) ===
${formatBills(pendingBills)}

=== CONTAS JÁ PAGAS (recentes) ===
${formatPaidBills(paidBills)}

=== CARDÁPIO CADASTRADO ===
${formatMenu(menu)}

=== INGREDIENTES / GASTOS RECENTES DO MÊS ===
${formatStock(expenses)}

=== PEDIDOS DO MÊS ATUAL ===
Quantidade: ${qtdPedidos} pedidos | Receita: ${fmtBRL(receitaMes)}

${contexto ? `=== CONTEXTO ADICIONAL ===\n${contexto}\n` : ""}

=== COMO RESPONDER ===
- Seja direto, empático e em português brasileiro. Use valores em R$ formatados e dados REAIS acima.
- FINANÇAS: priorize contas que causam corte (luz, água) ou despejo (aluguel). Quando o usuário disser quanto tem disponível, sugira exatamente quais contas pagar com nomes e valores reais.
- CARDÁPIO: quando perguntarem sobre o que vender, sugira pratos populares de marmitaria brasileira (frango grelhado, picanha, feijoada, estrogonofe, parmegiana, bife acebolado, etc) sempre com proteína + carboidrato + salada. Dê sugestões por dia da semana. Considere o que já está no cardápio cadastrado e nos ingredientes/gastos recentes para evitar desperdício. Inclua dicas de preço (markup 2,5x a 3x).
- LANÇAMENTO AUTOMÁTICO: quando o usuário disser que teve um gasto/conta nova (ex: "Tive uma conta de R$100", "comprei R$52 de couve", "gastei R$80 com ingredientes", "tirei R$50 de retirada", "coloquei R$30 na caixinha", "peguei R$20 de troco"), CHAME registrar_conta. Se não houver data, use hoje (${hoje}). Use categorias claras: "Ingredientes" (couve, carne, mercado, comida), "Embalagens" (marmitex, potes), "Gás", "Entregador" (motoboy, ifood), "Retirada/Pró-labore" (retirada do dono, pró-labore), "Diária" (diária de funcionário), "Caixinha" (caixinha/gorjeta), "Troco" (troco de caixa) — essas viram despesa do mês automaticamente. Para outras (aluguel, luz, impostos), continue como conta a pagar normal.
- BAIXA DE CONTA: quando o usuário disser que pagou/deu baixa em uma conta existente (ex: "Paguei o aluguel hoje", "Dei baixa na conta de luz", "A água foi paga"), procure na lista de CONTAS PENDENTES acima a conta correspondente (faça match pelo nome/categoria, ignorando maiúsculas/minúsculas) e CHAME dar_baixa_conta com o bill_id (UUID entre colchetes). Se nenhuma conta bater, avise que não encontrou. Se houver várias possíveis, pergunte qual antes de chamar. Após confirmar a baixa, responda algo como "Pronto! Marquei o [nome] como pago hoje, ${hojeBR}."`;

    const convo: any[] = [{ role: "system", content: systemContent }, ...messages];
    let finalReply = "";
    const toolActions: { nome: string; valor: number; categoria: string }[] = [];
    const paidActions: { id: string; nome: string }[] = [];

    for (let iter = 0; iter < 4; iter++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "claude-sonnet-4-6", messages: convo, tools: TOOLS }),
      });

      if (res.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde e tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ error: "Erro IA: " + text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalReply = msg.content ?? "";
        break;
      }

      convo.push(msg);
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch {}

        let result: any = { ok: false, error: "Ferramenta desconhecida" };

        if (fnName === "registrar_conta") {
          if (!userId) {
            result = { ok: false, error: "Usuário não autenticado" };
          } else {
            const due_date = args.due_date || hoje;
            const cat = String(args.categoria ?? "Outros");
            const expenseCat = mapBillCategoryToExpenseCategory(cat);
            const isOperacional = expenseCat !== null;
            const valor = Number(args.valor ?? 0);
            const nome = String(args.nome ?? "Conta");

            const billPayload: any = {
              user_id: userId,
              nome,
              valor,
              categoria: cat,
              status: isOperacional ? "paga" : statusFromDate(due_date),
              meses_atrasada: isOperacional ? 0 : mesesAtrasados(due_date),
              due_date,
            };
            if (isOperacional) billPayload.paid_at = new Date().toISOString();

            const insertRes = await supabase.from("bills").insert(billPayload);
            if (insertRes.error) {
              result = { ok: false, error: insertRes.error.message };
            } else {
              if (isOperacional) {
                await supabase.from("expenses").insert({
                  user_id: userId,
                  description: nome,
                  category: expenseCat!,
                  amount: valor,
                  expense_date: hoje,
                });
              }
              result = { ok: true, nome, valor, categoria: cat, due_date, lancado_em_despesas: isOperacional };
              toolActions.push({ nome, valor, categoria: cat });
            }
          }
        } else if (fnName === "dar_baixa_conta") {
          const billId = String(args.bill_id ?? "");
          const target = pendingBills.find((b: any) => b.id === billId);
          if (!target) {
            result = { ok: false, error: "Conta não encontrada ou já paga." };
          } else {
            const upd = await supabase
              .from("bills")
              .update({ status: "paga", paid_at: new Date().toISOString() })
              .eq("id", billId);
            if (upd.error) {
              result = { ok: false, error: upd.error.message };
            } else {
              if (userId) {
                const expenseCat = mapBillCategoryToExpenseCategory(target.categoria) ?? "outros";
                await supabase.from("expenses").insert({
                  user_id: userId,
                  description: target.nome,
                  category: expenseCat,
                  amount: Number(target.valor),
                  expense_date: hoje,
                });
              }
              result = { ok: true, nome: target.nome, valor: target.valor, paid_at: hojeBR };
              paidActions.push({ id: billId, nome: target.nome });
            }
          }
        }
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    if (!finalReply) finalReply = "Ok!";

    return new Response(JSON.stringify({ reply: finalReply, actions: toolActions, paid: paidActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
