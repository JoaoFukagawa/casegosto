import { useState } from "react";
import NewOrderDialog from "@/components/NewOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import StatusBadge from "@/components/StatusBadge";
import PrintOrderCoupon from "@/components/PrintOrderCoupon";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay as startOfDayFn, endOfDay as endOfDayFn, parseISO } from "date-fns";
import { toast } from "sonner";
import { Trash2, Truck, Store, MapPin, Copy, CalendarDays } from "lucide-react";
import { useOrders, useHaverOrders, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";

const statuses = ["pendente", "preparando", "pronto", "entregue", "cancelado"];

export default function Pedidos() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const dayStart = startOfDayFn(parseISO(selectedDate)).toISOString();
  const dayEnd = endOfDayFn(parseISO(selectedDate)).toISOString();

  const { data: orders, isLoading } = useOrders(dayStart, dayEnd);
  const { data: haverOrders } = useHaverOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

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
              {order.source === "online" && (
                <span className="text-[11px] font-bold uppercase tracking-wide text-white bg-[var(--color-accent)] rounded-full px-2 py-0.5">
                  🛒 Online
                </span>
              )}
              {order.delivery_time && (
                <span className="text-sm font-bold text-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2 py-0.5 rounded-md">
                  ⏰ {order.delivery_time.slice(0, 5)}
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
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
              className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
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
              <span className="text-[var(--color-text-primary)]">
                {item.weight
                  ? `${item.weight}kg ${item.menu_items?.name || "Item"}`
                  : `${item.quantity}x ${item.menu_items?.name || "Item"}`}
              </span>
              <span className="text-[var(--color-text-secondary)]">R$ {(item.weight ? item.unit_price * item.weight : item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-2">
          <span className="flex items-center gap-1">
            {order.delivery_type === "entrega" ? <Truck className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
            {order.delivery_type === "entrega" ? "Entrega" : "Retirada"}
          </span>
          {order.order_payments && order.order_payments.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-2">
              {order.order_payments.map((p: any, idx: number) => (
                <span key={p.id || idx}>
                  {p.method_value === "dinheiro" ? "💵" : p.method_value === "pix" ? "📱" : p.method_value === "haver" ? "📋" : "💳"}{" "}
                  {p.method_label} <span className="font-medium text-[var(--color-text-primary)]">R$ {Number(p.amount).toFixed(2)}</span>
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
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
            {order.delivery_fee > 0 && (
              <span className="ml-2 font-medium text-[var(--color-text-primary)]">· Taxa: R$ {Number(order.delivery_fee).toFixed(2)}</span>
            )}
          </p>
        )}
        {order.notes && (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] italic">
            📝 {order.notes}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <StatusBadge status={order.status} />
          <span className="text-lg font-extrabold font-heading text-[var(--color-accent)]">
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
      <PageHeader
        title="Pedidos"
        subtitle={<><span className="font-bold text-[var(--color-warning)]">{pendingCount}</span> pedido(s) pendente(s) ainda hoje</>}
        actions={<NewOrderDialog />}
      />

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome do cliente..."
        />
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-text-secondary)]" />
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
        <EmptyState message="Carregando..." />
      ) : !displayOrders.length ? (
        <EmptyState message={search || paymentFilter !== "todos" ? "Nenhum pedido encontrado com esse filtro." : "Nenhum pedido encontrado. Crie o primeiro!"} />
      ) : (
        <div className="space-y-4">
          {showingHaver && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Mostrando <span className="font-bold text-[var(--color-text-primary)]">{displayOrders.length}</span> pedido(s) com pagamento haver · Total: <span className="font-bold text-[var(--color-accent)]">R$ {displayOrders.reduce((s, o) => s + o.total, 0).toFixed(2)}</span>
            </p>
          )}
          {displayOrders.map(renderOrder)}
        </div>
      )}
    </div>
  );
}
