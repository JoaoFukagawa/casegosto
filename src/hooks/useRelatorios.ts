import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/services/clients";
import { getAllOrders } from "@/services/orders";
import { subDays } from "date-fns";

export function useInactiveClients(diasInativo: number) {
  return useQuery({
    queryKey: ["clientes-inativos", diasInativo],
    queryFn: async () => {
      const today = new Date();
      const corte = subDays(today, diasInativo).toISOString();
      const clientes = await getClients();
      const pedidos = await getAllOrders();
      const normalize = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
      const ultimoPedido: Record<string, string> = {};
      for (const p of pedidos || []) {
        const nome = normalize((p as any).customer_name || "");
        if (nome && (p as any).created_at && !ultimoPedido[nome]) {
          ultimoPedido[nome] = (p as any).created_at;
        }
      }
      const todayMs = today.getTime();
      return (clientes || [])
        .map((c: any) => {
          const key = normalize(c.nome || "");
          const ultimaCompra = key ? ultimoPedido[key] ?? null : null;
          let diasSemComprar: number | null = null;
          if (ultimaCompra) {
            const t = new Date(ultimaCompra).getTime();
            if (!Number.isNaN(t)) {
              diasSemComprar = Math.max(0, Math.floor((todayMs - t) / 86400000));
            }
          }
          return { ...c, ultimaCompra, diasSemComprar };
        })
        .filter((c: any) => !c.ultimaCompra || new Date(c.ultimaCompra) < new Date(corte))
        .sort((a: any, b: any) => {
          if (!a.ultimaCompra) return -1;
          if (!b.ultimaCompra) return 1;
          return new Date(a.ultimaCompra).getTime() - new Date(b.ultimaCompra).getTime();
        });
    },
  });
}
