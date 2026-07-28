import { useState, useRef, useCallback } from "react";
import { uuid } from "@/lib/uuid";
import type { CartItem } from "@/types/order";
import { toast } from "sonner";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const addToCart = useCallback(
    (item: { id: string; name: string; price: number; unit_type: string; stock: number | null }, stockRemaining: number | null) => {
      const currentCart = cartRef.current;
      const cartQty = currentCart.filter((c) => c.menu_item_id === item.id).reduce((s, c) => s + c.quantity, 0);
      if (stockRemaining != null && cartQty >= stockRemaining) {
        toast.error(`${item.name} está esgotado!`);
        return;
      }

      setCart((prev) => {
        if (item.unit_type === "kg") {
          return [...prev, {
            cart_id: uuid(),
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            unit_type: item.unit_type,
            weight: 1,
          }];
        }
        const existing = prev.find((c) => c.menu_item_id === item.id);
        if (existing) {
          return prev.map((c) => c.cart_id === existing.cart_id ? { ...c, quantity: c.quantity + 1 } : c);
        }
        return [...prev, {
          cart_id: uuid(),
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          unit_type: item.unit_type,
        }];
      });
    },
    []
  );

  const updateQuantity = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.cart_id === cartId ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0)
    );
  }, []);

  const updateWeight = useCallback((cartId: string, weight: number) => {
    setCart((prev) => prev.map((c) => c.cart_id === cartId ? { ...c, weight } : c));
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cart_id !== cartId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  return { cart, setCart, addToCart, updateQuantity, updateWeight, removeFromCart, clearCart };
}
