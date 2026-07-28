import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Download, TrendingDown, FileBarChart } from "lucide-react";
import StatsCard from "@/components/StatsCard";

const EXPENSE_CATEGORIES = [
  { value: "todos", label: "Todas as categorias" },
  { value: "mercado", label: "🛒 Mercado" },
  { value: "embalagens", label: "📦 Embalagens" },
  { value: "gas", label: "🔥 Gás" },
  { value: "entregador", label: "🛵 Entregador" },
  { value: "outros", label: "📋 Outros" },
];

export default function ExpenseReport({
  startDate, endDate, category, setStartDate, setEndDate, setCategory, setQuickRange,
  filtered, total, count, average, byCategory, isLoading, exportCSV,
}: {
  startDate: string; endDate: string; category: string;
  setStartDate: (v: string) => void; setEndDate: (v: string) => void; setCategory: (v: string) => void;
  setQuickRange: (type: "hoje" | "mes" | "ano") => void;
  filtered: any[]; total: number; count: number; average: number;
  byCategory: Record<string, number>; isLoading: boolean;
  exportCSV: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="start">Data inicial</Label>
              <div className="flex items-center gap-2 mt-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[170px]" />
              </div>
            </div>
            <div>
              <Label htmlFor="end">Data final</Label>
              <div className="flex items-center gap-2 mt-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickRange("hoje")}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange("mes")}>Este mês</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange("ano")}>Este ano</Button>
          </div>
        </CardContent>
      </Card>

      <div className="border-t border-border pt-4">
        <h3 className="text-xl font-extrabold font-heading text-foreground flex items-center gap-2 mb-2">
          <TrendingDown className="h-5 w-5 text-destructive" /> Despesas
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total de Despesas" value={`R$ ${total.toFixed(2)}`} icon={TrendingDown} variant="warning" />
        <StatsCard title="Quantidade" value={String(count)} icon={FileBarChart} />
        <StatsCard title="Ticket médio" value={`R$ ${average.toFixed(2)}`} icon={FileBarChart} />
      </div>
      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Por Categoria</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPENSE_CATEGORIES.filter((c) => c.value !== "todos").map((cat) => {
                const val = byCategory[cat.value] ?? 0;
                if (val === 0) return null;
                const pct = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div key={cat.value} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{cat.label}</p>
                    <p className="text-lg font-bold font-heading text-foreground">R$ {val.toFixed(2)}</p>
                    <p className="text-xs text-primary font-medium">{pct.toFixed(1)}%</p>
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
            Despesas — {format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a {format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-6">Carregando...</p>
          ) : !filtered.length ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma despesa encontrada com esses filtros 📭</p>
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
                      <TableCell className="text-sm">{EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">R$ {Number(exp.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
