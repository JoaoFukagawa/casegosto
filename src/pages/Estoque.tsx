import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function Estoque() {
  const [search, setSearch] = useState("");

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu_items_estoque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: orderItemsToday } = useQuery({
    queryKey: ["order_items_today_estoque", startOfDay],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity, weight, orders!inner(status, created_at), menu_items(stock_by_unit, unit_type)")
        .gte("orders.created_at", startOfDay);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  // Aggregate per menu_item: total ordered, delivered, pending (not yet delivered, not cancelled)
  const aggregates = useMemo(() => {
    const map: Record<string, { ordered: number; delivered: number; pending: number }> = {};
    for (const it of orderItemsToday || []) {
      const order = it.orders as any;
      if (!order || order.status === "cancelado") continue;
      const mi = (it as any).menu_items;
      const byUnit = mi?.stock_by_unit || mi?.unit_type !== "kg";
      const qty = byUnit ? Number(it.quantity) : Number(it.weight || it.quantity);
      if (!map[it.menu_item_id]) map[it.menu_item_id] = { ordered: 0, delivered: 0, pending: 0 };
      map[it.menu_item_id].ordered += qty;
      if (order.status === "entregue") {
        map[it.menu_item_id].delivered += qty;
      } else {
        map[it.menu_item_id].pending += qty;
      }
    }
    return map;
  }, [orderItemsToday]);

  const filtered = (items || []).filter((i) =>
    !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce((acc: Record<string, typeof filtered>, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Totals
  const totalPending = Object.values(aggregates).reduce((s, a) => s + a.pending, 0);
  const totalDelivered = Object.values(aggregates).reduce((s, a) => s + a.delivered, 0);
  const totalOrdered = Object.values(aggregates).reduce((s, a) => s + a.ordered, 0);
  const lowStockCount = (items || []).filter((i) => {
    if (i.stock === null || i.stock === undefined) return false;
    const agg = aggregates[i.id] || { delivered: 0 };
    const remaining = Number(i.stock) - agg.delivered;
    return remaining <= 5;
  }).length;

  const renderRow = (item: any) => {
    const agg = aggregates[item.id] || { ordered: 0, delivered: 0, pending: 0 };
    const hasStock = item.stock !== null && item.stock !== undefined;
    const remaining = hasStock ? Number(item.stock) - agg.delivered : null;
    const byUnit = item.stock_by_unit || item.unit_type !== "kg";
    const isKg = item.unit_type === "kg" && !byUnit;
    const fmt = (n: number) => isKg ? `${n.toFixed(3)}kg` : `${n}`;

    let statusBadge = null;
    if (hasStock && remaining !== null) {
      if (remaining <= 0) {
        statusBadge = <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Esgotado</Badge>;
      } else if (remaining <= 5) {
        statusBadge = <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">Baixo</Badge>;
      } else {
        statusBadge = <Badge variant="outline" className="bg-success/15 text-success border-success/30">OK</Badge>;
      }
    }

    return (
      <TableRow key={item.id}>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell className="text-center">
          {hasStock ? fmt(Number(item.stock)) : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-center text-muted-foreground">{fmt(agg.ordered)}</TableCell>
        <TableCell className="text-center">
          <span className="text-success font-medium">{fmt(agg.delivered)}</span>
        </TableCell>
        <TableCell className="text-center">
          {agg.pending > 0 ? (
            <span className="text-warning font-bold">{fmt(agg.pending)}</span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          {hasStock && remaining !== null ? (
            <span className={`font-bold font-heading ${remaining <= 0 ? "text-destructive" : remaining <= 5 ? "text-warning" : "text-foreground"}`}>
              {fmt(remaining)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-center">{statusBadge}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-heading text-foreground">Estoque do Dia</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saldo = Estoque inicial − Entregue. Pendente = pedido feito mas ainda não entregue.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-3 bg-muted text-muted-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total pedido hoje</p>
              <p className="text-xl font-bold font-heading">{totalOrdered.toFixed(totalOrdered % 1 ? 2 : 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-3 bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Já entregue</p>
              <p className="text-xl font-bold font-heading">{totalDelivered.toFixed(totalDelivered % 1 ? 2 : 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-3 bg-warning/10 text-warning">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente entrega</p>
              <p className="text-xl font-bold font-heading">{totalPending.toFixed(totalPending % 1 ? 2 : 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl p-3 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Itens com estoque baixo</p>
              <p className="text-xl font-bold font-heading">{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum item encontrado
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="font-heading text-lg capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Estoque inicial</TableHead>
                    <TableHead className="text-center">Pedido hoje</TableHead>
                    <TableHead className="text-center">Entregue</TableHead>
                    <TableHead className="text-center">Pendente</TableHead>
                    <TableHead className="text-center">Saldo atual</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{catItems.map(renderRow)}</TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
