type ItemLike = {
  item_name?: string | null;
  menu_items?: { name?: string | null } | null;
  options?: { name: string; quantity?: number | null }[] | null;
};

// Pedidos do iFood guardam o nome original em item_name (o item do cardápio pode ser o genérico "sem vínculo").
export function orderItemName(item: ItemLike): string {
  return item.item_name || item.menu_items?.name || "Item";
}

export function orderItemOptions(item: ItemLike): string {
  return (item.options || [])
    .map((o) => (o.quantity && o.quantity > 1 ? `${o.quantity}x ${o.name}` : o.name))
    .join(", ");
}
