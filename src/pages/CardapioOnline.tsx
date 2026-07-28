import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Store, Truck, ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicMenuItems, checkStock, createPublicOrder } from "@/services/public-orders";

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  unit_type: string;
  stock: number | null;
};

export default function CardapioOnline() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"retirada" | "entrega">("retirada");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [orderDone, setOrderDone] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["cardapio-online"],
    queryFn: getPublicMenuItems,
    refetchInterval: 30000,
  });

  const addToCart = (item: { id: string; name: string; price: number; unit_type: string; stock: number | null }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        const maxQty = item.stock != null ? item.stock : 99;
        if (existing.quantity >= maxQty) return prev;
        return prev.map((c) => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, unit_type: item.unit_type, stock: item.stock }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.menu_item_id !== id) return c;
        const next = c.quantity + delta;
        if (next <= 0) return null;
        return { ...c, quantity: next };
      }).filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== id));
  };

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0) + (deliveryType === "entrega" ? 6 : 0);

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe seu nome");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (deliveryType === "entrega" && !address.trim()) throw new Error("Informe o endereço de entrega");
      const stockCheck = await checkStock(cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })));
      if (!stockCheck.ok) throw new Error(`Estoque insuficiente: ${stockCheck.errors.join("; ")}`);
      await createPublicOrder({
        customer_name: name, customer_phone: phone || undefined,
        delivery_type: deliveryType, delivery_address: address || undefined,
        notes: notes || undefined, payment_method: paymentMethod,
        items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity, unit_price: c.price })),
      });
    },
    onSuccess: () => {
      toast.success("Pedido realizado! Em breve entraremos em contato.");
      setCart([]); setName(""); setPhone(""); setAddress(""); setNotes("");
      setOrderDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (orderDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-heading font-bold">Pedido Recebido! 🎉</h2>
            <p className="text-muted-foreground">Logo entraremos em contato para confirmar. Fique de olho no WhatsApp!</p>
            <Button onClick={() => setOrderDone(false)} className="mt-4">Fazer novo pedido</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[hsl(28,30%,16%)] px-4 py-4 text-center">
        <img src="/logo.jpg" alt="Casegosto" className="h-10 mx-auto mb-1" />
        <p className="text-[hsl(35,25%,70%)] text-sm">Faça seu pedido online!</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando cardápio...</p>
        ) : !items?.length ? (
          <p className="text-center text-muted-foreground py-8">Cardápio indisponível no momento.</p>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-heading font-bold">Cardápio</h2>
            <div className="grid gap-4">
              {items.map((item) => {
                const inCart = cart.find((c) => c.menu_item_id === item.id);
                const outOfStock = item.stock != null && item.stock <= 0;
                return (
                  <Card key={item.id} className={outOfStock ? "opacity-50" : ""}>
                    <CardContent className="p-4 flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold font-heading text-foreground">{item.name}</p>
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                        <p className="text-lg font-extrabold font-heading text-primary mt-1">
                          R$ {item.price.toFixed(2)}{item.unit_type === "kg" ? "/kg" : ""}
                        </p>
                        {outOfStock && <p className="text-xs text-destructive font-medium">Esgotado</p>}
                        {inCart ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-bold text-sm">{inCart.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-bold text-primary ml-auto">R$ {(item.price * inCart.quantity).toFixed(2)}</span>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeItem(item.id)}>Remover</Button>
                          </div>
                        ) : (
                          <Button size="sm" className="mt-2" onClick={() => addToCart(item)} disabled={outOfStock}>
                            <Plus className="h-3 w-3 mr-1" /> Adicionar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <>
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="font-heading font-bold">Seus dados</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="cartao">💳 Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Receber</Label>
                <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as "retirada" | "entrega")} className="flex gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="retirada" id="retirada" />
                    <Label htmlFor="retirada" className="flex items-center gap-1 cursor-pointer"><Store className="h-4 w-4" /> Retirar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="entrega" id="entrega" />
                    <Label htmlFor="entrega" className="flex items-center gap-1 cursor-pointer"><Truck className="h-4 w-4" /> Entrega</Label>
                  </div>
                </RadioGroup>
              </div>
              {deliveryType === "entrega" && (
                <div>
                  <Label>Endereço *</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro..." rows={2} />
                </div>
              )}
              <div>
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola..." rows={2} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-background border-t border-border pt-4 pb-2 -mx-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{cart.length} item(ns)</span>
                <span className="text-2xl font-extrabold font-heading text-primary">R$ {total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full gradient-warm text-primary-foreground font-heading font-bold text-lg py-6"
                onClick={() => placeOrder.mutate()}
                disabled={!name.trim() || placeOrder.isPending}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {placeOrder.isPending ? "Enviando..." : "Finalizar Pedido"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
