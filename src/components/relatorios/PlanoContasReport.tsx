import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Download, DollarSign, TrendingUp, TrendingDown, FileBarChart } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { getReportExpenses } from "@/services/expenses";
import { getReportReceitas } from "@/services/receitas";
import { getReportsOrderData } from "@/services/orders";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { categoriaLabel, type CategoriaFinanceira } from "@/lib/finance-categories";

type TipoFiltro = "todos" | "receita" | "despesa";

export default function PlanoContasReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [tipo, setTipo] = useState<TipoFiltro>("todos");
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string> | null>(null); // null = todas

  const { data: categorias = [] } = useFinanceCategories();
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["relatorios-plano-contas-expenses", startDate, endDate],
    queryFn: () => getReportExpenses(startDate, endDate),
  });
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["relatorios-plano-contas-orders", startDate, endDate],
    queryFn: () => getReportsOrderData(startDate, endDate),
  });
  const { data: receitas, isLoading: loadingReceitas } = useQuery({
    queryKey: ["relatorios-plano-contas-receitas", startDate, endDate],
    queryFn: () => getReportReceitas(startDate, endDate),
  });

  const contasDisponiveis = useMemo(() => {
    return categorias
      .filter((c) => c.ativo && (tipo === "todos" || c.tipo === tipo))
      .sort((a, b) => a.ordem - b.ordem);
  }, [categorias, tipo]);

  const contaAtiva = (c: CategoriaFinanceira) => contasSelecionadas === null || contasSelecionadas.has(c.slug);

  function toggleConta(slug: string) {
    setContasSelecionadas((prev) => {
      const base = prev ?? new Set(contasDisponiveis.map((c) => c.slug));
      const next = new Set(base);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const filteredExpenses = useMemo(() => {
    if (tipo === "receita") return [];
    return (expenses || []).filter((e) => {
      const cat = categorias.find((c) => c.slug === e.category);
      if (!cat) return contasSelecionadas === null; // categoria removida/legado sem match — só entra se "todas"
      return contaAtiva(cat);
    });
  }, [expenses, categorias, tipo, contasSelecionadas]);

  const totalDespesas = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Vendas de marmita não são uma linha em `receitas` — vêm direto de `orders`,
  // atribuídas automaticamente à conta "vendas_marmitas".
  const totalVendasMarmitas = useMemo(() => {
    if (tipo === "despesa") return 0;
    const vendasCat = categorias.find((c) => c.slug === "vendas_marmitas");
    if (vendasCat && !contaAtiva(vendasCat)) return 0;
    return (orders || []).filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.total), 0);
  }, [orders, tipo, categorias, contasSelecionadas]);

  const filteredReceitas = useMemo(() => {
    if (tipo === "despesa") return [];
    return (receitas || []).filter((r) => {
      const cat = categorias.find((c) => c.slug === r.category);
      if (!cat) return contasSelecionadas === null;
      return contaAtiva(cat);
    });
  }, [receitas, categorias, tipo, contasSelecionadas]);

  const totalReceitasParticulares = filteredReceitas.reduce((s, r) => s + Number(r.amount), 0);
  const totalReceitas = totalVendasMarmitas + totalReceitasParticulares;

  const porConta = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    for (const r of filteredReceitas) map.set(r.category, (map.get(r.category) || 0) + Number(r.amount));
    if (totalVendasMarmitas > 0) map.set("vendas_marmitas", (map.get("vendas_marmitas") || 0) + totalVendasMarmitas);
    return map;
  }, [filteredExpenses, filteredReceitas, totalVendasMarmitas]);

  type Lancamento = { id: string; data: string; descricao: string; contaLabel: string; valor: number; kind: "receita" | "despesa" };

  const lancamentos = useMemo<Lancamento[]>(() => {
    const despesaRows: Lancamento[] = filteredExpenses.map((e) => {
      const cat = categorias.find((c) => c.slug === e.category);
      return { id: e.id, data: e.expense_date, descricao: e.description, contaLabel: cat ? categoriaLabel(cat) : e.category, valor: Number(e.amount), kind: "despesa" };
    });
    const receitaRows: Lancamento[] = filteredReceitas.map((r) => {
      const cat = categorias.find((c) => c.slug === r.category);
      return { id: r.id, data: r.receita_date, descricao: r.description, contaLabel: cat ? categoriaLabel(cat) : r.category, valor: Number(r.amount), kind: "receita" };
    });
    return [...receitaRows, ...despesaRows].sort((a, b) => (a.data > b.data ? -1 : 1));
  }, [filteredExpenses, filteredReceitas, categorias]);

  const exportCSV = () => {
    const header = ["Data", "Tipo", "Descrição", "Conta", "Valor"];
    const rows = lancamentos.map((l) => [
      format(parseISO(l.data), "dd/MM/yyyy"),
      l.kind === "receita" ? "Receita" : "Despesa",
      `"${l.descricao.replace(/"/g, '""')}"`,
      l.contaLabel,
      l.valor.toFixed(2).replace(".", ","),
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plano_de_contas_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (type: "hoje" | "mes" | "ano") => {
    const now = new Date();
    if (type === "hoje") { const d = format(now, "yyyy-MM-dd"); setStartDate(d); setEndDate(d); }
    else if (type === "mes") { setStartDate(format(startOfMonth(now), "yyyy-MM-dd")); setEndDate(format(endOfMonth(now), "yyyy-MM-dd")); }
    else { setStartDate(format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd")); setEndDate(format(new Date(now.getFullYear(), 11, 31), "yyyy-MM-dd")); }
  };

  const isLoading = loadingExpenses || loadingOrders || loadingReceitas;
  const gruposDisponiveis = useMemo(() => {
    const map = new Map<string, CategoriaFinanceira[]>();
    for (const c of contasDisponiveis) {
      if (!map.has(c.grupo)) map.set(c.grupo, []);
      map.get(c.grupo)!.push(c);
    }
    return Array.from(map.entries());
  }, [contasDisponiveis]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="start">Data inicial</Label>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[170px]" />
          </div>
        </div>
        <div>
          <Label htmlFor="end">Data final</Label>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[170px]" />
          </div>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v: TipoFiltro) => { setTipo(v); setContasSelecionadas(null); }}>
            <SelectTrigger className="w-[160px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pb-0.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("hoje")}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("mes")}>Mês</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("ano")}>Ano</Button>
        </div>
        <Button onClick={exportCSV} disabled={!lancamentos.length} size="sm" className="ml-auto">
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-sm text-[var(--color-text-secondary)] uppercase tracking-wide">Contas incluídas no relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setContasSelecionadas(null)}>Selecionar todas</Button>
            <Button variant="outline" size="sm" onClick={() => setContasSelecionadas(new Set())}>Limpar seleção</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {gruposDisponiveis.map(([grupo, itens]) => (
              <div key={grupo}>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{grupo}</p>
                <div className="space-y-1.5">
                  {itens.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={contaAtiva(c)} onCheckedChange={() => toggleConta(c.slug)} />
                      {categoriaLabel(c)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Receitas" value={`R$ ${totalReceitas.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Total Despesas" value={`R$ ${totalDespesas.toFixed(2)}`} icon={TrendingDown} variant="warning" />
        <StatsCard title="Saldo" value={`R$ ${(totalReceitas - totalDespesas).toFixed(2)}`} icon={TrendingUp} variant={totalReceitas - totalDespesas >= 0 ? "success" : "warning"} />
      </div>

      {porConta.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Por Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contasDisponiveis.filter((c) => porConta.has(c.slug)).map((c) => {
                const val = porConta.get(c.slug) ?? 0;
                const base = c.tipo === "receita" ? totalReceitas : totalDespesas;
                const pct = base > 0 ? (val / base) * 100 : 0;
                return (
                  <div key={c.slug}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-[var(--color-text-primary)]">{categoriaLabel(c)}</span>
                      <span className="text-[var(--color-text-secondary)]">
                        R$ {val.toFixed(2)} <span className="text-[var(--color-text-muted)]">· {pct.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
                      <div className="h-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Lançamentos — {format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a {format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Carregando...</p>
          ) : !lancamentos.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhum lançamento encontrado com esses filtros</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((l) => (
                    <TableRow key={`${l.kind}-${l.id}`}>
                      <TableCell className="text-sm">{format(parseISO(l.data), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{l.descricao}</TableCell>
                      <TableCell className="text-sm">{l.contaLabel}</TableCell>
                      <TableCell className={`text-right font-bold ${l.kind === "receita" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                        {l.kind === "receita" ? "+" : "-"} R$ {l.valor.toFixed(2)}
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
