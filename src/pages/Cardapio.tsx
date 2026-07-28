import { toast } from "sonner";
import MenuItemDialog from "@/components/MenuItemDialog";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Share2, Trash2, Package, TrendingUp } from "lucide-react";
import { useMenuItems, useToggleActive, useUpdateStock, useUpdateStockByUnit, useDeleteMenuItem } from "@/hooks/useMenuItems";
import { useSoldToday } from "@/hooks/usePratos";

export default function Cardapio() {
  const { data: items, isLoading } = useMenuItems();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { data: soldToday } = useSoldToday(startOfDay);
  const toggleActive = useToggleActive();
  const updateStock = useUpdateStock();
  const updateStockByUnit = useUpdateStockByUnit();
  const deleteItem = useDeleteMenuItem();

  const grouped = items?.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cardápio"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/cardapio-online`);
                toast.success("Link copiado!");
              }}
            >
              <Share2 className="h-4 w-4 mr-1" /> Compartilhar
            </Button>
            <MenuItemDialog />
          </div>
        }
      />

      {isLoading ? (
        <EmptyState message="Carregando..." />
      ) : !items?.length ? (
        <EmptyState message="Nenhum item no cardápio. Adicione o primeiro!" />
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
