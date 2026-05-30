import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Truck, CalendarDays, Check, Undo2, AlertTriangle, FileText } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Pagamentos from "@/pages/Pagamentos";

const EXPENSE_CATEGORIES = [
  { value: "mercado", label: "🛒 Mercado" },
  { value: "embalagens", label: "📦 Embalagens" },
  { value: "gas", label: "🔥 Gás" },
  { value: "entregador", label: "🛵 Entregador" },
  { value: "outros", label: "📋 Outros" },
];

export default function Financeiro() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    category: "mercado",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  const dayStart = startOfDay(parseISO(selectedDate)).toISOString();
  const dayEnd = endOfDay(parseISO(selectedDate)).toISOString();
  const monthStart = startOfMonth(parseISO(selectedDate)).toISOString();
  const monthEnd = endOfMonth(parseISO(selectedDate)).toISOString();

  // Orders for the selected day
  const { data: dayOrders } = useQuery({
    queryKey: ["financeiro-orders-day", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);
      if (error) throw error;
      return data;
    },
  });

  // Orders for the month
  const { data: monthOrders } = useQuery({
    queryKey: ["financeiro-orders-month", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);
      if (error) throw error;
      return data;
    },
  });

  // Expenses for the month
  const { data: monthExpenses } = useQuery({
    queryKey: ["financeiro-expenses-month", selectedDate],
    queryFn: async () => {
      const monthStartDate = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const monthEndDate = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", monthStartDate)
        .lte("expense_date", monthEndDate)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Bills (contas a pagar)
  const { data: allBills = [] } = useQuery({
    queryKey: ["financeiro-bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills" as any)
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [billStatusFilter, setBillStatusFilter] = useState<string>("todas");
  const [billPeriod, setBillPeriod] = useState<"mes" | "dia" | "todas">("mes");

  function billRealStatus(b: any): "paga" | "atrasada" | "vence-hoje" | "proxima" {
    if (b.status === "paga" || b.paid_at) return "paga";
    if (!b.due_date) return (b.status as any) ?? "proxima";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(b.due_date + "T00:00:00");
    if (d.getTime() < today.getTime()) return "atrasada";
    if (d.getTime() === today.getTime()) return "vence-hoje";
    return "proxima";
  }

  const monthStartDate = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
  const monthEndDate = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");

  const billsOfMonth = allBills.filter((b) => {
    const ref = b.paid_at ? format(parseISO(b.paid_at), "yyyy-MM-dd") : b.due_date;
    if (!ref) return false;
    return ref >= monthStartDate && ref <= monthEndDate;
  });

  const pendingAll = allBills.filter((b) => billRealStatus(b) !== "paga");
  const overdueAll = allBills.filter((b) => billRealStatus(b) === "atrasada");
  const paidThisMonth = billsOfMonth.filter((b) => billRealStatus(b) === "paga");

  const totalPendentes = pendingAll.reduce((s, b) => s + Number(b.valor), 0);
  const totalAtrasadas = overdueAll.reduce((s, b) => s + Number(b.valor), 0);
  const totalPagasMes = paidThisMonth.reduce((s, b) => s + Number(b.valor), 0);

  const billLancadaEm = (b: any) => (b.created_at ? format(parseISO(b.created_at), "yyyy-MM-dd") : null);

  const filteredBills = allBills
    .filter((b) => {
      // "todas": geral, sem recorte de data
      if (billPeriod === "todas") return true;
      // "dia": contas lançadas na data selecionada (por data de lançamento / created_at)
      if (billPeriod === "dia") return billLancadaEm(b) === selectedDate;
      // "mes" (padrão): pendentes sempre + pagas do mês selecionado
      const ref = b.paid_at ? format(parseISO(b.paid_at), "yyyy-MM-dd") : b.due_date;
      const isPaid = billRealStatus(b) === "paga";
      if (isPaid) return ref && ref >= monthStartDate && ref <= monthEndDate;
      if (!ref) return true;
      // Pendentes do mês ou anteriores ainda em aberto
      return ref <= monthEndDate;
    })
    .filter((b) => billStatusFilter === "todas" || billRealStatus(b) === billStatusFilter)
    .sort((a, b) => {
      const order = { atrasada: 0, "vence-hoje": 1, proxima: 2, paga: 3 } as const;
      return (order[billRealStatus(a)] - order[billRealStatus(b)]) || ((a.due_date ?? "") > (b.due_date ?? "") ? 1 : -1);
    });

  const markBillPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bills" as any)
        .update({ status: "paga", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Conta marcada como paga ✓");
    },
    onError: () => toast.error("Erro ao dar baixa"),
  });

  const undoBillPaid = useMutation({
    mutationFn: async (bill: any) => {
      let newStatus: string = "proxima";
      if (bill.due_date) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const d = new Date(bill.due_date + "T00:00:00");
        if (d.getTime() < today.getTime()) newStatus = "atrasada";
        else if (d.getTime() === today.getTime()) newStatus = "vence-hoje";
      }
      const { error } = await supabase
        .from("bills" as any)
        .update({ status: newStatus, paid_at: null })
        .eq("id", bill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Baixa desfeita");
    },
    onError: () => toast.error("Erro ao desfazer"),
  });

  // Delivered orders for the day (for delivery driver)
  const deliveredToday = dayOrders?.filter(
    (o) => o.status === "entregue" && o.delivery_type === "entrega"
  ) ?? [];

  const addExpense = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("expenses").insert({
        description: newExpense.description,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        expense_date: newExpense.expense_date,
        user_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-expenses-month"] });
      setDialogOpen(false);
      setNewExpense({ description: "", category: "mercado", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
      toast.success("Despesa adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar despesa"),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-expenses-month"] });
      toast.success("Despesa removida!");
    },
  });

  // Calculations
  const dayRevenue = dayOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const monthRevenue = monthOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const monthCosts = monthExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const monthProfit = monthRevenue - monthCosts;

  // Group expenses by category
  const costsByCategory = monthExpenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground">
            Controle de custos, receitas e lucro — {format(parseISO(selectedDate), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList>
          <TabsTrigger value="resumo">📊 Resumo</TabsTrigger>
          <TabsTrigger value="contas">📄 Contas a pagar</TabsTrigger>
          <TabsTrigger value="formas">💳 Formas de pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-6 mt-4">
          {/* Resumo de contas */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Contas pendentes"
              value={String(pendingAll.length)}
              icon={FileText}
              description={`Total: R$ ${totalPendentes.toFixed(2)}`}
              variant="primary"
            />
            <StatsCard
              title="Pagas no mês"
              value={String(paidThisMonth.length)}
              icon={Check}
              description={`Total: R$ ${totalPagasMes.toFixed(2)}`}
              variant="success"
            />
            <StatsCard
              title="Em atraso"
              value={String(overdueAll.length)}
              icon={AlertTriangle}
              description={`Total: R$ ${totalAtrasadas.toFixed(2)}`}
              variant="warning"
            />
            <StatsCard
              title="A pagar (total)"
              value={`R$ ${totalPendentes.toFixed(2)}`}
              icon={DollarSign}
              variant={totalPendentes > 0 ? "warning" : "success"}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="font-heading text-lg">
                Contas — {format(parseISO(selectedDate), "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={billStatusFilter} onValueChange={setBillStatusFilter}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="atrasada">Atrasadas</SelectItem>
                    <SelectItem value="vence-hoje">Vence hoje</SelectItem>
                    <SelectItem value="proxima">Próximas</SelectItem>
                    <SelectItem value="paga">Pagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!filteredBills.length ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma conta para este filtro 📭</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[140px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((b) => {
                        const st = billRealStatus(b);
                        const stLabel =
                          st === "paga" ? `✓ Paga${b.paid_at ? ` em ${format(parseISO(b.paid_at), "dd/MM/yyyy")}` : ""}` :
                          st === "atrasada" ? "Atrasada" :
                          st === "vence-hoje" ? "Vence hoje" : "Pendente";
                        const stClass =
                          st === "paga" ? "bg-success/15 text-success border-success/30" :
                          st === "atrasada" ? "bg-destructive/15 text-destructive border-destructive/30" :
                          st === "vence-hoje" ? "bg-warning/15 text-warning border-warning/30" :
                          "bg-muted text-foreground border-border";
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.nome}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{b.categoria}</TableCell>
                            <TableCell className="text-sm">
                              {b.due_date ? format(parseISO(b.due_date), "dd/MM/yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`font-medium ${stClass}`}>{stLabel}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              R$ {Number(b.valor).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {st === "paga" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs"
                                  onClick={() => undoBillPaid.mutate(b)}
                                  disabled={undoBillPaid.isPending}
                                >
                                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Desfazer
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                                  onClick={() => markBillPaid.mutate(b.id)}
                                  disabled={markBillPaid.isPending}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Dar baixa
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="resumo" className="space-y-6 mt-4">
      {/* Stats do mês */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Receita do Mês" value={`R$ ${monthRevenue.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Custos do Mês" value={`R$ ${monthCosts.toFixed(2)}`} icon={TrendingDown} variant="warning" />
        <StatsCard
          title="Lucro do Mês"
          value={`R$ ${monthProfit.toFixed(2)}`}
          icon={TrendingUp}
          variant={monthProfit >= 0 ? "success" : "warning"}
        />
        <StatsCard title="Receita Hoje" value={`R$ ${dayRevenue.toFixed(2)}`} icon={DollarSign} />
      </div>

      {/* Entregas do dia - para pagar entregador */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entregas do Dia — {format(parseISO(selectedDate), "dd/MM/yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredToday.length ? (
            <div className="space-y-2">
              {deliveredToday.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-foreground">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.delivery_address}</p>
                  </div>
                  <span className="font-bold text-primary">R$ {order.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                <span className="font-heading font-bold text-foreground">Total de entregas: {deliveredToday.length}</span>
                <span className="font-heading font-extrabold text-primary text-lg">
                  R$ {deliveredToday.reduce((s, o) => s + o.total, 0).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhuma entrega neste dia 🛵</p>
          )}
        </CardContent>
      </Card>

      {/* Custos por categoria */}
      {Object.keys(costsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Custos por Categoria (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {EXPENSE_CATEGORIES.map((cat) => {
                const val = costsByCategory[cat.value] ?? 0;
                if (val === 0) return null;
                return (
                  <div key={cat.value} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-sm text-muted-foreground">{cat.label}</p>
                    <p className="text-lg font-bold font-heading text-foreground">R$ {val.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Despesas do mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">Despesas do Mês</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Nova Despesa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Ex: Compra no mercado"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addExpense.mutate()}
                  disabled={!newExpense.description || !newExpense.amount || addExpense.isPending}
                >
                  Salvar Despesa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!monthExpenses?.length ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma despesa registrada neste mês 💰</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">{format(parseISO(exp.expense_date), "dd/MM")}</TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-sm capitalize">
                        {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        R$ {exp.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteExpense.mutate(exp.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="formas" className="mt-4">
          <Pagamentos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
