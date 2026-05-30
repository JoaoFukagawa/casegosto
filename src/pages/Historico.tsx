import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Truck } from "lucide-react";

export default function Historico() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterEntregas, setFilterEntregas] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("todos");

  const start = startOfDay(parseISO(selectedDate)).toISOString();
  const end = endOfDay(parseISO(selectedDate)).toISOString();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["historico", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name))")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = (orders || []).filter((o) => {
    if (filterEntregas && !(o.delivery_type === "entrega" && o.status === "entregue")) return false;
    if (paymentFilter !== "todos" && o.payment_method !== paymentFilter) return false;
    return true;
  });

  const totalVendas = filteredOrders.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0);
  const totalPedidos = filteredOrders.length;
  const entregues = filteredOrders.filter((o) => o.status === "entregue").length;
  const cancelados = filteredOrders.filter((o) => o.status === "cancelado").length;

  // Payment method totals
  const paymentTotals = (orders || [])
    .filter((o) => o.status !== "cancelado")
    .reduce((acc, o) => {
      acc[o.payment_method] = (acc[o.payment_method] || 0) + o.total;
      return acc;
    }, {} as Record<string, number>);

  const paymentLabels: Record<string, string> = {
    dinheiro: "💵 Dinheiro",
    pix: "📱 PIX",
    cartao: "💳 Cartão",
    haver: "📋 Haver",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">Histórico de Pedidos</h2>
          <p className="text-sm text-muted-foreground">Pesquise por data para ver os pedidos realizados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterEntregas ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterEntregas(!filterEntregas)}
            className="gap-1"
          >
            <Truck className="h-4 w-4" />
            {filterEntregas ? "Só Entregas" : "Todas"}
          </Button>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
              <SelectItem value="pix">📱 PIX</SelectItem>
              <SelectItem value="cartao">💳 Cartão</SelectItem>
              <SelectItem value="haver">📋 Haver</SelectItem>
            </SelectContent>
          </Select>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Total Pedidos</p>
            <p className="text-2xl font-extrabold font-heading text-foreground">{totalPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Faturamento</p>
            <p className="text-2xl font-extrabold font-heading text-primary">R$ {totalVendas.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Entregues</p>
            <p className="text-2xl font-extrabold font-heading text-green-600">{entregues}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Cancelados</p>
            <p className="text-2xl font-extrabold font-heading text-destructive">{cancelados}</p>
          </CardContent>
        </Card>
      </div>

      {/* Totais por forma de pagamento */}
      {Object.keys(paymentTotals).length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Object.entries(paymentTotals).map(([method, total]) => (
            <Card
              key={method}
              className={`cursor-pointer transition-colors ${paymentFilter === method ? "border-primary bg-primary/5" : ""}`}
              onClick={() => setPaymentFilter(paymentFilter === method ? "todos" : method)}
            >
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">{paymentLabels[method] || method}</p>
                <p className="text-lg font-extrabold font-heading text-primary">R$ {total.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Pedidos de {format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {paymentFilter !== "todos" && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                · {paymentLabels[paymentFilter] || paymentFilter} · Total: R$ {filteredOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0).toFixed(2)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !filteredOrders.length ? (
            <p className="text-muted-foreground text-center py-8">
              {filterEntregas ? "Nenhuma entrega nesta data 🛵" : paymentFilter !== "todos" ? "Nenhum pedido com esse pagamento 💳" : "Nenhum pedido nesta data 📋"}
            </p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{order.customer_name}</p>
                          {order.customer_phone && (
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.order_items?.map((item: any) =>
                          item.weight
                            ? `${item.weight}kg ${item.menu_items?.name || "Item"}`
                            : `${item.quantity}x ${item.menu_items?.name || "Item"}`
                        ).join(", ")}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {order.delivery_type === "entrega" ? "🚚 Entrega" : "🏪 Retirada"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {order.payment_method}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        R$ {order.total.toFixed(2)}
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
