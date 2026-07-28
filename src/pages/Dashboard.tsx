import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import NewOrderDialog from "@/components/NewOrderDialog";
import PageHeader from "@/components/PageHeader";
import { DollarSign, ShoppingBag, Clock, CheckCircle, FileText, Store, Truck, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardTodayOrders, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";
import { useNavigate } from "react-router-dom";

const nextStatus: Record<string, string> = {
  pendente: "preparando",
  preparando: "pronto",
  pronto: "entregue",
};

const statusLabel: Record<string, string> = {
  pendente: "Preparar",
  preparando: "Pronto",
  pronto: "Entregar",
};

export default function Dashboard() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const navigate = useNavigate();

  const { data: todayOrders } = useDashboardTodayOrders(startOfDay);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  const totalVendas = todayOrders?.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0) ?? 0;
  const totalPedidos = todayOrders?.length ?? 0;
  const pedidosPendentes = todayOrders?.filter((o) => o.status === "pendente" || o.status === "preparando").length ?? 0;
  const pedidosEntregues = todayOrders?.filter((o) => o.status === "entregue").length ?? 0;
  const pedidosHaver = todayOrders?.filter((o) => o.payment_method === "haver" && o.status !== "cancelado") ?? [];
  const totalHaver = pedidosHaver.reduce((sum, o) => sum + o.total, 0);

  const activeOrders = (todayOrders || []).filter((o) => o.status !== "entregue" && o.status !== "cancelado");
  const deliveredOrders = (todayOrders || []).filter((o) => o.status === "entregue");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Hoje"
        subtitle={format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        actions={<NewOrderDialog />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard title="Faturamento" value={`R$ ${totalVendas.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Total de Pedidos" value={totalPedidos} icon={ShoppingBag} />
        <StatsCard title="Em Andamento" value={pedidosPendentes} icon={Clock} variant="warning" />
        <StatsCard title="Entregues" value={pedidosEntregues} icon={CheckCircle} variant="success" />
        <StatsCard title="Haver" value={`${pedidosHaver.length} · R$ ${totalHaver.toFixed(2)}`} icon={FileText} description="Pagamentos pendentes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Em Andamento
            <span className="text-sm font-normal text-muted-foreground">({activeOrders.length})</span>
          </h3>

          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum pedido em andamento
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Card key={order.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground truncate">{order.customer_name}</p>
                          {order.delivery_type === "entrega" ? (
                            <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "HH:mm")}
                          {order.delivery_time && ` · ⏰ ${order.delivery_time.slice(0, 5)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold font-heading text-primary">R$ {order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      {nextStatus[order.status] && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 text-xs font-bold"
                          onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus[order.status] })}
                        >
                          {statusLabel[order.status]}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive ml-auto"
                        onClick={() => deleteOrder.mutate(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Entregues Hoje
            <span className="text-sm font-normal text-muted-foreground">({deliveredOrders.length})</span>
          </h3>

          {deliveredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum pedido entregue ainda
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {deliveredOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground text-sm">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "HH:mm")}</p>
                    </div>
                    <span className="font-bold font-heading text-primary text-sm">R$ {order.total.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={() => navigate("/pedidos")}>
            Ver todos os pedidos
          </Button>
        </div>
      </div>
    </div>
  );
}
