import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Download, TrendingDown, FileBarChart } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { useExpenseReport } from "@/hooks/useExpenses";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { getExpenseCategoryLabel, categoriaLabel } from "@/lib/finance-categories";

export default function ExpenseReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [category, setCategory] = useState("todos");

  const { data: expenses, isLoading } = useExpenseReport(startDate, endDate);
  const { data: categoriasFinanceiras = [] } = useFinanceCategories();
  const EXPENSE_CATEGORIES = [
    { value: "todos", label: "Todas as categorias" },
    ...categoriasFinanceiras.filter((c) => c.tipo === "despesa").map((c) => ({ value: c.slug, label: categoriaLabel(c) })),
  ];

  const filtered = useMemo(() => {
    return (expenses || []).filter((e: any) => category === "todos" || e.category === category);
  }, [expenses, category]);

  const total = filtered.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const count = filtered.length;
  const average = count > 0 ? total / count : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) map[e.category] = (map[e.category] || 0) + Number(e.amount);
    return map;
  }, [filtered]);

  const exportCSV = () => {
    const header = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = filtered.map((e: any) => [
      format(parseISO(e.expense_date), "dd/MM/yyyy"),
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      Number(e.amount).toFixed(2).replace(".", ","),
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `despesas_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (type: "hoje" | "mes" | "ano") => {
    const now = new Date();
    if (type === "hoje") { const d = format(now, "yyyy-MM-dd"); setStartDate(d); setEndDate(d); }
    else if (type === "mes") { setStartDate(format(startOfMonth(now), "yyyy-MM-dd")); setEndDate(format(endOfMonth(now), "yyyy-MM-dd")); }
    else { setStartDate(format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd")); setEndDate(format(new Date(now.getFullYear(), 11, 31), "yyyy-MM-dd")); }
  };

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
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[220px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pb-0.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("hoje")}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("mes")}>Mês</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("ano")}>Ano</Button>
        </div>
        <Button onClick={exportCSV} disabled={!filtered.length} size="sm" className="ml-auto">
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total de Despesas" value={`R$ ${total.toFixed(2)}`} icon={TrendingDown} variant="warning" />
        <StatsCard title="Quantidade" value={String(count)} icon={FileBarChart} />
        <StatsCard title="Ticket médio" value={`R$ ${average.toFixed(2)}`} icon={FileBarChart} />
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[1.2px] text-[var(--color-text-primary)] opacity-70 mb-3">
            Por Categoria
          </h3>
          <div className="space-y-3">
            {EXPENSE_CATEGORIES.filter((c) => c.value !== "todos").map((cat) => {
              const val = byCategory[cat.value] ?? 0;
              if (val === 0) return null;
              const pct = total > 0 ? (val / total) * 100 : 0;
              return (
                <div key={cat.value}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-[var(--color-text-primary)]">{cat.label}</span>
                    <span className="text-[var(--color-text-secondary)]">
                      R$ {val.toFixed(2)} <span className="text-[var(--color-text-muted)]">· {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5 [&>div]:bg-[var(--color-accent)]" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Despesas — {format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a {format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Carregando...</p>
          ) : !filtered.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma despesa encontrada com esses filtros 📭</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">{format(parseISO(exp.expense_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-sm">{getExpenseCategoryLabel(categoriasFinanceiras, exp.category)}</TableCell>
                      <TableCell className="text-right font-bold text-[var(--color-danger)]">R$ {Number(exp.amount).toFixed(2)}</TableCell>
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
