import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, startOfMonth, endOfMonth, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Download, TrendingDown, FileBarChart, Package, TrendingUp, Trophy, BarChart3, Users } from "lucide-react";
import StatsCard from "@/components/StatsCard";

const EXPENSE_CATEGORIES = [
  { value: "todos", label: "Todas as categorias" },
  { value: "mercado", label: "🛒 Mercado" },
  { value: "embalagens", label: "📦 Embalagens" },
  { value: "gas", label: "🔥 Gás" },
  { value: "entregador", label: "🛵 Entregador" },
  { value: "outros", label: "📋 Outros" },
];

export default function Relatorios() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [category, setCategory] = useState("todos");
  const [diasInativo, setDiasInativo] = useState(30);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["relatorios-expenses", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: salesRaw, isLoading: loadingSales } = useQuery({
    queryKey: ["relatorios-sales", startDate, endDate],
    queryFn: async () => {
      const startIso = new Date(startDate + "T00:00:00").toISOString();
      const endIso = new Date(endDate + "T23:59:59.999").toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, created_at, order_items(id, quantity, unit_price, weight, menu_item_id, menu_items(name, category, unit_type))")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .neq("status", "cancelado");
      if (error) throw error;
      return data;
    },
  });

  // ===== Clientes inativos =====
  const { data: clientesInativos, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-inativos", diasInativo],
    queryFn: async () => {
      const corte = subDays(today, diasInativo).toISOString();

      // Busca todos os clientes
      const { data: clientes, error: errClientes } = await supabase
        .from("clientes")
        .select("id, nome, telefone");
      if (errClientes) throw errClientes;

      // Busca o último pedido de cada cliente
      const { data: pedidos, error: errPedidos } = await supabase
        .from("orders")
        .select("customer_name, created_at")
        .order("created_at", { ascending: false });
      if (errPedidos) throw errPedidos;

      // Último pedido por cliente (comparando pelo nome)
      const ultimoPedido: Record<string, string> = {};
      for (const p of pedidos || []) {
        const nome = (p.customer_name || "").toLowerCase().trim();
        if (nome && !ultimoPedido[nome]) {
          ultimoPedido[nome] = p.created_at;
        }
      }

      // Filtra clientes que não compram há X dias ou nunca compraram
      return (clientes || [])
        .map((c) => ({
          ...c,
    ultimaCompra: ultimoPedido[(c.nome || "").toLowerCase().trim()] || null,
          diasSemComprar: ultimoPedido[(c.nome || "").toLowerCase().trim()]
            ? differenceInDays(today, new Date(ultimoPedido[(c.nome || "").toLowerCase().trim()]))
            ? differenceInDays(today, new Date(ultimoPedido[c.id]))
            : null,
        }))
        .filter((c) => !c.ultimaCompra || new Date(c.ultimaCompra) < new Date(corte))
        .sort((a, b) => {
          if (!a.ultimaCompra) return -1;
          if (!b.ultimaCompra) return 1;
          return new Date(a.ultimaCompra).getTime() - new Date(b.ultimaCompra).getTime();
        });
    },
  });

  const exportClientesCSV = () => {
    if (!clientesInativos?.length) return;
    const header = ["Nome", "Telefone", "Última compra", "Dias sem comprar"];
    const rows = clientesInativos.map((c) => [
      `"${(c.nome
 || "").replace(/"/g, '""')}"`,
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
    menu_item_id: string;
    name: string;
    category: string;
    unit_type: string;
    qty: number;
    entries: number;
    revenue: number;
    minPrice: number;
    maxPrice: number;
    prices: number[];
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
    return (expenses || []).filter((e) => category === "todos" || e.category === category);
  }, [expenses, category]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const count = filtered.length;
  const average = count > 0 ? total / count : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) map[e.category] = (map[e.category] || 0) + Number(e.amount);
    return map;
  }, [filtered]);

  const exportCSV = () => {
    const header = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = filtered.map((e) => [
      format(parseISO(e.expense_date), "dd/MM/yyyy"),
      `"${e.description.replace(/"/g, '""')}"`,
      EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label.replace(/^\S+\s/, "") || e.category,
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" /> Relatórios
          </h2>
          <p className="text-sm text-muted-foreground">Análise detalhada de despesas por período e categoria</p>
        </div>
        <Button onClick={exportCSV} disabled={!filtered.length}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
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

      {/* Clientes inativos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xl font-extrabold font-heading text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Clientes Inativos
          </h3>
          <Button onClick={exportClientesCSV} disabled={!clientesInativos?.length} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <Label>Clientes sem comprar há mais de</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={1}
                    value={diasInativo}
                    onChange={(e) => setDiasInativo(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground pb-1">
                {loadingClientes ? "Buscando..." : `${clientesInativos?.length || 0} cliente(s) encontrado(s)`}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            {loadingClientes ? (
              <p className="text-center text-muted-foreground py-6">Carregando...</p>
            ) : !clientesInativos?.length ? (
              <p className="text-center text-muted-foreground py-6">Nenhum cliente inativo nesse período 🎉</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Última compra</TableHead>
                      <TableHead className="text-right">Dias sem comprar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesInativos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.telefone || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.ultimaCompra ? format(new Date(c.ultimaCompra), "dd/MM/yyyy") : "Nunca comprou"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          {c.diasSemComprar !== null ? `${c.diasSemComprar} dias` : "—"}
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

      {/* Vendas de produtos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xl font-extrabold font-heading text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Vendas de Produtos
          </h3>
          <Button onClick={exportSalesCSV} disabled={!productSales.length} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar vendas
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatsCard title="Receita total" value={`R$ ${salesStats.totalRevenue.toFixed(2)}`} icon={TrendingUp} variant="success" />
          <StatsCard title="Pedidos" value={String(salesStats.ordersCount)} icon={FileBarChart} />
          <StatsCard title="Ticket médio" value={`R$ ${salesStats.avgTicketOrder.toFixed(2)}`} icon={BarChart3} />
          <StatsCard title="Produtos diferentes" value={String(salesStats.distinct)} icon={Package} />
          <StatsCard title="Unidades vendidas" value={String(salesStats.totalUnits)} icon={Package} />
          <StatsCard title="Total em kg" value={`${salesStats.totalKg.toFixed(3)} kg`} icon={Package} />
        </div>
        {salesStats.top && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Análise estatística (por produto)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">🏆 Mais vendido (receita)</p>
                  <p className="font-bold font-heading">{salesStats.top.name}</p>
                  <p className="text-xs text-primary">R$ {salesStats.top.revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receita média por produto</p>
                  <p className="font-bold font-heading">R$ {(salesStats.totalRevenue / Math.max(1, salesStats.distinct)).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mediana de receita</p>
                  <p className="font-bold font-heading">R$ {salesStats.median.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Desvio padrão</p>
                  <p className="font-bold font-heading">R$ {salesStats.stdDev.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Detalhamento por produto</CardTitle></CardHeader>
          <CardContent>
            {loadingSales ? (
              <p className="text-center text-muted-foreground py-6">Carregando...</p>
            ) : !productSales.length ? (
              <p className="text-center text-muted-foreground py-6">Nenhuma venda no período 📭</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd vendida</TableHead>
                      <TableHead className="text-right">Lançamentos</TableHead>
                      <TableHead className="text-right">Preço médio</TableHead>
                      <TableHead className="text-right">Mín / Máx</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">% Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSales.map((p) => {
                      const avgPrice = p.qty > 0 ? p.revenue / p.qty : 0;
                      const pct = salesStats.totalRevenue > 0 ? (p.revenue / salesStats.totalRevenue) * 100 : 0;
                      const qtyDisplay = p.unit_type === "kg" ? `${p.qty.toFixed(3)} kg` : `${p.qty} un`;
                      const minP = p.minPrice === Infinity ? 0 : p.minPrice;
                      return (
                        <TableRow key={p.menu_item_id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                          <TableCell className="text-right font-medium">{qtyDisplay}</TableCell>
                          <TableCell className="text-right text-sm">{p.entries}</TableCell>
                          <TableCell className="text-right text-sm">R$ {avgPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">R$ {minP.toFixed(2)} / R$ {p.maxPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">R$ {p.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{pct.toFixed(1)}%</TableCell>
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

      {/* Despesas */}
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
                  {filtered.map((exp) => (
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
    </div>
  );
}