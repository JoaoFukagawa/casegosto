import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Trophy, UtensilsCrossed } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePratosRaw } from "@/hooks/usePratos";

export default function PratoDoDia() {
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  const { data: pratos } = usePratosRaw(monthStart, monthEnd);

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
      <PageHeader
        title={<span className="flex items-center gap-2"><UtensilsCrossed className="h-6 w-6 text-[var(--color-accent)]" /> Prato do Dia</span>}
        subtitle={`Histórico e ranking dos pratos vendidos em ${format(today, "MMMM", { locale: ptBR })}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--color-accent)]" />
            Ranking do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length ? (
            <div className="space-y-2">
              {ranking.map((p, idx) => (
                <div key={p.nome} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 hover:bg-[var(--color-surface-hover)]">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full font-heading font-bold text-sm ${idx === 0 ? "bg-[var(--color-accent)] text-[var(--color-accent-text)]" : idx < 3 ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{p.nome}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Apareceu em <span className="font-medium text-[var(--color-text-primary)]">{p.dias}</span> dia{p.dias !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold font-heading text-[var(--color-accent)]">{p.qtd} marmita{p.qtd !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message='Ainda não há pratos lançados este mês. Adicione o "Prato do dia" ao criar um pedido.' />
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
                <div key={dia} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    {format(new Date(dia + "T00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((i, idx) => (
                      <span key={idx} className="text-xs bg-[var(--color-surface-secondary)] px-2 py-1 rounded-full">
                        {i.nome} · <span className="font-semibold text-[var(--color-accent)]">{i.qtd}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Sem registros este mês." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
