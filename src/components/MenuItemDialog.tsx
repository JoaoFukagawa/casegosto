import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil, ImageIcon, Upload } from "lucide-react";
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
  photo_url: string | null;
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
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `menu/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("menu-photos").upload(path, file);
      if (uploadError?.message?.includes("bucket") || uploadError?.message?.includes("not found")) {
        const { error: createError } = await supabase.storage.createBucket("menu-photos", { public: true });
        if (createError) throw createError;
        const retry = await supabase.storage.from("menu-photos").upload(path, file);
        if (retry.error) throw retry.error;
      } else if (uploadError) {
        throw uploadError;
      }
      const { data: urlData } = supabase.storage.from("menu-photos").getPublicUrl(path);
      setPhotoUrl(urlData.publicUrl);
      toast.success("Foto enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (photoUrl && photoUrl.includes("menu-photos")) {
      const parts = photoUrl.split("/");
      const path = parts.slice(parts.indexOf("menu-photos") + 1).join("/");
      await supabase.storage.from("menu-photos").remove([path]);
    }
    setPhotoUrl("");
  };

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
        photo_url: photoUrl || null,
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
        setName(""); setDescription(""); setPrice(""); setCategory("marmita"); setUnitType("unidade"); setStock(""); setStockByUnit(false); setPhotoUrl("");
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

          <div>
            <Label>Foto do item</Label>
            <div className="mt-1 flex items-center gap-3">
              {photoUrl ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs px-1 rounded-bl"
                    onClick={removePhoto}
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-3 w-3 mr-1" /> {uploading ? "Enviando..." : "Enviar foto"}
              </Button>
              <Input
                placeholder="Ou cole uma URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>
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
