import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { createBill } from "@/services/bills";
import { queryKeys } from "@/lib/query-keys";

const CATEGORIAS_SUGESTAO = ["Moradia", "Energia/Água", "Ingredientes", "Transporte", "Internet/Telefone", "Funcionários", "Impostos", "Outros"];

function statusFromDate(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() < today.getTime()) return "atrasada";
  if (d.getTime() === today.getTime()) return "vence-hoje";
  return "proxima";
}

function mesesAtrasados(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (d.getTime() >= today.getTime()) return 0;
  return Math.max(1, (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth()));
}

export default function LancarContaTab({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", valor: "", categoria: "Moradia", due_date: format(new Date(), "yyyy-MM-dd") });

  const addBill = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      await createBill({
        nome: form.nome,
        valor: parseFloat(form.valor),
        categoria: form.categoria || "Outros",
        due_date: form.due_date,
        user_id: u.user.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bills.all });
      qc.invalidateQueries({ queryKey: queryKeys.bills.finance });
      setForm({ nome: "", valor: "", categoria: "Moradia", due_date: format(new Date(), "yyyy-MM-dd") });
      toast.success("Conta adicionada!");
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });

  return (
    <div className="mt-4 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Lançar nova conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da conta</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Conta de luz" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS_SUGESTAO.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de vencimento</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Button onClick={() => addBill.mutate()} disabled={!form.nome || !form.valor || addBill.isPending} className="w-full">
            {addBill.isPending ? "Salvando..." : "Adicionar conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
