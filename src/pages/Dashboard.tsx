import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import NewOrderDialog from "@/components/NewOrderDialog";
import { DollarSign, ShoppingBag, Clock, CheckCircle, FileText, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: todayOrders } = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDay)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  const { data: pratosRanking } = useQuery({
    queryKey: ["pratos_ranking", monthStart],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pratos")
        .select("nome_prato, data, quantidade_vendida")
        .gte("data", monthStart)
        .lte("data", monthEnd);
      if (error) throw error;
      const map: Record<string, { nome: string; dias: Set<string>; qtd: number }> = {};
      for (const p of data || []) {
        const key = p.nome_prato.trim().toLowerCase();
        if (!map[key]) map[key] = { nome: p.nome_prato, dias: new Set(), qtd: 0 };
        map[key].dias.add(p.data);
        map[key].qtd += p.quantidade_vendida || 0;
      }
      return Object.values(map)
        .map((r) => ({ nome: r.nome, dias: r.dias.size, qtd: r.qtd }))
        .sort((a, b) => b.qtd - a.qtd);
    },
    refetchInterval: 30000,
  });

  const totalVendas = todayOrders?.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0) ?? 0;
  const totalPedidos = todayOrders?.length ?? 0;
  const pedidosPendentes = todayOrders?.filter((o) => o.status === "pendente" || o.status === "preparando").length ?? 0;
  const pedidosEntregues = todayOrders?.filter((o) => o.status === "entregue").length ?? 0;
  const pedidosHaver = todayOrders?.filter((o) => o.payment_method === "haver" && o.status !== "cancelado") ?? [];
  const totalHaver = pedidosHaver.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">
            Painel de Hoje
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <NewOrderDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard title="Faturamento" value={`R$ ${totalVendas.toFixed(2)}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Total de Pedidos" value={totalPedidos} icon={ShoppingBag} />
        <StatsCard title="Em Andamento" value={pedidosPendentes} icon={Clock} variant="warning" />
        <StatsCard title="Entregues" value={pedidosEntregues} icon={CheckCircle} variant="success" />
        <StatsCard title="Haver" value={`${pedidosHaver.length} · R$ ${totalHaver.toFixed(2)}`} icon={FileText} description="Pagamentos pendentes" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking do mês — Pratos mais vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pratosRanking?.length ? (
            <div className="space-y-2">
              {pratosRanking.slice(0, 10).map((p, idx) => (
                <div key={p.nome} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full font-heading font-bold text-sm ${idx === 0 ? "bg-primary text-primary-foreground" : idx < 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Apareceu em <span className="font-medium text-foreground">{p.dias}</span> dia{p.dias !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold font-heading text-primary">{p.qtd} marmita{p.qtd !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Ainda não há pratos lançados este mês. Adicione o "Prato do dia" ao criar um pedido. 🍱</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders?.length ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd/MM · HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={order.status} />
                    <span className="font-bold font-heading text-primary">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum pedido ainda. Crie o primeiro! 🍱</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
