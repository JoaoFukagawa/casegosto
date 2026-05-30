import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NewOrderDialog from "@/components/NewOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import StatusBadge from "@/components/StatusBadge";
import PrintOrderCoupon from "@/components/PrintOrderCoupon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay as startOfDayFn, endOfDay as endOfDayFn, parseISO } from "date-fns";
import { toast } from "sonner";
import { Trash2, Truck, Store, MapPin, Copy, Search, CalendarDays } from "lucide-react";

const statuses = ["pendente", "preparando", "pronto", "entregue", "cancelado"];

export default function Pedidos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const dayStart = startOfDayFn(parseISO(selectedDate)).toISOString();
  const dayEnd = endOfDayFn(parseISO(selectedDate)).toISOString();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name)), order_payments(*)")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("delivery_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  // All "haver" orders (across all days)
  const { data: haverOrders } = useQuery({
    queryKey: ["orders_haver"],
    queryFn: async () => {
      // Order IDs that contain any haver payment split
      const { data: haverPayments } = await supabase
        .from("order_payments")
        .select("order_id")
        .eq("method_value", "haver");
      const ids = Array.from(new Set((haverPayments || []).map((p: any) => p.order_id)));

      // Build OR clause: orders with primary haver OR in the split list
      const orFilter = ids.length
        ? `payment_method.eq.haver,id.in.(${ids.join(",")})`
        : "payment_method.eq.haver";
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name)), order_payments(*)")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders_haver"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Status atualizado!");
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders_haver"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Pedido excluído!");
    },
  });

  const showingHaver = paymentFilter === "haver_todos";

  const displayOrders = showingHaver
    ? (haverOrders || [])
    : (orders || []).filter((order) => {
        const matchesSearch = !search.trim() || order.customer_name.toLowerCase().includes(search.toLowerCase());
        const matchesPayment = paymentFilter === "todos" || order.payment_method === paymentFilter;
        const matchesStatus =
          statusFilter === "todos"
            ? true
            : statusFilter === "para_entregar"
            ? order.delivery_type === "entrega" &&
              order.status !== "entregue" &&
              order.status !== "cancelado"
            : order.status === statusFilter;
        return matchesSearch && matchesPayment && matchesStatus;
      });

  const renderOrder = (order: any) => (
    <Card key={order.id} className="animate-slide-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              {order.customer_name}
              {order.delivery_time && (
                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  ⏰ {order.delivery_time.slice(0, 5)}
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), "dd/MM/yyyy · HH:mm")}
              {order.customer_phone && ` · ${order.customer_phone}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={order.status}
              onValueChange={(status) => updateStatus.mutate({ id: order.id, status })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <EditOrderDialog order={order} />
            <PrintOrderCoupon order={order} />
            <Button
              variant="ghost"
              size="icon"
              title="Copiar pedido"
              onClick={() => {
                const items = order.order_items?.map((item: any) =>
                  item.weight
                    ? `${item.weight}kg ${item.menu_items?.name || "Item"}`
                    : `${item.quantity}x ${item.menu_items?.name || "Item"}`
                ).join("\n") || "";
                const text = [
                  `📋 *PEDIDO - ${order.customer_name}*`,
                  order.customer_phone ? `📞 ${order.customer_phone}` : "",
                  "",
                  items,
                  "",
                  `💰 *Total: R$ ${order.total.toFixed(2)}*`,
                  `💳 ${order.payment_method ? order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1) : ""}`,
                  order.delivery_type === "entrega" ? `🚚 Entrega` : `🏪 Retirada`,
                  order.delivery_address ? `📍 ${order.delivery_address}` : "",
                  order.notes ? `📝 ${order.notes}` : "",
                ].filter(Boolean).join("\n");
                navigator.clipboard.writeText(text);
                toast.success("Pedido copiado!");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => deleteOrder.mutate(order.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.weight
                  ? `${item.weight}kg ${item.menu_items?.name || "Item"}`
                  : `${item.quantity}x ${item.menu_items?.name || "Item"}`}
              </span>
              <span className="text-muted-foreground">R$ {(item.weight ? item.unit_price * item.weight : item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-2">
          <span className="flex items-center gap-1">
            {order.delivery_type === "entrega" ? <Truck className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
            {order.delivery_type === "entrega" ? "Entrega" : "Retirada"}
          </span>
          {order.order_payments && order.order_payments.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-2">
              {order.order_payments.map((p: any, idx: number) => (
                <span key={p.id || idx}>
                  {p.method_value === "dinheiro" ? "💵" : p.method_value === "pix" ? "📱" : p.method_value === "haver" ? "📋" : "💳"}{" "}
                  {p.method_label} <span className="font-medium text-foreground">R$ {Number(p.amount).toFixed(2)}</span>
                  {idx < order.order_payments.length - 1 ? " · " : ""}
                </span>
              ))}
            </span>
          ) : order.payment_method && (
            <span>
              {order.payment_method === "dinheiro" ? "💵" : order.payment_method === "pix" ? "📱" : order.payment_method === "haver" ? "📋" : "💳"}{" "}
              {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
            </span>
          )}
        </div>
        {order.delivery_type === "entrega" && order.delivery_address && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
            {order.delivery_fee > 0 && (
              <span className="ml-2 font-medium text-foreground">· Taxa: R$ {Number(order.delivery_fee).toFixed(2)}</span>
            )}
          </p>
        )}
        {order.notes && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            📝 {order.notes}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <StatusBadge status={order.status} />
          <span className="text-lg font-extrabold font-heading text-primary">
            R$ {order.total.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const pendingCount = (orders || []).filter(
    (o) => o.status === "pendente" || o.status === "preparando"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-bold text-warning">{pendingCount}</span> pedido(s) pendente(s) ainda hoje
          </p>
        </div>
        <NewOrderDialog />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome do cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[170px]"
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
            <SelectItem value="pix">📱 PIX</SelectItem>
            <SelectItem value="cartao">💳 Cartão</SelectItem>
            <SelectItem value="haver">📋 Haver (hoje)</SelectItem>
            <SelectItem value="haver_todos">📋 Haver (todos os dias)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="para_entregar">🚚 Para entregar</SelectItem>
            <SelectItem value="pendente">⏳ Pendente</SelectItem>
            <SelectItem value="preparando">🔥 Preparando</SelectItem>
            <SelectItem value="pronto">✅ Pronto</SelectItem>
            <SelectItem value="entregue">📦 Entregue</SelectItem>
            <SelectItem value="cancelado">❌ Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : !displayOrders.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search || paymentFilter !== "todos"
                ? "Nenhum pedido encontrado com esse filtro 🔍"
                : "Nenhum pedido encontrado. Crie o primeiro! 🍱"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {showingHaver && (
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-bold text-foreground">{displayOrders.length}</span> pedido(s) com pagamento haver · Total: <span className="font-bold text-primary">R$ {displayOrders.reduce((s, o) => s + o.total, 0).toFixed(2)}</span>
            </p>
          )}
          {displayOrders.map(renderOrder)}
        </div>
      )}
    </div>
  );
}
