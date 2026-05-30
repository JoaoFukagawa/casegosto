import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MenuItemDialog from "@/components/MenuItemDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Package, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Cardapio() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get today's sold quantities per menu item
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: soldToday } = useQuery({
    queryKey: ["sold_today", startOfDay],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity, weight, orders!inner(created_at, status)")
        .gte("orders.created_at", startOfDay);
      if (error) throw error;

      const sold: Record<string, { qty: number; weight: number }> = {};
      for (const item of data || []) {
        const order = item.orders as any;
        if (order?.status === "cancelado") continue;
        if (!sold[item.menu_item_id]) sold[item.menu_item_id] = { qty: 0, weight: 0 };
        sold[item.menu_item_id].qty += item.quantity;
        if (item.weight) sold[item.menu_item_id].weight += item.weight;
      }
      return sold;
    },
    refetchInterval: 10000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items_active"] });
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number | null }) => {
      const { error } = await supabase.from("menu_items").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items_active"] });
      toast.success("Estoque atualizado!");
    },
  });

  const updateStockByUnit = useMutation({
    mutationFn: async ({ id, stock_by_unit }: { id: string; stock_by_unit: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ stock_by_unit }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items_active"] });
      toast.success("Modo de estoque atualizado!");
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items_active"] });
      toast.success("Item removido!");
    },
    onError: () => toast.error("Erro ao remover. Pode haver pedidos vinculados."),
  });

  const grouped = items?.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold font-heading text-foreground">Cardápio</h2>
        <MenuItemDialog />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : !items?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum item no cardápio. Adicione o primeiro! 🍽️</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped!).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-muted-foreground mb-3">
              {category}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryItems!.map((item) => {
                const itemSold = soldToday?.[item.id];
                const qtySold = itemSold?.qty ?? 0;
                const weightSold = itemSold?.weight ?? 0;
                const stockRemaining = item.stock != null ? item.stock - qtySold : null;
                const isOutOfStock = stockRemaining != null && stockRemaining <= 0;

                return (
                  <Card key={item.id} className={`animate-slide-in ${!item.active || isOutOfStock ? "opacity-50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold font-heading text-foreground">{item.name}</p>
                            {item.unit_type === "kg" && (
                              <Badge variant="outline" className="text-xs">por kg</Badge>
                            )}
                            {isOutOfStock && (
                              <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                          )}
                          <p className="text-lg font-extrabold font-heading text-primary mt-2">
                            R$ {item.price.toFixed(2)}{item.unit_type === "kg" ? "/kg" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <Switch
                            checked={item.active}
                            onCheckedChange={(active) => toggleActive.mutate({ id: item.id, active })}
                          />
                          <MenuItemDialog item={item} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Stock & Sales info */}
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>
                            Vendidos hoje:{" "}
                            <span className="font-bold text-foreground">
                              {item.unit_type === "kg" ? `${weightSold.toFixed(1)}kg` : qtySold}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          <span>Estoque:</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-7 w-16 text-xs"
                            placeholder="∞"
                            value={item.stock ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateStock.mutate({
                                id: item.id,
                                stock: val ? parseInt(val) : null,
                              });
                            }}
                          />
                          {stockRemaining != null && (
                            <span className={`font-bold ${isOutOfStock ? "text-destructive" : "text-foreground"}`}>
                              (resta {Math.max(0, stockRemaining)})
                            </span>
                          )}
                        </div>
                        {item.unit_type === "kg" && (
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.stock_by_unit}
                              onChange={(e) => updateStockByUnit.mutate({ id: item.id, stock_by_unit: e.target.checked })}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span>Estoque por unidade</span>
                          </label>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
