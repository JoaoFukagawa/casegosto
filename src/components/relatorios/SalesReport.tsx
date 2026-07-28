import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, FileBarChart, Package, BarChart3, Trophy } from "lucide-react";
import StatsCard from "@/components/StatsCard";

type ProdAgg = {
  menu_item_id: string; name: string; category: string; unit_type: string;
  qty: number; entries: number; revenue: number;
  minPrice: number; maxPrice: number; prices: number[];
};

type SalesStats = {
  totalRevenue: number; totalUnits: number; totalKg: number; totalEntries: number;
  distinct: number; top: ProdAgg | undefined; ordersCount: number;
  avgTicketOrder: number; median: number; stdDev: number;
};

export default function SalesReport({
  productSales, salesStats, loadingSales, startDate, endDate, exportSalesCSV,
}: {
  productSales: ProdAgg[]; salesStats: SalesStats;
  loadingSales: boolean; startDate: string; endDate: string;
  exportSalesCSV: () => void;
}) {
  return (
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
  );
}
