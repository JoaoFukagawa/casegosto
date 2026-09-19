import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Store, Truck, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getPublicMenuItems, checkStock, createPublicOrder } from "@/services/public-orders";
import { getStoreSettings, isStoreOpenNow } from "@/services/settings";

const STORE_WHATSAPP = "554399270742";

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
  const [changeAmount, setChangeAmount] = useState("");
  const [orderDone, setOrderDone] = useState(false);
  const [lastOrderMsg, setLastOrderMsg] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
    };
  }, []);

  const { data: items, isLoading } = useQuery({
    queryKey: ["cardapio-online"],
    queryFn: getPublicMenuItems,
    refetchInterval: 30000,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getStoreSettings,
    refetchInterval: 60000,
  });

  const storeOpen = storeSettings ? isStoreOpenNow(storeSettings) : true;

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

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0) + (deliveryType === "entrega" ? 7 : 0);

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe seu nome");
      if (!phone.trim()) throw new Error("Informe seu WhatsApp");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (deliveryType === "entrega" && !address.trim()) throw new Error("Informe o endereço de entrega");
      const stockCheck = await checkStock(cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })));
      if (!stockCheck.ok) throw new Error(`Estoque insuficiente: ${stockCheck.errors.join("; ")}`);
      const changeNote = changeAmount.trim() ? `Troco para: R$ ${changeAmount.trim()}` : "";
      const fullNotes = [notes.trim(), changeNote].filter(Boolean).join(" · ");
      await createPublicOrder({
        customer_name: name, customer_phone: phone || undefined,
        delivery_type: deliveryType, delivery_address: address || undefined,
        notes: fullNotes || undefined,
        payment_method: paymentMethod,
        items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity, unit_price: c.price })),
      });
    },
    onSuccess: () => {
      toast.success("Pedido realizado! Em breve entraremos em contato.");
      const lines = cart.map((c) => `${c.quantity}x ${c.name} — R$ ${(c.price * c.quantity).toFixed(2)}`);
      const feeNote = deliveryType === "entrega" ? " + R$ 7,00 entrega" : "";
      setLastOrderMsg(
        `Olá, Casegosto! Acabei de fazer o pedido pelo site:\n\n${lines.join("\n")}\n\nTotal: R$ ${total.toFixed(2)} (${deliveryType === "entrega" ? "entrega" : "retirada"}${feeNote})\n\nNome: ${name.trim()}${phone.trim() ? `\nWhatsApp: ${phone.trim()}` : ""}\n\nPode confirmar?`
      );
      setCart([]); setName(""); setPhone(""); setAddress(""); setNotes(""); setChangeAmount("");
      setOrderDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (orderDone) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <Card className="max-w-sm w-full rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-hover)] text-center">
          <CardContent className="py-12 px-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-[var(--color-accent)] mx-auto" />
            <h2 className="text-2xl font-heading font-bold text-[var(--color-text-primary)]">Pedido Recebido! 🎉</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">Confirme pelo WhatsApp para agilizar seu pedido.</p>
            <a
              href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(lastOrderMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white font-heading font-bold py-3.5 text-base hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" /> Confirmar no WhatsApp
            </a>
            <Button onClick={() => setOrderDone(false)} className="w-full gradient-warm text-white font-heading font-bold">
              Fazer novo pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (storeSettings && !storeOpen) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4 p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
          <div className="h-16 w-16 mx-auto rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            <img src="/logo.jpg" alt="Casegosto" className="h-full w-full object-cover" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-[var(--color-text-primary)]">
            Estamos fechados 🌙
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            Nosso cardápio está indisponível no momento. Confira nossos horários de atendimento pelo WhatsApp!
          </p>
          <a
            href={`https://wa.me/${STORE_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white font-heading font-bold py-3.5 text-base hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="relative overflow-hidden bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="absolute top-0 left-0 right-0 h-1 gradient-warm" />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[var(--color-accent-muted)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[var(--color-accent-muted)] blur-2xl pointer-events-none" />

        <div className="absolute top-5 right-4 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-700 text-xs font-semibold">Aberto agora</span>
        </div>

        <div className="relative flex flex-col items-center pt-8 pb-7 px-4 text-center">
          <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-[var(--color-border-strong)] shadow-[var(--shadow-hover)] mb-4">
            <img src="/logo.jpg" alt="Casegosto" className="h-full w-full object-cover" />
          </div>

          <h1 className="font-heading font-bold text-3xl tracking-[3px] text-[var(--color-text-primary)] uppercase">
            CASEGOSTO
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1 font-medium">
            Marmitas &amp; pratos feitos com carinho
          </p>

          <div className="flex items-center gap-2 mt-4">
            <span className="flex items-center gap-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              🛵 Entrega R$ 7,00
            </span>
            <span className="flex items-center gap-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              🏠 Retirada grátis
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-36 pt-6">
        {isLoading ? (
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
                <div className="w-28 h-28 bg-[var(--color-surface-secondary)]" />
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-4 rounded-lg bg-[var(--color-surface-secondary)] w-3/4" />
                  <div className="h-3 rounded-lg bg-[var(--color-surface-secondary)] w-1/2" />
                  <div className="h-6 rounded-lg bg-[var(--color-surface-secondary)] w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : !items?.length ? (
          <p className="text-center text-[var(--color-text-muted)] py-8">Cardápio indisponível no momento.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-text-muted)]">
                Cardápio do dia
              </span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <div className="space-y-4">
              {items.map((item) => {
                const inCart = cart.find((c) => c.menu_item_id === item.id);
                const outOfStock = item.stock != null && item.stock <= 0;
                return (
                  <div key={item.id}
                    className={`flex rounded-2xl overflow-hidden border bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)] transition-all duration-200 ${outOfStock ? "opacity-50" : "hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5"}`}
                  >
                    <div className="relative w-28 shrink-0 self-stretch">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full gradient-warm flex flex-col items-center justify-center gap-1.5 select-none min-h-[108px]">
                          <span className="text-3xl">🍽️</span>
                          <span className="text-white/80 text-[9px] font-bold uppercase tracking-wider text-center px-2 leading-tight line-clamp-2">
                            {item.name.split(" ").slice(0, 2).join(" ")}
                          </span>
                        </div>
                      )}

                      {item.unit_type === "kg" && (
                        <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">
                          /kg
                        </span>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide border border-[var(--color-danger)]/30">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
                      <div>
                        <p className="font-heading font-bold text-[15px] leading-snug text-[var(--color-text-primary)]">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-end justify-between mt-3 gap-2">
                        <p className="font-heading font-extrabold text-xl leading-none text-[var(--color-accent)]">
                          R$ {item.price.toFixed(2)}
                          {item.unit_type === "kg" && (
                            <span className="text-xs font-semibold text-[var(--color-text-muted)] ml-0.5">/kg</span>
                          )}
                        </p>

                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, -1)}
                              className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)] text-[var(--color-accent)] flex items-center justify-center hover:bg-[var(--color-accent-muted)] transition-colors">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm text-[var(--color-text-primary)]">
                              {inCart.quantity}
                            </span>
                            <button onClick={() => updateQty(item.id, 1)}
                              className="h-8 w-8 rounded-full gradient-warm text-white flex items-center justify-center shadow-warm hover:opacity-90 transition-opacity">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)} disabled={outOfStock}
                            className="h-9 px-4 rounded-full gradient-warm text-white text-sm font-heading font-bold shadow-warm flex items-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-40">
                            <Plus className="h-3.5 w-3.5" /> Adicionar
                          </button>
                        )}
                      </div>

                      {inCart && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
                          <span className="text-xs text-[var(--color-text-muted)]">Subtotal</span>
                          <span className="font-heading font-bold text-sm text-[var(--color-accent)]">
                            R$ {(item.price * inCart.quantity).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {cart.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-text-muted)]">
                Seus dados
              </span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Nome <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <Input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-10 rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    WhatsApp <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="(44) 99999-9999"
                    className="h-10 rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Pagamento
                </label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="cartao">💳 Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "dinheiro" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Troco para quanto?
                  </label>
                  <Input value={changeAmount} onChange={(e) => setChangeAmount(e.target.value)}
                    placeholder="Ex: 50,00" inputMode="decimal"
                    className="h-10 rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-sm placeholder:text-[var(--color-text-muted)]" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Como receber?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["retirada", "entrega"] as const).map((tipo) => (
                    <button key={tipo} type="button" onClick={() => setDeliveryType(tipo)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                        ${deliveryType === tipo
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
                        }`}>
                      <span className={`h-10 w-10 rounded-full flex items-center justify-center transition-all
                        ${deliveryType === tipo
                          ? "gradient-warm text-white shadow-warm"
                          : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                        }`}>
                        {tipo === "retirada"
                          ? <Store className="h-5 w-5" />
                          : <Truck className="h-5 w-5" />}
                      </span>
                      <div className="text-center">
                        <p className="text-sm font-heading font-bold text-[var(--color-text-primary)]">
                          {tipo === "retirada" ? "Retirar" : "Entrega"}
                        </p>
                        {tipo === "entrega" && (
                          <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">
                            + R$ 7,00
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {deliveryType === "entrega" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Endereço <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro..." rows={2}
                    className="rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] text-sm resize-none" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Observações
                </label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne..." rows={2}
                  className="rounded-xl bg-[var(--color-surface-secondary)] border-[var(--color-border)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] text-sm resize-none" />
              </div>
            </div>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-none">
                    {cart.length} item{cart.length !== 1 ? "s" : ""}
                    {deliveryType === "entrega" && " · inclui entrega"}
                  </p>
                </div>
              </div>
              <p className="font-heading font-extrabold text-2xl text-[var(--color-accent)]">
                R$ {total.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => placeOrder.mutate()}
              disabled={!name.trim() || !phone.trim() || placeOrder.isPending}
              className="w-full gradient-warm text-white font-heading font-bold text-lg py-4 rounded-2xl shadow-warm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              <ShoppingCart className="h-5 w-5" />
              {placeOrder.isPending ? "Enviando..." : "Finalizar Pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
