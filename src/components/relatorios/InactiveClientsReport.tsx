import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, MessageCircle, Users } from "lucide-react";
import { useInactiveClients } from "@/hooks/useRelatorios";

export default function InactiveClientsReport() {
  const [diasInativo, setDiasInativo] = useState(30);
  const { data: clientesInativos, isLoading: loadingClientes } = useInactiveClients(diasInativo);

  const exportClientesCSV = () => {
    if (!clientesInativos?.length) return;
    const header = ["Nome", "Telefone", "Última compra", "Dias sem comprar"];
    const rows = (clientesInativos as any[]).map((c) => [
      `"${(c.nome || "").replace(/"/g, '""')}"`,
      c.telefone || "",
      c.ultimaCompra ? format(new Date(c.ultimaCompra), "dd/MM/yyyy") : "Nunca comprou",
      c.diasSemComprar !== null ? String(c.diasSemComprar) : "—",
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_inativos_${diasInativo}dias.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--color-accent)]" /> Clientes Inativos
        </CardTitle>
        <Button onClick={exportClientesCSV} disabled={!clientesInativos?.length} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>Clientes sem comprar há mais de</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" min={1} value={diasInativo} onChange={(e) => setDiasInativo(Number(e.target.value))} className="w-24" />
              <span className="text-sm text-[var(--color-text-secondary)]">dias</span>
            </div>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] pb-1">
            {loadingClientes ? "Buscando..." : `${clientesInativos?.length || 0} cliente(s) encontrado(s)`}
          </div>
        </div>

        {loadingClientes ? (
          <p className="text-center text-[var(--color-text-secondary)] py-6">Carregando...</p>
        ) : !clientesInativos?.length ? (
          <p className="text-center text-[var(--color-text-secondary)] py-6">Nenhum cliente inativo nesse período 🎉</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead className="text-right">Dias sem comprar</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesInativos.map((c: any) => {
                  const phone = (c.telefone || "").replace(/\D/g, "");
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.telefone || "—"}</TableCell>
                      <TableCell className="text-sm text-[var(--color-text-secondary)]">
                        {c.ultimaCompra ? format(new Date(c.ultimaCompra), "dd/MM/yyyy") : "Nunca comprou"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[var(--color-danger)]">
                        {c.diasSemComprar !== null ? `${c.diasSemComprar} dias` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--color-success)] hover:text-[var(--color-success)] hover:bg-[var(--color-success-bg)]"
                          disabled={!phone}
                          title={phone ? `Chamar ${c.nome} no WhatsApp` : "Sem telefone cadastrado"}
                          onClick={() => window.open(`https://wa.me/55${phone}`, "_blank")}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
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
  );
}
