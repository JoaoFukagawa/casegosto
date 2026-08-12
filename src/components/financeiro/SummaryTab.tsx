import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, TrendingDown, Truck, Plus, Trash2 } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import StatsCard from "@/components/StatsCard";
import { queryKeys } from "@/lib/query-keys";
import { getFinanceDayOrders, getFinanceMonthOrders } from "@/services/orders";
import { getMonthExpenses } from "@/services/expenses";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { useMonthReceitas, useCreateReceita, useDeleteReceita } from "@/hooks/useReceitas";
import { categoriaLabel, findCategoryByNome, getExpenseCategoryLabel } from "@/lib/finance-categories";
import CategoriaSelect from "@/components/financeiro/CategoriaSelect";

export default function SummaryTab({ selectedDate }: { selectedDate: string }) {
  const { data: categorias = [] } = useFinanceCategories();
  const [receitaDialogOpen, setReceitaDialogOpen] = useState(false);
  const [newReceita, setNewReceita] = useState({
    description: "", category: "", amount: "", receita_date: format(new Date(), "yyyy-MM-dd"),
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

  const { data: monthReceitas } = useMonthReceitas(selectedDate);
  const addReceita = useCreateReceita(() => {
    setReceitaDialogOpen(false);
    setNewReceita({ description: "", category: "", amount: "", receita_date: format(new Date(), "yyyy-MM-dd") });
  });
  const deleteReceita = useDeleteReceita();

  const monthVendasMarmitas = monthOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const dayVendasMarmitas = dayOrders?.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0) ?? 0;
  const monthOutrasReceitas = monthReceitas?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const dayOutrasReceitas = monthReceitas?.filter((r) => r.receita_date === selectedDate).reduce((s, r) => s + r.amount, 0) ?? 0;
  const monthRevenue = monthVendasMarmitas + monthOutrasReceitas;
  const dayRevenue = dayVendasMarmitas + dayOutrasReceitas;
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
            <p className="text-center text-[var(--color-text-secondary)] py-4">Nenhuma entrega neste dia</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">Receitas Particulares do Mês</CardTitle>
          <Dialog open={receitaDialogOpen} onOpenChange={setReceitaDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Lançar receita</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Nova Receita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  <Input value={newReceita.description} onChange={(e) => setNewReceita({ ...newReceita, description: e.target.value })} placeholder="Ex: Venda avulsa, aluguel recebido" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <CategoriaSelect tipo="receita" value={newReceita.category} onChange={(nome) => setNewReceita({ ...newReceita, category: nome })} />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={newReceita.amount} onChange={(e) => setNewReceita({ ...newReceita, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={newReceita.receita_date} onChange={(e) => setNewReceita({ ...newReceita, receita_date: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => {
                  const categoria = findCategoryByNome(categorias, newReceita.category);
                  addReceita.mutate({ description: newReceita.description, category: categoria?.slug ?? "outras_receitas", amount: parseFloat(newReceita.amount), receita_date: newReceita.receita_date });
                }}
                  disabled={!newReceita.description || !newReceita.amount || !newReceita.category || addReceita.isPending}>Salvar Receita</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!monthReceitas?.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma receita particular registrada neste mês</p>
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
                  {monthReceitas.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-sm">{format(parseISO(rec.receita_date), "dd/MM")}</TableCell>
                      <TableCell className="font-medium">{rec.description}</TableCell>
                      <TableCell className="text-sm capitalize">{getExpenseCategoryLabel(categorias, rec.category)}</TableCell>
                      <TableCell className="text-right font-bold text-[var(--color-success)]">R$ {rec.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteReceita.mutate(rec.id)} className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
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

      {Object.keys(costsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Custos por Categoria (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categorias.filter((c) => c.tipo === "despesa").map((cat) => {
                const val = costsByCategory[cat.slug] ?? 0;
                if (val === 0) return null;
                return (
                  <div key={cat.slug} className="rounded-lg border border-[var(--color-border)] p-3 text-center">
                    <p className="text-sm text-[var(--color-text-secondary)]">{categoriaLabel(cat)}</p>
                    <p className="text-lg font-bold font-heading text-[var(--color-text-primary)]">R$ {val.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
