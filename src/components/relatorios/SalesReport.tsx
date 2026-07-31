import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarDays, Download, TrendingUp, FileBarChart, Package, BarChart3, Trophy } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { useSalesReport } from "@/hooks/useOrders";

type ProdAgg = {
  menu_item_id: string; name: string; category: string; unit_type: string;
  qty: number; entries: number; revenue: number;
  minPrice: number; maxPrice: number; prices: number[];
};

export default function SalesReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const { data: salesRaw, isLoading: loadingSales } = useSalesReport(startDate, endDate);

  const productSales = useMemo(() => {
    const map = new Map<string, ProdAgg>();
    for (const ord of salesRaw || []) {
      for (const it of (ord as any).order_items || []) {
        const mi = it.menu_items;
        if (!mi) continue;
        const id = it.menu_item_id as string;
        const unitType = mi.unit_type || "unidade";
        const qtyAdded = unitType === "kg" ? Number(it.weight || 0) : Number(it.quantity || 0);
        const price = Number(it.unit_price || 0);
        const revenue = price * qtyAdded;
        const prev = map.get(id) || {
          menu_item_id: id, name: mi.name, category: mi.category,
          unit_type: unitType, qty: 0, entries: 0, revenue: 0,
          minPrice: Infinity, maxPrice: 0, prices: [],
        };
        prev.qty += qtyAdded;
        prev.entries += 1;
        prev.revenue += revenue;
        if (price > 0) {
          prev.minPrice = Math.min(prev.minPrice, price);
          prev.maxPrice = Math.max(prev.maxPrice, price);
          prev.prices.push(price);
        }
        map.set(id, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [salesRaw]);

  const salesStats = useMemo(() => {
    const totalRevenue = productSales.reduce((s, p) => s + p.revenue, 0);
    const totalUnits = productSales.filter((p) => p.unit_type !== "kg").reduce((s, p) => s + p.qty, 0);
    const totalKg = productSales.filter((p) => p.unit_type === "kg").reduce((s, p) => s + p.qty, 0);
    const totalEntries = productSales.reduce((s, p) => s + p.entries, 0);
    const distinct = productSales.length;
    const top = productSales[0];
    const ordersCount = (salesRaw || []).length;
    const avgTicketOrder = ordersCount > 0 ? totalRevenue / ordersCount : 0;
    const revs = productSales.map((p) => p.revenue).sort((a, b) => a - b);
    const median = revs.length ? revs.length % 2 ? revs[(revs.length - 1) / 2] : (revs[revs.length / 2 - 1] + revs[revs.length / 2]) / 2 : 0;
    const mean = revs.length ? revs.reduce((s, v) => s + v, 0) / revs.length : 0;
    const variance = revs.length ? revs.reduce((s, v) => s + (v - mean) ** 2, 0) / revs.length : 0;
    const stdDev = Math.sqrt(variance);
    return { totalRevenue, totalUnits, totalKg, totalEntries, distinct, top, ordersCount, avgTicketOrder, median, stdDev };
  }, [productSales, salesRaw]);

  const exportSalesCSV = () => {
    const header = ["Produto", "Categoria", "Unidade", "Qtd vendida", "Lançamentos", "Receita (R$)", "Preço médio", "Preço mín", "Preço máx", "% Receita"];
    const rows = productSales.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`, p.category, p.unit_type,
      p.unit_type === "kg" ? p.qty.toFixed(3).replace(".", ",") : String(p.qty),
      String(p.entries), p.revenue.toFixed(2).replace(".", ","),
      (p.entries > 0 ? p.revenue / p.qty : 0).toFixed(2).replace(".", ","),
      (p.minPrice === Infinity ? 0 : p.minPrice).toFixed(2).replace(".", ","),
      p.maxPrice.toFixed(2).replace(".", ","),
      (salesStats.totalRevenue > 0 ? (p.revenue / salesStats.totalRevenue) * 100 : 0).toFixed(1).replace(".", ","),
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_produtos_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (type: "hoje" | "mes" | "ano") => {
    const now = new Date();
    if (type === "hoje") { const d = format(now, "yyyy-MM-dd"); setStartDate(d); setEndDate(d); }
    else if (type === "mes") { setStartDate(format(startOfMonth(now), "yyyy-MM-dd")); setEndDate(format(endOfMonth(now), "yyyy-MM-dd")); }
    else { setStartDate(format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd")); setEndDate(format(new Date(now.getFullYear(), 11, 31), "yyyy-MM-dd")); }
  };

  const topPct = salesStats.totalRevenue > 0 && salesStats.top ? (salesStats.top.revenue / salesStats.totalRevenue) * 100 : 0;

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
        <div className="flex gap-2 pb-0.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("hoje")}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("mes")}>Mês</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("ano")}>Ano</Button>
        </div>
        <Button onClick={exportSalesCSV} disabled={!productSales.length} size="sm" className="ml-auto">
          <Download className="h-4 w-4 mr-2" /> Exportar vendas
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatsCard title="Receita total" value={`R$ ${salesStats.totalRevenue.toFixed(2)}`} icon={TrendingUp} variant="success" />
        <StatsCard title="Pedidos" value={String(salesStats.ordersCount)} icon={FileBarChart} />
        <StatsCard title="Ticket médio" value={`R$ ${salesStats.avgTicketOrder.toFixed(2)}`} icon={BarChart3} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatsCard title="Produtos distintos" value={String(salesStats.distinct)} icon={Package} />
        <StatsCard title="Unidades vendidas" value={String(salesStats.totalUnits)} icon={Package} />
        <StatsCard title="Total em kg" value={`${salesStats.totalKg.toFixed(3)} kg`} icon={Package} />
      </div>

      {salesStats.top && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[var(--color-accent)]" /> Análise estatística (por produto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">🏆 Destaque do período</p>
                <p className="font-bold font-heading text-lg text-[var(--color-text-primary)]">{salesStats.top.name}</p>
                <p className="text-sm text-[var(--color-accent)] font-semibold">
                  R$ {salesStats.top.revenue.toFixed(2)} <span className="text-[var(--color-text-secondary)] font-normal">({topPct.toFixed(1)}% da receita)</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Receita média</p>
                  <p className="font-bold font-heading text-[var(--color-text-primary)]">R$ {(salesStats.totalRevenue / Math.max(1, salesStats.distinct)).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Mediana</p>
                  <p className="font-bold font-heading text-[var(--color-text-primary)]">R$ {salesStats.median.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Desvio padrão</p>
                  <p className="font-bold font-heading text-[var(--color-text-primary)]">R$ {salesStats.stdDev.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Detalhamento por produto</CardTitle></CardHeader>
        <CardContent>
          {loadingSales ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Carregando...</p>
          ) : !productSales.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhuma venda no período 📭</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd vendida</TableHead>
                    <TableHead className="text-right">Preço médio</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.map((p) => {
                    const avgPrice = p.qty > 0 ? p.revenue / p.qty : 0;
                    const pct = salesStats.totalRevenue > 0 ? (p.revenue / salesStats.totalRevenue) * 100 : 0;
                    const qtyDisplay = p.unit_type === "kg" ? `${p.qty.toFixed(3)} kg` : `${p.qty} un`;
                    return (
                      <TableRow key={p.menu_item_id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-[var(--color-text-secondary)]">{p.category}</TableCell>
                        <TableCell className="text-right font-medium">{qtyDisplay}</TableCell>
                        <TableCell className="text-right text-sm">R$ {avgPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-[var(--color-accent)]">R$ {p.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm">{pct.toFixed(1)}%</span>
                            <Progress value={pct} className="h-1.5 w-20 [&>div]:bg-[var(--color-accent)]" />
                          </div>
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
    </div>
  );
}
