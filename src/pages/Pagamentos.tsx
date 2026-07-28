import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  usePaymentMethods,
  useSavePaymentMethod,
  useDeletePaymentMethod,
  useTogglePaymentMethod,
  useMovePaymentMethod,
} from "@/hooks/usePaymentMethods";

type PaymentMethod = {
  id: string;
  value: string;
  label: string;
  emoji: string;
  active: boolean;
  is_cash: boolean;
  sort_order: number;
};

function MethodDialog({ method, trigger }: { method?: PaymentMethod; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(method?.label ?? "");
  const [emoji, setEmoji] = useState(method?.emoji ?? "💳");
  const [active, setActive] = useState(method?.active ?? true);
  const [isCash, setIsCash] = useState(method?.is_cash ?? false);

  const save = useSavePaymentMethod(method ?? null);

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
          <Button onClick={() => save.mutate({ label, emoji, active, is_cash: isCash }, { onSuccess: () => setOpen(false) })} disabled={save.isPending} className="w-full">
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Pagamentos() {
  const { data: methods, isLoading } = usePaymentMethods();
  const remove = useDeletePaymentMethod();
  const toggleActive = useTogglePaymentMethod();
  const move = useMovePaymentMethod(methods);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formas de pagamento"
        subtitle="Cadastre e organize as formas de pagamento aceitas"
        actions={
          <MethodDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nova forma
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <EmptyState message="Carregando..." />
      ) : !methods?.length ? (
        <EmptyState message="Nenhuma forma de pagamento cadastrada." />
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
