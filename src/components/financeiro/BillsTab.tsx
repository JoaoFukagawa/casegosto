import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { DollarSign, Check, Undo2, AlertTriangle, FileText } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { useBills, useMarkBillPaid, useUndoBillPaid } from "@/hooks/useBills";

export default function BillsTab({ selectedDate }: { selectedDate: string }) {
  const [billStatusFilter, setBillStatusFilter] = useState<string>("todas");
  const [billDateFilter, setBillDateFilter] = useState<string>("");

  const { data: allBills = [] } = useBills();
  const markBillPaid = useMarkBillPaid();
  const undoBillPaid = useUndoBillPaid();

  function billRealStatus(b: any): "paga" | "atrasada" | "vence-hoje" | "proxima" {
    if (b.status === "paga" || b.paid_at) return "paga";
    if (!b.due_date) return b.status ?? "proxima";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(b.due_date + "T00:00:00");
    if (d.getTime() < today.getTime()) return "atrasada";
    if (d.getTime() === today.getTime()) return "vence-hoje";
    return "proxima";
  }

  const { startOfMonth, endOfMonth } = (() => {
    const d = parseISO(selectedDate);
    return {
      startOfMonth: format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd"),
      endOfMonth: format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd"),
    };
  })();

  const billsOfMonth = allBills.filter((b: any) => {
    const ref = b.paid_at ? format(parseISO(b.paid_at), "yyyy-MM-dd") : b.due_date;
    if (!ref) return false;
    return ref >= startOfMonth && ref <= endOfMonth;
  });

  const pendingAll = allBills.filter((b: any) => billRealStatus(b) !== "paga");
  const overdueAll = allBills.filter((b: any) => billRealStatus(b) === "atrasada");
  const paidThisMonth = billsOfMonth.filter((b: any) => billRealStatus(b) === "paga");

  const totalPendentes = pendingAll.reduce((s: number, b: any) => s + Number(b.valor), 0);
  const totalAtrasadas = overdueAll.reduce((s: number, b: any) => s + Number(b.valor), 0);
  const totalPagasMes = paidThisMonth.reduce((s: number, b: any) => s + Number(b.valor), 0);

  const filteredBills = allBills
    .filter((b: any) => {
      if (!billDateFilter) return true;
      return b.due_date === billDateFilter;
    })
    .filter((b: any) => billStatusFilter === "todas" || billRealStatus(b) === billStatusFilter)
    .sort((a: any, b: any) => {
      const order = { atrasada: 0, "vence-hoje": 1, proxima: 2, paga: 3 } as const;
      return (order[billRealStatus(a)] - order[billRealStatus(b)]) || ((a.due_date ?? "") > (b.due_date ?? "") ? 1 : -1);
    });

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Contas pendentes" value={String(pendingAll.length)} icon={FileText}
          description={`Total: R$ ${totalPendentes.toFixed(2)}`} variant="primary" />
        <StatsCard title="Pagas no mês" value={String(paidThisMonth.length)} icon={Check}
          description={`Total: R$ ${totalPagasMes.toFixed(2)}`} variant="success" />
        <StatsCard title="Em atraso" value={String(overdueAll.length)} icon={AlertTriangle}
          description={`Total: R$ ${totalAtrasadas.toFixed(2)}`} variant="warning" />
        <StatsCard title="A pagar (total)" value={`R$ ${totalPendentes.toFixed(2)}`} icon={DollarSign}
          variant={totalPendentes > 0 ? "warning" : "success"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="font-heading text-lg">
            {billDateFilter ? `Contas — vencimento ${format(parseISO(billDateFilter), "dd/MM/yyyy")}` : "Todas as contas"}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">Vencimento</Label>
            <Input type="date" value={billDateFilter} onChange={(e) => setBillDateFilter(e.target.value)} className="h-8 w-[150px]" />
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={billStatusFilter} onValueChange={setBillStatusFilter}>
              <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="atrasada">Atrasadas</SelectItem>
                <SelectItem value="vence-hoje">Vence hoje</SelectItem>
                <SelectItem value="proxima">Próximas</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
              </SelectContent>
            </Select>
            {(billDateFilter || billStatusFilter !== "todas") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setBillDateFilter(""); setBillStatusFilter("todas"); }}>
                Limpar filtro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!filteredBills.length ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma conta para este filtro 📭</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((b: any) => {
                    const st = billRealStatus(b);
                    const stLabel = st === "paga" ? `✓ Paga${b.paid_at ? ` em ${format(parseISO(b.paid_at), "dd/MM/yyyy")}` : ""}` :
                      st === "atrasada" ? "Atrasada" : st === "vence-hoje" ? "Vence hoje" : "Pendente";
                    const stClass = st === "paga" ? "bg-success/15 text-success border-success/30" :
                      st === "atrasada" ? "bg-destructive/15 text-destructive border-destructive/30" :
                      st === "vence-hoje" ? "bg-warning/15 text-warning border-warning/30" :
                      "bg-muted text-foreground border-border";
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.categoria}</TableCell>
                        <TableCell className="text-sm">{b.due_date ? format(parseISO(b.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`font-medium ${stClass}`}>{stLabel}</Badge></TableCell>
                        <TableCell className="text-right font-bold">R$ {Number(b.valor).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {st === "paga" ? (
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => undoBillPaid.mutate(b)} disabled={undoBillPaid.isPending}>
                              <Undo2 className="h-3.5 w-3.5 mr-1" /> Desfazer
                            </Button>
                          ) : (
                            <Button size="sm" className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                              onClick={() => markBillPaid.mutate({ id: b.id, bill: b })} disabled={markBillPaid.isPending}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Dar baixa
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
