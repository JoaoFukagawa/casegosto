import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY!;

function fmtBRL(n: number) { return `R$ ${n.toFixed(2)}`; }

function formatBills(bills: any[]) {
  if (!bills?.length) return "Nenhuma conta pendente cadastrada.";
  return bills.map((b, i) => {
    const venc = b.due_date ? new Date(b.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data";
    const atraso = b.meses_atrasada > 0 ? `, ${b.meses_atrasada}m atrasada` : "";
    return `${i + 1}. [id:${b.id}] ${b.nome} — ${fmtBRL(b.valor)} | ${b.categoria} | venc: ${venc} | ${b.status}${atraso}`;
  }).join("\n");
}

function formatPaidBills(bills: any[]) {
  if (!bills?.length) return "Nenhuma conta paga ainda.";
  return bills.map((b, i) => {
    const pago = b.paid_at ? new Date(b.paid_at).toLocaleDateString("pt-BR") : "?";
    return `${i + 1}. ${b.nome} — ${fmtBRL(b.valor)} | ${b.categoria} | pago em ${pago}`;
  }).join("\n");
}

function formatMenu(items: any[]) {
  if (!items?.length) return "Nenhum item de cardápio cadastrado.";
  return items.map((m, i) => `${i + 1}. ${m.name} (${m.category}) — ${fmtBRL(m.price)}${m.stock != null ? ` | estoque: ${m.stock} ${m.unit_type}` : ""}${m.active ? "" : " [inativo]"}`).join("\n");
}

function formatStock(items: any[]) {
  if (!items?.length) return "Nenhum gasto/ingrediente recente registrado.";
  return items.map((e, i) => `${i + 1}. ${e.description} (${e.category}) — ${fmtBRL(e.amount)} em ${new Date(e.expense_date).toLocaleDateString("pt-BR")}`).join("\n");
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

function mapExpenseCategory(cat: string): string | null {
  const c = (cat || "").toLowerCase();
  if (/(ingredient|mercado|merca|alimento|comida|hortifr|carne|frango|fruta|verdura|legume|couve)/.test(c)) return "mercado";
  if (/(embalag|marmitex|pote|sacola|descart)/.test(c)) return "embalagens";
  if (/(g[áa]s|botij)/.test(c)) return "gas";
  if (/(entregad|motoboy|ifood|uber|delivery)/.test(c)) return "entregador";
  return null;
}

const TOOLS = [
  {
    name: "registrar_conta",
    description: "Registra/cadastra uma nova conta ou despesa do usuário no sistema.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome curto da conta. Ex: 'Gás', 'Conta de luz extra'." },
        valor: { type: "number", description: "Valor em reais." },
        categoria: { type: "string", description: "Categoria: Moradia, Energia/Água, Ingredientes, Transporte, Internet/Telefone, Funcionários, Impostos, Outros." },
        due_date: { type: "string", description: "Vencimento YYYY-MM-DD. Se não informado, use hoje." },
      },
      required: ["nome", "valor", "categoria", "due_date"],
    },
  },
  {
    name: "dar_baixa_conta",
    description: "Marca uma conta JÁ CADASTRADA como paga.",
    input_schema: {
      type: "object",
      properties: {
        bill_id: { type: "string", description: "UUID da conta (use o id entre colchetes na lista)." },
      },
      required: ["bill_id"],
    },
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { messages, contexto } = req.body;
    if (!anthropicKey) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada" });
    }

    const authHeader = req.headers.authorization ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    const fim = new Date(ini); fim.setMonth(fim.getMonth() + 1);

    const [billsRes, menuRes, expensesRes, ordersRes, itemsRes] = await Promise.all([
      supabase.from("bills").select("id,nome,valor,categoria,status,meses_atrasada,due_date,paid_at").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("menu_items").select("name,category,price,stock,unit_type,active").order("category"),
      supabase.from("expenses").select("description,category,amount,expense_date").gte("expense_date", ini.toISOString().slice(0, 10)).order("expense_date", { ascending: false }).limit(30),
      supabase.from("orders").select("total,status,created_at,payment_method").gte("created_at", ini.toISOString()).lt("created_at", fim.toISOString()),
      supabase.from("order_items").select("quantity, weight, unit_price, menu_items(name), orders!inner(created_at, status)").gte("orders.created_at", ini.toISOString()).lt("orders.created_at", fim.toISOString()),
    ]);

    const allBills = billsRes.data ?? [];
    const pendingBills = allBills.filter((b: any) => b.status !== "paga");
    const paidBills = allBills.filter((b: any) => b.status === "paga").slice(0, 15);
    const menu = menuRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const orders = (ordersRes.data ?? []).filter((o: any) => o.status !== "cancelado");
    const orderItems = itemsRes.data ?? [];

    const totalDividas = pendingBills.reduce((s: number, b: any) => s + Number(b.valor), 0);
    const receitaMes = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const qtdPedidos = orders.length;

    const hoje = new Date().toISOString().slice(0, 10);
    const hojeBR = new Date().toLocaleDateString("pt-BR");

    // Daily breakdown
    const dailyMap: Record<string, { qty: number; total: number }> = {};
    for (const o of orders) {
      const day = (o.created_at || "").slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { qty: 0, total: 0 };
      dailyMap[day].qty += 1;
      dailyMap[day].total += Number(o.total);
    }
    const dailyLines = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => {
        const dObj = new Date(day + "T00:00:00");
        const nomeDia = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][dObj.getDay()];
        return `${day} (${nomeDia}): ${d.qty} pedidos, ${fmtBRL(d.total)}`;
      })
      .join("\n");

    // Items sold per day
    const itemsPerDay: Record<string, Record<string, { qty: number; weight: number }>> = {};
    for (const item of orderItems) {
      const order = (item as any).orders as any;
      if (!order || order.status === "cancelado") continue;
      const day = (order.created_at || "").slice(0, 10);
      const name = ((item as any).menu_items as any)?.name || "Item sem nome";
      if (!itemsPerDay[day]) itemsPerDay[day] = {};
      if (!itemsPerDay[day][name]) itemsPerDay[day][name] = { qty: 0, weight: 0 };
      itemsPerDay[day][name].qty += Number(item.quantity) || 0;
      itemsPerDay[day][name].weight += Number(item.weight) || 0;
    }
    const dailyItemsLines = Object.entries(itemsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => {
        const dObj = new Date(day + "T00:00:00");
        const nomeDia = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][dObj.getDay()];
        const itemStr = Object.entries(items)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, vals]) => {
            if (vals.weight > 0) return `${name}: ${vals.qty} unidades (${vals.weight.toFixed(1)}kg)`;
            return `${name}: ${vals.qty} unidades`;
          })
          .join(", ");
        return `${day} (${nomeDia}): ${itemStr}`;
      })
      .join("\n");

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

--- PEDIDOS POR DIA ---
${dailyLines}

--- ITENS VENDIDOS POR DIA ---
${dailyItemsLines}

${contexto ? `=== CONTEXTO ADICIONAL ===\n${contexto}\n` : ""}

=== COMO RESPONDER ===
- Seja direto e objetivo. Responda apenas o que foi perguntado, sem firulas, emojis, tabelas markdown, bullet points ou seções com títulos. Use frases curtas em português brasileiro.
- FINANÇAS: priorize contas que causam corte (luz, água) ou despejo (aluguel).
- CARDÁPIO: sugira pratos populares de marmitaria brasileira considerando o cardápio e ingredientes atuais.
- LANÇAMENTO AUTOMÁTICO: quando o usuário disser que teve um gasto/conta nova, CHAME registrar_conta.
- BAIXA DE CONTA: quando o usuário disser que pagou uma conta, CHAME dar_baixa_conta com o bill_id correto.`;

    const anthropicMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    let finalReply = "";
    const toolActions: any[] = [];
    const paidActions: any[] = [];

    for (let iter = 0; iter < 4; iter++) {
      const body: any = {
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemContent,
        messages: anthropicMessages,
        tools: TOOLS,
      };

      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!apiRes.ok) {
        const text = await apiRes.text();
        return res.status(apiRes.status).json({ error: `Erro IA: ${text}` });
      }

      const data = await apiRes.json();
      const content = data.content ?? [];

      let textContent = "";
      let toolUseBlock: any = null;

      for (const block of content) {
        if (block.type === "text") textContent += block.text;
        if (block.type === "tool_use") toolUseBlock = block;
      }

      if (!toolUseBlock) {
        finalReply = textContent;
        break;
      }

      const toolName = toolUseBlock.name;
      const args = toolUseBlock.input ?? {};

      let result: any = { ok: false, error: "Ferramenta desconhecida" };

      if (toolName === "registrar_conta") {
        if (!userId) {
          result = { ok: false, error: "Usuário não autenticado" };
        } else {
          const due_date = args.due_date || hoje;
          const cat = String(args.categoria ?? "Outros");
          const expenseCat = mapExpenseCategory(cat);
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
                category: expenseCat,
                amount: valor,
                expense_date: hoje,
              });
            }
            result = { ok: true, nome, valor, categoria: cat, due_date, lancado_em_despesas: isOperacional };
            toolActions.push({ nome, valor, categoria: cat });
          }
        }
      } else if (toolName === "dar_baixa_conta") {
        const billId = String(args.bill_id ?? "");
        const target = pendingBills.find((b: any) => b.id === billId);
        if (!target) {
          result = { ok: false, error: "Conta não encontrada ou já paga." };
        } else {
          const upd = await supabase.from("bills").update({ status: "paga", paid_at: new Date().toISOString() }).eq("id", billId);
          if (upd.error) {
            result = { ok: false, error: upd.error.message };
          } else {
            if (userId) {
              const expenseCat = mapExpenseCategory(target.categoria) ?? "outros";
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

      anthropicMessages.push({ role: "user", content: `Resultado da ferramenta ${toolName}: ${JSON.stringify(result)}` });
    }

    if (!finalReply) finalReply = "Ok!";

    return res.status(200).json({ reply: finalReply, actions: toolActions, paid: paidActions });
  } catch (e: any) {
    return res.status(500).json({ error: String(e) });
  }
}
