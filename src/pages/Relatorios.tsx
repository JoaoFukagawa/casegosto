import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { FileBarChart, Download } from "lucide-react";
import { useExpenseReport } from "@/hooks/useExpenses";
import { useSalesReport } from "@/hooks/useOrders";
import { useInactiveClients } from "@/hooks/useRelatorios";
import ExpenseReport from "@/components/relatorios/ExpenseReport";
import SalesReport from "@/components/relatorios/SalesReport";
import InactiveClientsReport from "@/components/relatorios/InactiveClientsReport";

export default function Relatorios() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [category, setCategory] = useState("todos");
  const [diasInativo, setDiasInativo] = useState(30);

  const { data: expenses, isLoading } = useExpenseReport(startDate, endDate);

  const { data: salesRaw, isLoading: loadingSales } = useSalesReport(startDate, endDate);

  const { data: clientesInativos, isLoading: loadingClientes } = useInactiveClients(diasInativo);

  const exportClientesCSV = () => {
    if (!clientesInativos?.length) return;
    const header = ["Nome", "Telefone", "Última compra", "Dias sem comprar"];
    const rows = (clientesInativos as any[]).map((c) => [
      `"${(c.nome || "").replace(/"/g, '""')}"`,
      c.telefone || "",
      c.ultimaCompra ? format(new Date(c.ultimaCompra), "dd/MM/yyyy") : "Nunca comprou",
      c.diasSemComprar !== null ? String(c.diasSemComprar) : "—",
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_inativos_${diasInativo}dias.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  type ProdAgg = {
    menu_item_id: string; name: string; category: string; unit_type: string;
    qty: number; entries: number; revenue: number;
    minPrice: number; maxPrice: number; prices: number[];
  };

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
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" /> Relatórios</span>}
        subtitle="Análise detalhada de despesas por período e categoria"
        actions={<Button onClick={exportCSV} disabled={!filtered.length}><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>}
      />

      <ExpenseReport
        startDate={startDate} endDate={endDate} category={category}
        setStartDate={setStartDate} setEndDate={setEndDate} setCategory={setCategory}
        setQuickRange={setQuickRange}
        filtered={filtered} total={total} count={count} average={average}
        byCategory={byCategory} isLoading={isLoading} exportCSV={exportCSV}
      />

      <InactiveClientsReport
        clientesInativos={clientesInativos} loadingClientes={loadingClientes}
        diasInativo={diasInativo} setDiasInativo={setDiasInativo}
        exportClientesCSV={exportClientesCSV}
      />

      <SalesReport
        productSales={productSales} salesStats={salesStats}
        loadingSales={loadingSales} startDate={startDate} endDate={endDate}
        exportSalesCSV={exportSalesCSV}
      />
    </div>
  );
}
