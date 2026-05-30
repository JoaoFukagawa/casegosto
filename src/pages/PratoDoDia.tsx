import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, UtensilsCrossed } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PratoDoDia() {
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  const { data: pratos } = useQuery({
    queryKey: ["pratos_full", monthStart],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pratos")
        .select("nome_prato, data, quantidade_vendida")
        .gte("data", monthStart)
        .lte("data", monthEnd)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as { nome_prato: string; data: string; quantidade_vendida: number }[];
    },
  });

  const ranking = (() => {
    const map: Record<string, { nome: string; dias: Set<string>; qtd: number }> = {};
    for (const p of pratos || []) {
      const key = p.nome_prato.trim().toLowerCase();
      if (!map[key]) map[key] = { nome: p.nome_prato, dias: new Set(), qtd: 0 };
      map[key].dias.add(p.data);
      map[key].qtd += p.quantidade_vendida || 0;
    }
    return Object.values(map)
      .map((r) => ({ nome: r.nome, dias: r.dias.size, qtd: r.qtd }))
      .sort((a, b) => b.qtd - a.qtd);
  })();

  const porDia = (() => {
    const map: Record<string, { nome: string; qtd: number }[]> = {};
    for (const p of pratos || []) {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push({ nome: p.nome_prato, qtd: p.quantidade_vendida || 0 });
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-heading text-foreground flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          Prato do Dia
        </h2>
        <p className="text-sm text-muted-foreground">
          Histórico e ranking dos pratos vendidos em {format(today, "MMMM", { locale: ptBR })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length ? (
            <div className="space-y-2">
              {ranking.map((p, idx) => (
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
            <p className="text-center text-muted-foreground py-6 text-sm">
              Ainda não há pratos lançados este mês. Adicione o "Prato do dia" ao criar um pedido. 🍱
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Histórico por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {porDia.length ? (
            <div className="space-y-3">
              {porDia.map(([dia, items]) => (
                <div key={dia} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    {format(new Date(dia + "T00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((i, idx) => (
                      <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">
                        {i.nome} · <span className="font-semibold text-primary">{i.qtd}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Sem registros este mês.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
