import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Trash2, Mic, Radio } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { DollarSign, TrendingDown, Target, AlertCircle } from "lucide-react";

type Bill = {
  id: string; nome: string; valor: number; categoria: string;
  status: "atrasada" | "vence-hoje" | "proxima" | "paga";
  meses_atrasada: number; due_date: string | null; paid_at: string | null;
};

function prioridadeDe(b: Pick<Bill, "status">): "high" | "medium" | "low" {
  return b.status === "atrasada" ? "high" : b.status === "vence-hoje" ? "medium" : "low";
}

export default function PainelTab({
  receitaMes, meta, setMeta, totalDividas, criticas, metaSemana, progressoPct, sorted, deleteBill,
  wakeWordAtivo, startWakeWord, stopWakeWord,
}: {
  receitaMes: number; meta: number; setMeta: (v: number) => void;
  totalDividas: number; criticas: number; metaSemana: number; progressoPct: number;
  sorted: Bill[]; deleteBill: { mutate: (id: string) => void };
  wakeWordAtivo: boolean; startWakeWord: () => void; stopWakeWord: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={wakeWordAtivo ? "destructive" : "outline"} size="sm" onClick={wakeWordAtivo ? stopWakeWord : startWakeWord} className="gap-1">
          {wakeWordAtivo ? <Radio className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
          {wakeWordAtivo ? "Desativar escuta" : "Ativar comando de voz"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard title="Receita do mês" value={`R$ ${(receitaMes / 1000).toFixed(1)}k`} icon={DollarSign} variant="success" />
        <StatsCard title="Total em dívidas" value={`R$ ${(totalDividas / 1000).toFixed(1)}k`} icon={TrendingDown} variant="warning" />
        <StatsCard title="Meta semanal" value={`R$ ${(metaSemana / 1000).toFixed(1)}k`} icon={Target} />
        <StatsCard title="Contas críticas" value={String(criticas)} icon={AlertCircle} variant={criticas > 0 ? "warning" : "primary"} />
      </div>

      {criticas >= 3 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div><strong>Atenção:</strong> Você tem {criticas} contas atrasadas. Priorize luz e água — o corte pode acontecer a qualquer momento e atrapalha a produção das marmitas.</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Prioridade de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma conta cadastrada. Adicione na aba "Lançar conta".</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((b: Bill, i: number) => {
                const p = prioridadeDe(b);
                const dot = p === "high" ? "bg-destructive" : p === "medium" ? "bg-warning" : "bg-success";
                const badge = p === "high" ? "bg-destructive/10 text-destructive" : p === "medium" ? "bg-warning/10 text-warning-foreground" : "bg-success/10 text-success";
                const badgeText = b.status === "atrasada" ? (b.meses_atrasada > 0 ? `${b.meses_atrasada}x atrasada` : "Atrasada") : b.status === "vence-hoje" ? "Vence hoje" : "Próxima";
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                    <span className={`h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.nome}</p>
                      <p className="text-xs text-muted-foreground">{b.categoria}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge}`}>{badgeText}</span>
                    <span className="text-sm font-bold font-heading text-foreground">R$ {Number(b.valor).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBill.mutate(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">Progresso mensal</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="meta" className="text-xs text-muted-foreground">Meta R$</Label>
            <Input id="meta" type="number" className="w-28 h-8" value={meta} onChange={(e) => setMeta(Number(e.target.value) || 0)} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">R$ {receitaMes.toFixed(2)} arrecadados de R$ {meta.toFixed(2)} necessários</p>
          <Progress value={progressoPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{progressoPct}% — faltam R$ {Math.max(0, meta - receitaMes).toFixed(2)} para a meta</p>
        </CardContent>
      </Card>
    </div>
  );
}
