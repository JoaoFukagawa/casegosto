import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  unit_type: string;
  stock: number | null;
  stock_by_unit: boolean;
}

interface Props {
  item?: MenuItem;
}

export default function MenuItemDialog({ item }: Props) {
  const isEdit = !!item;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [category, setCategory] = useState(item?.category ?? "marmita");
  const [unitType, setUnitType] = useState(item?.unit_type ?? "unidade");
  const [stock, setStock] = useState(item?.stock != null ? String(item.stock) : "");
  const [stockByUnit, setStockByUnit] = useState(item?.stock_by_unit ?? false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && item) {
      setName(item.name);
      setDescription(item.description ?? "");
      setPrice(String(item.price));
      setCategory(item.category);
      setUnitType(item.unit_type);
      setStock(item.stock != null ? String(item.stock) : "");
      setStockByUnit(item.stock_by_unit);
    }
  }, [open, item]);

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category: category.trim(),
        unit_type: unitType,
        stock: stock ? parseInt(stock) : null,
        stock_by_unit: unitType === "kg" ? stockByUnit : false,
      };
      if (isEdit && item) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sessão expirada");
        const { error } = await supabase.from("menu_items").insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items_active"] });
      toast.success(isEdit ? "Item atualizado!" : "Item adicionado ao cardápio!");
      if (!isEdit) {
        setName(""); setDescription(""); setPrice(""); setCategory("marmita"); setUnitType("unidade"); setStock(""); setStockByUnit(false);
      }
      setOpen(false);
    },
    onError: () => toast.error(isEdit ? "Erro ao atualizar item" : "Erro ao adicionar item"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar item">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gradient-warm text-primary-foreground shadow-warm font-heading font-bold">
            <Plus className="mr-2 h-4 w-4" /> Novo Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{isEdit ? "Editar Item" : "Novo Item do Cardápio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-name">Nome *</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Costela Assada" />
          </div>
          <div>
            <Label htmlFor="item-desc">Descrição</Label>
            <Textarea id="item-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Costela assada no forno a lenha..." rows={2} />
          </div>
          <div>
            <Label>Tipo de venda</Label>
            <RadioGroup value={unitType} onValueChange={setUnitType} className="mt-2 flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unidade" id="unit-un" />
                <Label htmlFor="unit-un" className="cursor-pointer">Por unidade</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="kg" id="unit-kg" />
                <Label htmlFor="unit-kg" className="cursor-pointer">Por kg</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="item-price">
                Preço {unitType === "kg" ? "(R$/kg)" : "(R$)"} *
              </Label>
              <Input id="item-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={unitType === "kg" ? "45.00" : "15.00"} />
            </div>
            <div>
              <Label htmlFor="item-cat">Categoria</Label>
              <Input id="item-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="marmita" />
            </div>
            <div>
              <Label htmlFor="item-stock">Estoque</Label>
              <Input id="item-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Ilimitado" />
            </div>
          </div>
          {unitType === "kg" && (
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border border-border p-3 bg-muted/30">
              <input
                type="checkbox"
                checked={stockByUnit}
                onChange={(e) => setStockByUnit(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="font-medium">Controlar estoque por unidade</span>
                <span className="block text-xs text-muted-foreground">
                  Vendido por kg, mas o estoque é contado em peças (ex: costela já separada).
                </span>
              </span>
            </label>
          )}
          <Button
            className="w-full gradient-warm text-primary-foreground shadow-warm font-heading font-bold"
            onClick={() => saveItem.mutate()}
            disabled={!name.trim() || !price || parseFloat(price) <= 0 || saveItem.isPending}
          >
            {saveItem.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
