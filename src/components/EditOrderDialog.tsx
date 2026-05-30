import { useState } from "react";
import { uuid } from "@/lib/uuid";
import KgItemFields from "@/components/KgItemFields";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil, Truck, Store, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import PaymentSplits, { PaymentSplit } from "@/components/PaymentSplits";

interface CartItem {
  cart_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  unit_type: string;
  weight?: number;
}

interface EditOrderDialogProps {
  order: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    notes: string | null;
    delivery_type: string;
    delivery_address: string | null;
    delivery_fee?: number;
    payment_method: string;
    delivery_time?: string | null;
    order_items?: any[];
  };
}

export default function EditOrderDialog({ order }: EditOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [deliveryType, setDeliveryType] = useState(order.delivery_type);
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address || "");
  const [deliveryFee, setDeliveryFee] = useState(String(order.delivery_fee ?? 6));
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method);
  const [deliveryTime, setDeliveryTime] = useState(order.delivery_time || "");
  const [cashReceived, setCashReceived] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { method_value: order.payment_method, method_label: order.payment_method, amount: "" },
  ]);
  const queryClient = useQueryClient();

  const { data: menuItems } = useQuery({
    queryKey: ["menu_items_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("active", true)
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment_methods_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const currentPaymentMethod = paymentMethods?.find((m: any) => m.value === paymentMethod);
  const hasCashSplit = splits.some((s) => {
    const m = paymentMethods?.find((pm: any) => pm.value === s.method_value);
    return m?.is_cash;
  });
  const isCashPayment = hasCashSplit || (currentPaymentMethod?.is_cash ?? (paymentMethod === "dinheiro"));

  const updateOrder = useMutation({
    mutationFn: async () => {
      const fee = deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0;
      const total = cart.reduce((sum, item) => {
        if (item.unit_type === "kg") return sum + item.price * (item.weight || 0);
        return sum + item.price * item.quantity;
      }, 0) + fee;

      const validSplits = splits
        .map((s) => ({ ...s, amountNum: parseFloat(s.amount) || 0 }))
        .filter((s) => s.amountNum > 0);
      if (validSplits.length === 0) throw new Error("Informe ao menos uma forma de pagamento");
      const sumSplits = validSplits.reduce((s, p) => s + p.amountNum, 0);
      if (Math.abs(sumSplits - total) > 0.01) {
        throw new Error(`A soma das formas (R$ ${sumSplits.toFixed(2)}) deve ser igual ao total (R$ ${total.toFixed(2)})`);
      }
      const primaryMethod = validSplits.length === 1 ? validSplits[0].method_value : "misto";

      const { error } = await supabase
        .from("orders")
        .update({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          notes: notes.trim() || null,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "entrega" ? deliveryAddress.trim() || null : null,
          delivery_fee: deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0,
          payment_method: primaryMethod,
          delivery_time: deliveryTime || null,
          total,
        })
        .eq("id", order.id);
      if (error) throw error;

      // Delete old items and insert new ones
      const { error: delError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);
      if (delError) throw delError;

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const uid = u.user.id;

      if (cart.length > 0) {
        const orderItems = cart.map((item) => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.price,
          weight: item.unit_type === "kg" ? item.weight || null : null,
          user_id: uid,
        }));
        const { error: insError } = await supabase.from("order_items").insert(orderItems);
        if (insError) throw insError;
      }

      // Replace payments
      await supabase.from("order_payments").delete().eq("order_id", order.id);
      const paymentRows = validSplits.map((s) => ({
        order_id: order.id,
        method_value: s.method_value,
        method_label: s.method_label,
        amount: s.amountNum,
        user_id: uid,
      }));
      const { error: payError } = await supabase.from("order_payments").insert(paymentRows);
      if (payError) throw payError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Pedido atualizado!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar pedido"),
  });

  const handleOpen = async (v: boolean) => {
    if (v) {
      setCustomerName(order.customer_name);
      setCustomerPhone(order.customer_phone || "");
      setNotes(order.notes || "");
      setDeliveryType(order.delivery_type);
      setDeliveryAddress(order.delivery_address || "");
      setDeliveryFee(String(order.delivery_fee ?? 6));
      setPaymentMethod(order.payment_method);
      setDeliveryTime(order.delivery_time || "");
      setCashReceived("");

      // Build cart from existing order_items
      const items: CartItem[] = (order.order_items || []).map((item: any) => {
        const menuItem = menuItems?.find((m) => m.id === item.menu_item_id);
        return {
          cart_id: uuid(),
          menu_item_id: item.menu_item_id,
          name: item.menu_items?.name || menuItem?.name || "Item",
          price: item.unit_price,
          quantity: item.quantity,
          unit_type: menuItem?.unit_type || (item.weight ? "kg" : "unidade"),
          weight: item.weight || undefined,
        };
      });
      setCart(items);

      // Load existing payments (fallback to single legacy payment_method)
      const { data: existingPayments } = await supabase
        .from("order_payments")
        .select("*")
        .eq("order_id", order.id);
      if (existingPayments && existingPayments.length > 0) {
        setSplits(
          existingPayments.map((p: any) => ({
            method_value: p.method_value,
            method_label: p.method_label,
            amount: Number(p.amount).toFixed(2),
          }))
        );
      } else {
        const total = (order.order_items || []).reduce((s: number, it: any) => {
          const v = it.weight ? Number(it.unit_price) * Number(it.weight) : Number(it.unit_price) * Number(it.quantity);
          return s + v;
        }, 0) + Number(order.delivery_fee ?? 0);
        const m = (order.payment_method || "dinheiro");
        setSplits([{ method_value: m, method_label: m.charAt(0).toUpperCase() + m.slice(1), amount: total.toFixed(2) }]);
      }
    }
    setOpen(v);
  };

  const addToCart = (item: { id: string; name: string; price: number; unit_type: string }) => {
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
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.cart_id === cartId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const updateWeight = (cartId: string, weight: number) => {
    setCart((prev) =>
      prev.map((c) => c.cart_id === cartId ? { ...c, weight } : c)
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cart_id !== cartId));
  };

  const fee = deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0;
  const total = cart.reduce((sum, item) => {
    if (item.unit_type === "kg") return sum + item.price * (item.weight || 0);
    return sum + item.price * item.quantity;
  }, 0) + fee;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar pedido">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-name">Nome do cliente *</Label>
              <Input id="edit-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input id="edit-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-delivery-time">Horário de entrega/retirada</Label>
            <Input
              id="edit-delivery-time"
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-[180px]"
            />
          </div>

          {/* Add items from menu */}
          <div>
            <Label>Adicionar itens</Label>
            <div className="mt-2 grid gap-2 max-h-32 overflow-y-auto">
              {menuItems?.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}{item.unit_type === "kg" ? " · por kg" : ""}
                    </p>
                  </div>
                  <span className="font-bold text-primary font-heading text-sm">
                    R$ {item.price.toFixed(2)}{item.unit_type === "kg" ? "/kg" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cart / current items */}
          {cart.length > 0 && (
            <div>
              <Label>Itens do pedido</Label>
              <div className="mt-2 space-y-2">
                {cart.map((item) => (
                  <div key={item.cart_id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.cart_id)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                    {item.unit_type === "kg" ? (
                      <KgItemFields
                        item={item}
                        onUpdateWeight={(w) => updateWeight(item.cart_id, w)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cart_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cart_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold text-primary ml-auto">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Tipo de entrega</Label>
            <RadioGroup value={deliveryType} onValueChange={setDeliveryType} className="mt-2 flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="retirada" id="edit-retirada" />
                <Label htmlFor="edit-retirada" className="flex items-center gap-1 cursor-pointer">
                  <Store className="h-4 w-4" /> Retirada
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="entrega" id="edit-entrega" />
                <Label htmlFor="edit-entrega" className="flex items-center gap-1 cursor-pointer">
                  <Truck className="h-4 w-4" /> Entrega
                </Label>
              </div>
            </RadioGroup>
          </div>

          {deliveryType === "entrega" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-address">Endereço de entrega *</Label>
                <Textarea id="edit-address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="edit-delivery-fee">Taxa de entrega (R$)</Label>
                <Input
                  id="edit-delivery-fee"
                  type="number"
                  step="0.50"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="h-9 w-32"
                />
              </div>
            </div>
          )}

          <PaymentSplits
            splits={splits}
            setSplits={setSplits}
            methods={(paymentMethods || []) as any}
            total={total}
          />

          {isCashPayment && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <Label htmlFor="edit-cash-received">Valor recebido (troco)</Label>
              <Input
                id="edit-cash-received"
                type="number"
                step="0.01"
                min="0"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={`Total: R$ ${total.toFixed(2)}`}
                className="h-9"
              />
              {cashReceived && parseFloat(cashReceived) > total && (
                <p className="text-sm font-bold text-primary">
                  💰 Troco: R$ {(parseFloat(cashReceived) - total).toFixed(2)}
                </p>
              )}
              {cashReceived && parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < total && (
                <p className="text-sm font-bold text-destructive">
                  ⚠️ Valor insuficiente (faltam R$ {(total - parseFloat(cashReceived)).toFixed(2)})
                </p>
              )}
              {cashReceived && parseFloat(cashReceived) === total && (
                <p className="text-sm text-muted-foreground">✅ Sem troco</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-extrabold font-heading text-primary">
                R$ {total.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={() => updateOrder.mutate()}
              disabled={!customerName.trim() || cart.length === 0 || updateOrder.isPending || (deliveryType === "entrega" && !deliveryAddress.trim())}
              className="gradient-warm text-primary-foreground shadow-warm font-heading font-bold"
            >
              {updateOrder.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
