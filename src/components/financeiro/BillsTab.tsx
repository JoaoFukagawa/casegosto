import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { DollarSign, Check, Undo2, AlertTriangle, FileText, Plus, Trash2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { useBills, useMarkBillPaid, useUndoBillPaid } from "@/hooks/useBills";
import { useCreateExpense, useDeleteExpense, useMonthExpenses } from "@/hooks/useExpenses";
import { useMonthReceitas, useCreateReceita, useDeleteReceita } from "@/hooks/useReceitas";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { getExpenseCategoryLabel, findCategoryByNome } from "@/lib/finance-categories";
import CategoriaSelect from "@/components/financeiro/CategoriaSelect";

export default function BillsTab({ selectedDate }: { selectedDate: string }) {
  const [billStatusFilter, setBillStatusFilter] = useState<string>("todas");
  const [billDateFilter, setBillDateFilter] = useState<string>("");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [receitaDialogOpen, setReceitaDialogOpen] = useState(false);
  const { data: categorias = [] } = useFinanceCategories();
  const [newExpense, setNewExpense] = useState({
    description: "", category: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [newReceita, setNewReceita] = useState({
    description: "", category: "", amount: "", receita_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: allBills = [] } = useBills();
  const markBillPaid = useMarkBillPaid();
  const undoBillPaid = useUndoBillPaid();
  const { data: monthExpenses } = useMonthExpenses(selectedDate);
  const addExpense = useCreateExpense(() => {
    setExpenseDialogOpen(false);
    setNewExpense({ description: "", category: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
  });
  const deleteExpense = useDeleteExpense();
  const { data: monthReceitas } = useMonthReceitas(selectedDate);
  const addReceita = useCreateReceita(() => {
    setReceitaDialogOpen(false);
    setNewReceita({ description: "", category: "", amount: "", receita_date: format(new Date(), "yyyy-MM-dd") });
  });
  const deleteReceita = useDeleteReceita();

  function billRealStatus(b: any): "paga" | "atrasada" | "vence-hoje" | "proxima" {
    if (b.status === "paga" || b.paid_at) return "paga";
    if (!b.due_date) return b.status ?? "proxima";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(b.due_date + "T00:00:00");
    if (d.getTime() < today.getTime()) return "atrasada";
    if (d.getTime() === today.getTime()) return "vence-hoje";
    return "proxima";
  }

  const { startOfMonth, endOfMonth } = (() => {
    const d = parseISO(selectedDate);
    return {
      startOfMonth: format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd"),
      endOfMonth: format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd"),
    };
  })();

  const billsOfMonth = allBills.filter((b: any) => {
    const ref = b.paid_at ? format(parseISO(b.paid_at), "yyyy-MM-dd") : b.due_date;
    if (!ref) return false;
    return ref >= startOfMonth && ref <= endOfMonth;
  });

  const pendingAll = allBills.filter((b: any) => billRealStatus(b) !== "paga");
  const overdueAll = allBills.filter((b: any) => billRealStatus(b) === "atrasada");
  const paidThisMonth = billsOfMonth.filter((b: any) => billRealStatus(b) === "paga");

  const totalPendentes = pendingAll.reduce((s: number, b: any) => s + Number(b.valor), 0);
  const totalAtrasadas = overdueAll.reduce((s: number, b: any) => s + Number(b.valor), 0);
  const totalPagasMes = paidThisMonth.reduce((s: number, b: any) => s + Number(b.valor), 0);

  const filteredBills = allBills
    .filter((b: any) => {
      if (!billDateFilter) return true;
      return b.due_date === billDateFilter;
    })
    .filter((b: any) => billStatusFilter === "todas" || billRealStatus(b) === billStatusFilter)
    .sort((a: any, b: any) => {
      const order = { atrasada: 0, "vence-hoje": 1, proxima: 2, paga: 3 } as const;
      return (order[billRealStatus(a)] - order[billRealStatus(b)]) || ((a.due_date ?? "") > (b.due_date ?? "") ? 1 : -1);
    });

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Contas pendentes" value={String(pendingAll.length)} icon={FileText}
          description={`Total: R$ ${totalPendentes.toFixed(2)}`} variant="primary" />
        <StatsCard title="Pagas no mês" value={String(paidThisMonth.length)} icon={Check}
          description={`Total: R$ ${totalPagasMes.toFixed(2)}`} variant="success" />
        <StatsCard title="Em atraso" value={String(overdueAll.length)} icon={AlertTriangle}
          description={`Total: R$ ${totalAtrasadas.toFixed(2)}`} variant="warning" />
        <StatsCard title="A pagar (total)" value={`R$ ${totalPendentes.toFixed(2)}`} icon={DollarSign}
          variant={totalPendentes > 0 ? "warning" : "success"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="font-heading text-lg">
            {billDateFilter ? `Contas — vencimento ${format(parseISO(billDateFilter), "dd/MM/yyyy")}` : "Todas as contas"}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-[var(--color-text-secondary)]">Vencimento</Label>
            <Input type="date" value={billDateFilter} onChange={(e) => setBillDateFilter(e.target.value)} className="h-8 w-[150px]" />
            <Label className="text-xs text-[var(--color-text-secondary)]">Status</Label>
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
            {(billDateFilter || billStatusFilter !== "todas") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setBillDateFilter(""); setBillStatusFilter("todas"); }}>
                Limpar filtro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!filteredBills.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma conta para este filtro</p>
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
                  {filteredBills.map((b: any) => {
                    const st = billRealStatus(b);
                    const stLabel = st === "paga" ? `✓ Paga${b.paid_at ? ` em ${format(parseISO(b.paid_at), "dd/MM/yyyy")}` : ""}` :
                      st === "atrasada" ? "Atrasada" : st === "vence-hoje" ? "Vence hoje" : "Pendente";
                    const stClass = st === "paga" ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]" :
                      st === "atrasada" ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]" :
                      st === "vence-hoje" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]" :
                      "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)]";
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell className="text-sm text-[var(--color-text-secondary)]">{b.categoria}</TableCell>
                        <TableCell className="text-sm">{b.due_date ? format(parseISO(b.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`font-medium ${stClass}`}>{stLabel}</Badge></TableCell>
                        <TableCell className="text-right font-bold">R$ {Number(b.valor).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {st === "paga" ? (
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => undoBillPaid.mutate(b)} disabled={undoBillPaid.isPending}>
                              <Undo2 className="h-3.5 w-3.5 mr-1" /> Desfazer
                            </Button>
                          ) : (
                            <Button size="sm" className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                              onClick={() => markBillPaid.mutate({ id: b.id, bill: b })} disabled={markBillPaid.isPending}>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">Despesas do Mês</CardTitle>
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Lançar despesa</Button>
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
                  <CategoriaSelect tipo="despesa" value={newExpense.category} onChange={(nome) => setNewExpense({ ...newExpense, category: nome })} />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => {
                  const categoria = findCategoryByNome(categorias, newExpense.category);
                  addExpense.mutate({ description: newExpense.description, category: categoria?.slug ?? "outros", amount: parseFloat(newExpense.amount), expense_date: newExpense.expense_date });
                }}
                  disabled={!newExpense.description || !newExpense.amount || !newExpense.category || addExpense.isPending}>Salvar Despesa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!monthExpenses?.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma despesa registrada neste mês</p>
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
                      <TableCell className="text-sm capitalize">{getExpenseCategoryLabel(categorias, exp.category)}</TableCell>
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
    </div>
  );
}
