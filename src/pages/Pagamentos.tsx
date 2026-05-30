import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type PaymentMethod = {
  id: string;
  value: string;
  label: string;
  emoji: string;
  active: boolean;
  is_cash: boolean;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function MethodDialog({ method, trigger }: { method?: PaymentMethod; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(method?.label ?? "");
  const [emoji, setEmoji] = useState(method?.emoji ?? "💳");
  const [active, setActive] = useState(method?.active ?? true);
  const [isCash, setIsCash] = useState(method?.is_cash ?? false);

  const save = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error("Informe um nome");
      if (method) {
        const { error } = await supabase
          .from("payment_methods")
          .update({ label: label.trim(), emoji: emoji.trim() || "💳", active, is_cash: isCash })
          .eq("id", method.id);
        if (error) throw error;
      } else {
        const base = slugify(label) || `metodo_${Date.now()}`;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sessão expirada");
        const { error } = await supabase.from("payment_methods").insert({
          value: `${base}_${Date.now().toString(36)}`,
          label: label.trim(),
          emoji: emoji.trim() || "💳",
          active,
          is_cash: isCash,
          sort_order: 999,
          user_id: u.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      qc.invalidateQueries({ queryKey: ["payment_methods_active"] });
      toast.success("Salvo!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{method ? "Editar forma de pagamento" : "Nova forma de pagamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <Label htmlFor="emoji">Ícone</Label>
              <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center text-xl" />
            </div>
            <div>
              <Label htmlFor="label">Nome</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Vale Refeição" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Ativo</Label>
              <p className="text-xs text-muted-foreground">Aparece na lista ao criar pedidos</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Recebe em dinheiro (troco)</Label>
              <p className="text-xs text-muted-foreground">Habilita campo de valor recebido / troco</p>
            </div>
            <Switch checked={isCash} onCheckedChange={setIsCash} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Pagamentos() {
  const qc = useQueryClient();
  const { data: methods, isLoading } = useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      qc.invalidateQueries({ queryKey: ["payment_methods_active"] });
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const toggleActive = useMutation({
    mutationFn: async (m: PaymentMethod) => {
      const { error } = await supabase.from("payment_methods").update({ active: !m.active }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      qc.invalidateQueries({ queryKey: ["payment_methods_active"] });
    },
  });

  const move = useMutation({
    mutationFn: async ({ m, dir }: { m: PaymentMethod; dir: -1 | 1 }) => {
      const list = (methods || []).slice().sort((a, b) => a.sort_order - b.sort_order);
      const idx = list.findIndex((x) => x.id === m.id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= list.length) return;
      const other = list[swapIdx];
      const a = m.sort_order;
      const b = other.sort_order;
      const newA = a === b ? a + dir : b;
      const newB = a === b ? a : a;
      await supabase.from("payment_methods").update({ sort_order: newA }).eq("id", m.id);
      await supabase.from("payment_methods").update({ sort_order: newB }).eq("id", other.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">Formas de pagamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e organize as formas de pagamento aceitas
          </p>
        </div>
        <MethodDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova forma
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : !methods?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma forma de pagamento cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {methods.map((m, i) => (
            <Card key={m.id} className={!m.active ? "opacity-60" : ""}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-heading truncate">{m.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {m.is_cash ? "💵 Recebe troco · " : ""}
                        {m.active ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">

                    <Switch checked={m.active} onCheckedChange={() => toggleActive.mutate(m)} />
                    <MethodDialog
                      method={m}
                      trigger={
                        <Button variant="ghost" size="icon" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      title="Excluir"
                      onClick={() => {
                        if (confirm(`Excluir "${m.label}"? Pedidos antigos manterão o histórico.`)) {
                          remove.mutate(m.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
