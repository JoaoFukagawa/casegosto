import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Users } from "lucide-react";

export default function InactiveClientsReport({
  clientesInativos, loadingClientes, diasInativo, setDiasInativo, exportClientesCSV,
}: {
  clientesInativos: any[] | undefined; loadingClientes: boolean;
  diasInativo: number; setDiasInativo: (v: number) => void;
  exportClientesCSV: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xl font-extrabold font-heading text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Clientes Inativos
        </h3>
        <Button onClick={exportClientesCSV} disabled={!clientesInativos?.length} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>Clientes sem comprar há mais de</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" min={1} value={diasInativo} onChange={(e) => setDiasInativo(Number(e.target.value))} className="w-24" />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground pb-1">
              {loadingClientes ? "Buscando..." : `${clientesInativos?.length || 0} cliente(s) encontrado(s)`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {loadingClientes ? (
            <p className="text-center text-muted-foreground py-6">Carregando...</p>
          ) : !clientesInativos?.length ? (
            <p className="text-center text-muted-foreground py-6">Nenhum cliente inativo nesse período 🎉</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Última compra</TableHead>
                    <TableHead className="text-right">Dias sem comprar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesInativos.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.telefone || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.ultimaCompra ? format(new Date(c.ultimaCompra), "dd/MM/yyyy") : "Nunca comprou"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {c.diasSemComprar !== null ? `${c.diasSemComprar} dias` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
