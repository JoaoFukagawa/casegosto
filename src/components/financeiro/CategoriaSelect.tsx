import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useFinanceCategories, useCreateFinanceCategory } from "@/hooks/useFinanceCategories";
import { categoriaLabel, groupCategories } from "@/lib/finance-categories";

const NOVA_CATEGORIA = "__nova__";

interface Props {
  tipo: "receita" | "despesa";
  /** valor selecionado — o `nome` da categoria (texto livre compatível com bills.categoria) */
  value: string;
  onChange: (nome: string) => void;
}

export default function CategoriaSelect({ tipo, value, onChange }: Props) {
  const { data: categorias = [] } = useFinanceCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoGrupo, setNovoGrupo] = useState("");
  const [novoEmoji, setNovoEmoji] = useState("");

  const grupos = groupCategories(categorias, tipo);

  const createCategoria = useCreateFinanceCategory(() => {
    setDialogOpen(false);
  });

  function handleValueChange(v: string) {
    if (v === NOVA_CATEGORIA) {
      setDialogOpen(true);
      return;
    }
    onChange(v);
  }

  function handleCriar() {
    if (!novoNome.trim() || !novoGrupo.trim()) return;
    createCategoria.mutate(
      { nome: novoNome.trim(), tipo, grupo: novoGrupo.trim(), emoji: novoEmoji.trim() || null },
      {
        onSuccess: (nova) => {
          onChange(nova.nome);
          setNovoNome("");
          setNovoGrupo("");
          setNovoEmoji("");
        },
      }
    );
  }

  return (
    <>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
        <SelectContent>
          {grupos.map(({ grupo, itens }) => (
            <div key={grupo}>
              <p className="px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{grupo}</p>
              {itens.map((cat) => (
                <SelectItem key={cat.id} value={cat.nome}>{categoriaLabel(cat)}</SelectItem>
              ))}
            </div>
          ))}
          <SelectSeparator />
          <SelectItem value={NOVA_CATEGORIA} className="text-[var(--color-accent)] font-medium">
            <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova categoria</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria de {tipo === "receita" ? "receita" : "despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Manutenção de equipamentos" />
            </div>
            <div>
              <Label>Grupo</Label>
              <Input value={novoGrupo} onChange={(e) => setNovoGrupo(e.target.value)} placeholder="Ex: Administrativo" list="grupos-existentes" />
              <datalist id="grupos-existentes">
                {Array.from(new Set(categorias.map((c) => c.grupo))).map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div>
              <Label>Emoji (opcional)</Label>
              <Input value={novoEmoji} onChange={(e) => setNovoEmoji(e.target.value)} placeholder="🔧" className="w-20" />
            </div>
            <Button className="w-full" onClick={handleCriar} disabled={!novoNome.trim() || !novoGrupo.trim() || createCategoria.isPending}>
              {createCategoria.isPending ? "Criando..." : "Criar categoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
