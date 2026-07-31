import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Truck } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import StatsCard from "@/components/StatsCard";
import { queryKeys } from "@/lib/query-keys";
import { getFinanceDayOrders, getFinanceMonthOrders } from "@/services/orders";
import { getMonthExpenses } from "@/services/expenses";
import { useCreateExpense, useDeleteExpense } from "@/hooks/useExpenses";

const EXPENSE_CATEGORIES = [
  { value: "mercado", label: "🛒 Mercado" },
  { value: "embalagens", label: "📦 Embalagens" },
  { value: "gas", label: "🔥 Gás" },
  { value: "entregador", label: "🛵 Entregador" },
  { value: "outros", label: "📋 Outros" },
];

export default function SummaryTab({ selectedDate }: { selectedDate: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "", category: "mercado", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  const dayStart = startOfDay(parseISO(selectedDate)).toISOString();
  const dayEnd = endOfDay(parseISO(selectedDate)).toISOString();
  const monthStart = startOfMonth(parseISO(selectedDate)).toISOString();
  const monthEnd = endOfMonth(parseISO(selectedDate)).toISOString();

  const { data: dayOrders } = useQuery({
    queryKey: queryKeys.orders.financeByDay(selectedDate),
    queryFn: () => getFinanceDayOrders(dayStart, dayEnd),
  });

  const { data: monthOrders } = useQuery({
    queryKey: queryKeys.orders.financeByMonth(selectedDate),
    queryFn: () => getFinanceMonthOrders(monthStart, monthEnd),
  });

  const { data: monthExpenses } = useQuery({
    queryKey: queryKeys.expenses.byMonth(selectedDate),
    queryFn: () => {
      const ms = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const me = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      return getMonthExpenses(ms, me);
    },
  });

  const addExpense = useCreateExpense(() => {
    setDialogOpen(false);
    setNewExpense({ description: "", category: "mercado", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
  });
  const deleteExpense = useDeleteExpense();

  const monthRevenue = monthOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const dayRevenue = dayOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const monthCosts = monthExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const monthProfit = monthRevenue - monthCosts;

  const deliveredToday = dayOrders?.filter((o) => o.status === "entregue" && o.delivery_type === "entrega") ?? [];

  const costsByCategory = monthExpenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Receita do Mês" value={`R$ ${monthRevenue.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Custos do Mês" value={`R$ ${monthCosts.toFixed(2)}`} icon={TrendingDown} variant="warning" />
        <StatsCard title="Lucro do Mês" value={`R$ ${monthProfit.toFixed(2)}`} icon={TrendingUp} variant={monthProfit >= 0 ? "success" : "warning"} />
        <StatsCard title="Receita Hoje" value={`R$ ${dayRevenue.toFixed(2)}`} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" /> Entregas do Dia — {format(parseISO(selectedDate), "dd/MM/yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredToday.length ? (
            <div className="space-y-2">
              {deliveredToday.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{order.customer_name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{order.delivery_address}</p>
                  </div>
                  <span className="font-bold text-[var(--color-accent)]">R$ {order.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-[var(--color-accent-muted)] border border-[var(--color-accent)] p-4 flex items-center justify-between">
                <span className="font-heading font-bold text-[var(--color-text-primary)]">Total de entregas: {deliveredToday.length}</span>
                <span className="font-heading font-extrabold text-[var(--color-accent)] text-lg">R$ {deliveredToday.reduce((s, o) => s + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-[var(--color-text-secondary)] py-4">Nenhuma entrega neste dia 🛵</p>
          )}
        </CardContent>
      </Card>

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
                  <div key={cat.value} className="rounded-lg border border-[var(--color-border)] p-3 text-center">
                    <p className="text-sm text-[var(--color-text-secondary)]">{cat.label}</p>
                    <p className="text-lg font-bold font-heading text-[var(--color-text-primary)]">R$ {val.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Ex: Compra no mercado" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => addExpense.mutate({ description: newExpense.description, category: newExpense.category, amount: parseFloat(newExpense.amount), expense_date: newExpense.expense_date })}
                  disabled={!newExpense.description || !newExpense.amount || addExpense.isPending}>Salvar Despesa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!monthExpenses?.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma despesa registrada neste mês 💰</p>
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
                      <TableCell className="text-sm capitalize">{EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}</TableCell>
                      <TableCell className="text-right font-bold text-[var(--color-danger)]">R$ {exp.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(exp.id)} className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
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
    </div>
  );
}
