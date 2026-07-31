import StatsCard from "@/components/StatsCard";
import NewOrderDialog from "@/components/NewOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import PageHeader from "@/components/PageHeader";
import { DollarSign, ShoppingBag, Clock, CheckCircle, FileText, Store, Truck, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardTodayOrders, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";
import { useNavigate } from "react-router-dom";

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  haver: "Haver",
};

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

function SectionTitle({ icon: Icon, title, count, tone = "default" }: { icon: any; title: string; count: number; tone?: "default" | "success" }) {
  const iconColor = tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-accent)]";
  return (
    <h3 className="text-[13px] font-semibold uppercase tracking-[1.2px] text-[var(--color-text-primary)] opacity-70 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      {title}
      <span className="text-[var(--color-accent)] font-semibold">({count})</span>
    </h3>
  );
}

function PaymentBadge({ method }: { method?: string }) {
  if (!method) return null;
  const styles: Record<string, string> = {
    pix: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
    dinheiro: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
    haver: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
    cartao: "bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
  };
  return (
    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide ${styles[method] || "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"}`}>
      {paymentLabels[method] || method}
    </span>
  );
}

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
    <div className="space-y-8">
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
        <StatsCard title="Haver" value={`${pedidosHaver.length} · R$ ${totalHaver.toFixed(2)}`} icon={FileText} description="Pagamentos pendentes" highlight />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <SectionTitle icon={Clock} title="Em Andamento" count={activeOrders.length} />

          {activeOrders.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]">
              <CardContent className="py-10 text-center text-[var(--color-text-secondary)] text-sm">
                Nenhum pedido em andamento
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Card
                  key={order.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] card-hover"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                            {order.customer_name}
                          </p>
                          {order.delivery_type === "entrega" ? (
                            <Truck className="h-3.5 w-3.5 text-[var(--color-text-secondary)] shrink-0" />
                          ) : (
                            <Store className="h-3.5 w-3.5 text-[var(--color-text-secondary)] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {format(new Date(order.created_at), "HH:mm")}
                          {order.delivery_time && ` · ⏰ ${order.delivery_time.slice(0, 5)}`}
                        </p>
                        <PaymentBadge method={order.payment_method} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-[var(--color-accent)]">R$ {order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                      {nextStatus[order.status] && (
                        <Button
                          size="sm"
                          className={`h-9 px-4 text-xs font-bold uppercase tracking-[0.5px] rounded-lg text-[var(--color-accent-text)] transition-all duration-200 hover:brightness-90 ${
                            statusLabel[order.status] === "Pronto"
                              ? "bg-[var(--color-success)]"
                              : "bg-[var(--color-accent)]"
                          }`}
                          onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus[order.status] })}
                        >
                          {statusLabel[order.status]}
                        </Button>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <EditOrderDialog order={order as any} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-transparent"
                          onClick={() => deleteOrder.mutate(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <SectionTitle icon={CheckCircle} title="Entregues Hoje" count={deliveredOrders.length} tone="success" />

          {deliveredOrders.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]">
              <CardContent className="py-10 text-center text-[var(--color-text-secondary)] text-sm">
                Nenhum pedido entregue ainda
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardContent className="p-0 divide-y divide-[var(--color-border)]">
                {deliveredOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)] text-sm">{order.customer_name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {format(new Date(order.created_at), "HH:mm")}
                        {order.payment_method && ` · ${paymentLabels[order.payment_method] || order.payment_method}`}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-[var(--color-accent)]">R$ {order.total.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            variant="outline"
            className="w-full border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            onClick={() => navigate("/pedidos")}
          >
            Ver todos os pedidos
          </Button>
        </div>
      </div>
    </div>
  );
}
