export interface CartItem {
  cart_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  unit_type: string;
  weight?: number;
}

export interface CartActions {
  addToCart: (item: { id: string; name: string; price: number; unit_type: string; stock: number | null }, stockRemaining: number | null) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  updateWeight: (cartId: string, weight: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
}
