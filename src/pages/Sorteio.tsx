import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PartyPopper, Copy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useDashboardTodayOrders } from "@/hooks/useOrders";

type CustomerEntry = { name: string };

function normalize(s: string) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export default function Sorteio() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { data: todayOrders, isLoading } = useDashboardTodayOrders(startOfDay);

  const [winners, setWinners] = useState<string[]>([]);
  const [lastWinner, setLastWinner] = useState<string | null>(null);

  const customers = useMemo<CustomerEntry[]>(() => {
    const seen = new Set<string>();
    const result: CustomerEntry[] = [];
    for (const o of todayOrders || []) {
      if (o.status === "cancelado") continue;
      const name = (o.customer_name || "").trim();
      if (!name) continue;
      const key = normalize(name);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ name });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [todayOrders]);

  const remaining = customers.filter((c) => !winners.includes(c.name));

  const copyList = () => {
    if (!customers.length) return;
    const text = customers.map((c) => c.name).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${customers.length} clientes copiados!`);
  };

  const exportTxt = () => {
    if (!customers.length) return;
    const text = `CLIENTES DO SORTEIO (${format(today, "dd/MM/yyyy")})\n\n${customers
      .map((c, i) => `${i + 1}. ${c.name}`)
      .join("\n")}`;
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_sorteio_${format(today, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada!");
  };

  const draw = () => {
    if (!remaining.length) return;
    const winner = remaining[Math.floor(Math.random() * remaining.length)];
    setWinners((w) => [...w, winner.name]);
    setLastWinner(winner.name);
    toast.success(`🎉 Vencedor: ${winner.name}`);
  };

  const reset = () => {
    setWinners([]);
    setLastWinner(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sorteio de Hoje"
        subtitle={format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyList} disabled={!customers.length}>
              <Copy className="h-4 w-4 mr-2" /> Copiar lista
            </Button>
            <Button variant="outline" size="sm" onClick={exportTxt} disabled={!customers.length}>
              <Download className="h-4 w-4 mr-2" /> Exportar .txt
            </Button>
          </div>
        }
      />

      {lastWinner && (
        <Card className="rounded-2xl border-[var(--color-accent)] bg-[var(--color-accent-muted)] shadow-[var(--shadow-card)]">
          <CardContent className="py-6 text-center">
            <p className="text-xs uppercase tracking-[1.5px] text-[var(--color-text-secondary)] mb-2">🏆 Vencedor</p>
            <p className="font-heading font-bold text-4xl text-[var(--color-accent)]">{lastWinner}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button className="bg-[var(--color-accent)] text-[var(--color-accent-text)] font-heading font-bold shadow-warm hover:bg-[var(--color-accent-hover)]" onClick={draw} disabled={!remaining.length}>
                <PartyPopper className="h-4 w-4 mr-2" /> Sortear próximo
              </Button>
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button className="bg-[var(--color-accent)] text-[var(--color-accent-text)] font-heading font-bold shadow-warm hover:bg-[var(--color-accent-hover)]" onClick={draw} disabled={!remaining.length}>
          <PartyPopper className="h-4 w-4 mr-2" /> {lastWinner ? "Sortear próximo" : "Sortear vencedor"}
        </Button>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {customers.length} participante{customers.length !== 1 ? "s" : ""} · {remaining.length} no sorteio
        </span>
      </div>

      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-[var(--color-text-secondary)] py-8">Carregando...</p>
          ) : !customers.length ? (
            <p className="text-center text-[var(--color-text-secondary)] py-8">Nenhum pedido registrado hoje ainda.</p>
          ) : (
            <ul className="max-h-[50vh] overflow-auto divide-y divide-[var(--color-border)]">
              {customers.map((c) => {
                const drawn = winners.includes(c.name);
                return (
                  <li key={c.name} className={`flex items-center justify-between px-4 py-3 text-sm ${drawn ? "opacity-40" : ""}`}>
                    <span className="font-medium text-[var(--color-text-primary)]">{c.name}</span>
                    <span className="flex items-center gap-2">
                      {drawn && <span className="text-xs text-[var(--color-accent)] font-semibold">✔ sorteado</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
