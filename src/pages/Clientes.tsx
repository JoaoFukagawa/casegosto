import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

type Cliente = {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  observacoes: string | null;
  created_at: string;
};

const emptyForm = {
  id: "",
  nome: "",
  telefone: "",
  rua: "",
  numero: "",
  bairro: "",
  complemento: "",
  observacoes: "",
};

export default function Clientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Nome é obrigatório");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        rua: form.rua.trim() || null,
        numero: form.numero.trim() || null,
        bairro: form.bairro.trim() || null,
        complemento: form.complemento.trim() || null,
        observacoes: form.observacoes.trim() || null,
        user_id: u.user.id,
      };
      if (form.id) {
        const { error } = await (supabase as any).from("clientes").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(form.id ? "Cliente atualizado!" : "Cliente cadastrado!");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente removido");
    },
  });

  const filtered = (clientes || []).filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return c.nome.toLowerCase().includes(s) || (c.telefone || "").toLowerCase().includes(s);
  });

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Cliente) => {
    setForm({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone || "",
      rua: c.rua || "",
      numero: c.numero || "",
      bairro: c.bairro || "",
      complemento: c.complemento || "",
      observacoes: c.observacoes || "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">{clientes?.length ?? 0} cliente(s) cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gradient-warm text-primary-foreground shadow-warm font-heading font-bold">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{form.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Maria da Silva" />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <div>
                  <Label>Rua</Label>
                  <Input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} placeholder="Ap, bloco, referência..." />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} placeholder="Restrições, preferências..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending} className="gradient-warm text-primary-foreground font-heading font-bold">
                  {save.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-heading text-base">{c.nome}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {c.telefone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.telefone}</p>}
                {(c.rua || c.bairro) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5" />
                    <span>
                      {[c.rua, c.numero].filter(Boolean).join(", ")}
                      {c.bairro ? ` · ${c.bairro}` : ""}
                      {c.complemento ? ` (${c.complemento})` : ""}
                    </span>
                  </p>
                )}
                {c.observacoes && <p className="italic">📝 {c.observacoes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
