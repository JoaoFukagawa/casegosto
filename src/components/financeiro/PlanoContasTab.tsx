import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ListTree } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { getMonthExpenses } from "@/services/expenses";
import { getFinanceMonthOrders } from "@/services/orders";
import { useFinanceCategories, useCreateFinanceCategory, useToggleFinanceCategoryAtivo } from "@/hooks/useFinanceCategories";
import { useMonthReceitas } from "@/hooks/useReceitas";
import { categoriaLabel, groupCategories, computeNextCodigo } from "@/lib/finance-categories";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";

export default function PlanoContasTab({ selectedDate }: { selectedDate: string }) {
  const { data: categorias = [] } = useFinanceCategories();
  const toggleAtivo = useToggleFinanceCategoryAtivo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", tipo: "despesa" as "receita" | "despesa", grupo: "", is_operacional: true });

  const { data: monthExpenses } = useQuery({
    queryKey: queryKeys.expenses.byMonth(selectedDate),
    queryFn: () => {
      const ms = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const me = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      return getMonthExpenses(ms, me);
    },
  });

  const totalPorSlug = (monthExpenses ?? []).reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const { data: monthOrders } = useQuery({
    queryKey: queryKeys.orders.financeByMonth(selectedDate),
    queryFn: () => {
      const ms = startOfMonth(parseISO(selectedDate)).toISOString();
      const me = endOfMonth(parseISO(selectedDate)).toISOString();
      return getFinanceMonthOrders(ms, me);
    },
  });
  const { data: monthReceitas } = useMonthReceitas(selectedDate);

  const totalReceitaPorSlug = (monthReceitas ?? []).reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);
  totalReceitaPorSlug["vendas_marmitas"] =
    (monthOrders ?? []).filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0);

  const createCategoria = useCreateFinanceCategory(() => {
    setDialogOpen(false);
    setNovo({ nome: "", tipo: "despesa", grupo: "", is_operacional: true });
  });

  const gruposReceita = groupCategories(categorias, "receita");
  const gruposDespesa = groupCategories(categorias, "despesa");

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <ListTree className="h-5 w-5" /> Plano de Contas
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Ex: Manutenção de equipamentos" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={novo.tipo} onValueChange={(v: "receita" | "despesa") => setNovo({ ...novo, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Input value={novo.grupo} onChange={(e) => setNovo({ ...novo, grupo: e.target.value })} placeholder="Ex: Administrativo" list="grupos-plano-contas" />
                  <datalist id="grupos-plano-contas">
                    {Array.from(new Set(categorias.map((c) => c.grupo))).map((g) => <option key={g} value={g} />)}
                  </datalist>
                </div>
                {novo.tipo === "despesa" && (
                  <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
                    <div>
                      <p className="text-sm font-medium">Operacional</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Ao pagar/lançar uma conta dessa categoria, ela vira despesa do mês automaticamente. Desligue para categorias como aluguel/impostos, que ficam só como conta a pagar.</p>
                    </div>
                    <Switch checked={novo.is_operacional} onCheckedChange={(v) => setNovo({ ...novo, is_operacional: v })} />
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={!novo.nome.trim() || !novo.grupo.trim() || createCategoria.isPending}
                  onClick={() => {
                    const codigo = computeNextCodigo(categorias, novo.grupo.trim());
                    createCategoria.mutate({ nome: novo.nome.trim(), tipo: novo.tipo, grupo: novo.grupo.trim(), codigo, is_operacional: novo.is_operacional });
                  }}
                >
                  {createCategoria.isPending ? "Criando..." : "Criar categoria"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Despesas</p>
            <div className="space-y-4">
              {gruposDespesa.map(({ grupo, itens }) => (
                <div key={grupo}>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{grupo}</p>
                  <div className="space-y-1.5">
                    {itens.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{categoriaLabel(cat)}</span>
                          {!cat.is_operacional && <Badge variant="outline" className="text-[10px]">administrativa</Badge>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {totalPorSlug[cat.slug] > 0 && (
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">R$ {totalPorSlug[cat.slug].toFixed(2)}</span>
                          )}
                          <Switch checked={cat.ativo} onCheckedChange={(v) => toggleAtivo.mutate({ id: cat.id, ativo: v })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Receitas</p>
            <div className="space-y-4">
              {gruposReceita.map(({ grupo, itens }) => (
                <div key={grupo}>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{grupo}</p>
                  <div className="space-y-1.5">
                    {itens.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-2.5">
                        <span className="text-sm font-medium">{categoriaLabel(cat)}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          {totalReceitaPorSlug[cat.slug] > 0 && (
                            <span className="text-sm font-bold text-[var(--color-success)]">R$ {totalReceitaPorSlug[cat.slug].toFixed(2)}</span>
                          )}
                          <Switch checked={cat.ativo} onCheckedChange={(v) => toggleAtivo.mutate({ id: cat.id, ativo: v })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
