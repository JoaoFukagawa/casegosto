import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, AlertTriangle, Target, CreditCard, Plus, Trash2 } from "lucide-react";
import { useMonthRevenue, useAssistenteBills } from "@/hooks/useAssistente";
import { useDashboardTodayOrders } from "@/hooks/useOrders";
import { useMonthExpenses } from "@/hooks/useExpenses";
import { useBills } from "@/hooks/useBills";
import { useDeleteBill } from "@/hooks/useBills";
import ChatTab from "@/components/assistente/ChatTab";
import LancarContaTab from "@/components/assistente/LancarContaTab";

type Bill = {
  id: string; nome: string; valor: number; categoria: string;
  status: "atrasada" | "vence-hoje" | "proxima" | "paga";
  meses_atrasada: number; due_date: string | null; paid_at: string | null;
};
type ChatMsg = { role: "user" | "assistant"; content: string; time: string };

const META_PADRAO = 5200;

function prioridadeDe(b: Pick<Bill, "status">): "high" | "medium" | "low" {
  return b.status === "atrasada" ? "high" : b.status === "vence-hoje" ? "medium" : "low";
}

export default function AssistenteFinanceiro() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<number>(() => Number(localStorage.getItem("meta_mensal") ?? META_PADRAO));
  const [billDialogOpen, setBillDialogOpen] = useState(false);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const selectedDate = format(today, "yyyy-MM-dd");

  const { data: receitaMes = 0 } = useMonthRevenue();
  const { data: allBills = [] } = useBills();
  const { data: todayOrders } = useDashboardTodayOrders(startOfDay);
  const { data: monthExpenses = [] } = useMonthExpenses(selectedDate);
  const deleteBill = useDeleteBill();

  useEffect(() => { localStorage.setItem("meta_mensal", String(meta)); }, [meta]);

  const unpaidBills = allBills.filter((b: Bill) => b.status !== "paga");
  const paidBills = allBills.filter((b: Bill) => b.status === "paga");
  const totalDividas = unpaidBills.reduce((s: number, b: Bill) => s + Number(b.valor), 0);
  const totalPago = paidBills.reduce((s: number, b: Bill) => s + Number(b.valor), 0);
  const criticas = unpaidBills.filter((b: Bill) => prioridadeDe(b) === "high").length;
  const metaSemana = Math.max(0, Math.round((meta - receitaMes) / 4));
  const progressoPct = meta > 0 ? Math.min(100, Math.round((receitaMes / meta) * 100)) : 0;
  const sorted = [...unpaidBills].sort((a: Bill, b: Bill) => {
    const o = { high: 0, medium: 1, low: 2 } as const;
    return o[prioridadeDe(a)] - o[prioridadeDe(b)];
  });

  const dayOrders = todayOrders || [];
  const dayRevenue = dayOrders.filter((o: any) => o.status !== "cancelado").reduce((s: number, o: any) => s + Number(o.total), 0);
  const dayExpenses = monthExpenses.filter((e: any) => e.expense_date === selectedDate);
  const dayCosts = dayExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const dayDelivered = dayOrders.filter((o: any) => o.status === "entregue").length;
  const dayPending = dayOrders.filter((o: any) => o.status !== "entregue" && o.status !== "cancelado").length;

  const monthCosts = monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const costsByCat = monthExpenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const CATEGORIAS_CONTAS = ["Moradia", "Energia/Água", "Ingredientes", "Transporte", "Internet/Telefone", "Funcionários", "Impostos", "Outros"];
  const CATEGORIAS_DESPESAS = [{ v: "mercado", l: "Mercado" }, { v: "embalagens", l: "Embalagens" }, { v: "gas", l: "Gás" }, { v: "entregador", l: "Entregador" }, { v: "outros", l: "Outros" }];

  const contexto = [
    `Data atual: ${format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    ``,
    `💰 RECEITA E META`,
    `Receita do mês: R$ ${receitaMes.toFixed(2)}`,
    `Meta mensal: R$ ${meta.toFixed(2)}`,
    `Progresso da meta: ${progressoPct}%`,
    `Meta semanal necessária: R$ ${metaSemana}`,
    ``,
    `📋 CONTAS`,
    `Total a pagar: R$ ${totalDividas.toFixed(2)} (${unpaidBills.length} pendentes)`,
    `Total pago no mês: R$ ${totalPago.toFixed(2)} (${paidBills.length} pagas)`,
    `Contas atrasadas: ${criticas}`,
    ``,
    `📦 HOJE (${format(today, "dd/MM/yyyy")})`,
    `Receita do dia: R$ ${dayRevenue.toFixed(2)}`,
    `Pedidos hoje: ${dayOrders.length} (${dayDelivered} entregues, ${dayPending} pendentes)`,
    `Despesas do dia: R$ ${dayCosts.toFixed(2)}`,
    `Lucro do dia (receita - despesas): R$ ${(dayRevenue - dayCosts).toFixed(2)}`,
    ``,
    `📊 CUSTOS DO MÊS POR CATEGORIA`,
    ...Object.entries(costsByCat).map(([cat, val]) => `  ${cat}: R$ ${Number(val).toFixed(2)}`),
    `  TOTAL: R$ ${monthCosts.toFixed(2)}`,
    ``,
    `📋 CONTAS PENDENTES`,
    ...(unpaidBills.length > 0
      ? unpaidBills.map((b: Bill) => `  ${b.nome}: R$ ${Number(b.valor).toFixed(2)} (${b.status}${b.meses_atrasada ? `, ${b.meses_atrasada}m atraso` : ""})${b.due_date ? ` - vencimento: ${b.due_date}` : ""}`)
      : ["  Nenhuma"]),
    ``,
    `📋 CONTAS PAGAS (últimas 10)`,
    ...(paidBills.length > 0
      ? paidBills.slice(-10).map((b: Bill) => `  ${b.nome}: R$ ${Number(b.valor).toFixed(2)}${b.paid_at ? ` (paga em ${format(new Date(b.paid_at), "dd/MM")})` : ""}`)
      : ["  Nenhuma"]),
    ``,
    `📋 DESPESAS DO MÊS (últimas 10)`,
    ...(monthExpenses.length > 0
      ? monthExpenses.slice(-10).map((e: any) => `  ${e.expense_date} - ${e.description}: R$ ${Number(e.amount).toFixed(2)} (${e.category})`)
      : ["  Nenhuma"]),
    ``,
    `📌 CATEGORIAS VÁLIDAS PARA CONTAS`,
    ...CATEGORIAS_CONTAS.map((c) => `  - ${c}`),
    ``,
    `📌 CATEGORIAS VÁLIDAS PARA DESPESAS`,
    ...CATEGORIAS_DESPESAS.map((c) => `  - ${c.l} (código: "${c.v}")`),
  ].join("\n");

  return (
    <div className="space-y-6">
      <PageHeader title="Assistente Financeiro" subtitle="Converse com a IA sobre o caixa da marmitaria." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard title="Receita do Mês" value={`R$ ${receitaMes.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Total em Dívidas" value={`R$ ${totalDividas.toFixed(2)}`} icon={CreditCard} variant="warning" />
        <StatsCard title="Meta Semanal" value={`R$${metaSemana}`} icon={Target} />
        <StatsCard title="Contas Críticas" value={criticas} icon={AlertTriangle} variant={criticas > 0 ? "warning" : "success"} />
      </div>

      {criticas >= 3 && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Atenção:</span> {criticas} contas atrasadas precisam de prioridade.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="lg:order-1">
          <ChatTab
            messages={messages} setMessages={setMessages}
            loading={loading} setLoading={setLoading}
            contexto={contexto}
          />
        </div>

        <div className="space-y-4 lg:order-2">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Meta Mensal</span>
                <span className="text-xs text-[var(--color-text-secondary)]">R$ {receitaMes.toFixed(0)} / R$ {meta}</span>
              </div>
              <Progress value={progressoPct} className="h-2" />
              <div className="flex items-center gap-2">
                <Input type="number" value={meta} onChange={(e) => setMeta(Number(e.target.value))} className="h-8 text-sm" />
                <span className="text-xs text-[var(--color-text-secondary)] shrink-0">{progressoPct}%</span>
              </div>
            </CardContent>
          </Card>

          <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full"><Plus className="h-4 w-4 mr-2" /> Lançar conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Lançar nova conta</DialogTitle></DialogHeader>
              <LancarContaTab onSuccess={() => setBillDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {sorted.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">Prioridades ({sorted.length})</p>
                <div className="space-y-1 max-h-[320px] overflow-y-auto">
                  {sorted.slice(0, 10).map((b) => {
                    const prio = prioridadeDe(b);
                    return (
                      <div key={b.id} className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] p-2 text-sm">
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${prio === "high" ? "bg-destructive" : prio === "medium" ? "bg-warning" : "bg-success"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{b.nome}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">R$ {Number(b.valor).toFixed(2)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-[var(--color-danger)]" onClick={() => deleteBill.mutate(b.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
