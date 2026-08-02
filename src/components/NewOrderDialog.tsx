import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, ShoppingCart, Truck, Store } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import PaymentSplits, { PaymentSplit } from "@/components/PaymentSplits";
import KgItemFields from "@/components/KgItemFields";
import { useCart } from "@/hooks/useCart";
import { useActiveMenuItems } from "@/hooks/useMenuItems";
import { useActivePaymentMethods } from "@/hooks/usePaymentMethods";
import { useClients } from "@/hooks/useClients";
import { queryKeys } from "@/lib/query-keys";

export default function NewOrderDialog() {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [matchedClienteId, setMatchedClienteId] = useState<string | null>(null);
  const [pratoDoDia, setPratoDoDia] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState("retirada");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("7.00");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { method_value: "dinheiro", method_label: "Dinheiro", amount: "" },
  ]);
  const [cashReceived, setCashReceived] = useState("");
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deliveryTime, setDeliveryTime] = useState("");
  const queryClient = useQueryClient();

  const { cart, addToCart, updateQuantity, updateWeight, removeFromCart, clearCart } = useCart();
  const { data: menuItems } = useActiveMenuItems();
  const { data: paymentMethods } = useActivePaymentMethods();
  const { data: clientes } = useClients();

  const { data: pratosAnteriores } = useQuery({
    queryKey: ["pratos_anteriores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pratos")
        .select("nome_prato")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return [...new Set((data || []).map((p: any) => p.nome_prato.trim()))] as string[];
    },
  });

  const tryMatchCustomer = (name: string, phone: string) => {
    if (!clientes) return;
    const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const nameNorm = normalized(name);
    const phoneDigits = phone.replace(/\D/g, "");
    const match = clientes.find(
      (c: any) =>
        normalized(c.nome) === nameNorm ||
        (phoneDigits.length >= 8 && c.telefone?.replace(/\D/g, "").endsWith(phoneDigits.slice(-8)))
    );
    if (match) {
      setMatchedClienteId(match.id);
      if (match.rua) setDeliveryAddress([match.rua, match.numero, match.bairro, match.complemento].filter(Boolean).join(", "));
    } else setMatchedClienteId(null);
  };

  const saveAsNewCliente = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error("Informe o nome");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await (supabase as any).from("clientes").insert({
        nome: customerName.trim(), telefone: customerPhone.trim() || null,
        rua: deliveryAddress.trim() || null, user_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success("Cliente cadastrado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao cadastrar cliente"),
  });

  const currentPaymentMethod = paymentMethods?.find((m: any) => m.value === paymentMethod);
  const hasCashSplit = splits.some((s) => {
    const m = paymentMethods?.find((pm: any) => pm.value === s.method_value);
    return m?.is_cash;
  });
  const isCashPayment = hasCashSplit || (currentPaymentMethod?.is_cash ?? (paymentMethod === "dinheiro"));

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const startOfDayISO = todayStart.toISOString();

  const { data: soldToday } = useQuery({
    queryKey: ["sold_today_orders", startOfDayISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("menu_item_id, quantity, orders!inner(created_at, status)")
        .gte("orders.created_at", startOfDayISO);
      if (error) throw error;
      const sold: Record<string, number> = {};
      for (const item of data || []) {
        const order = item.orders as any;
        if (order?.status === "cancelado") continue;
        sold[item.menu_item_id] = (sold[item.menu_item_id] || 0) + item.quantity;
      }
      return sold;
    },
    refetchInterval: 10000,
  });

  const getStockRemaining = (item: { id: string; stock: number | null }) => {
    if (item.stock == null) return null;
    const qtySold = soldToday?.[item.id] ?? 0;
    return Math.max(0, item.stock - qtySold);
  };

  const createOrder = useMutation({
    mutationFn: async () => {
      const fee = deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0;
      const total = cart.reduce((sum, item) => {
        if (item.unit_type === "kg") return sum + item.price * (item.weight || 0);
        return sum + item.price * item.quantity;
      }, 0) + fee;

      const validSplits = splits.map((s) => ({ ...s, amountNum: parseFloat(s.amount) || 0 })).filter((s) => s.amountNum > 0);
      if (validSplits.length === 0) throw new Error("Informe ao menos uma forma de pagamento");
      const sumSplits = validSplits.reduce((s, p) => s + p.amountNum, 0);
      if (Math.abs(sumSplits - total) > 0.01)
        throw new Error(`A soma dos pagamentos (R$ ${sumSplits.toFixed(2)}) deve igual ao total (R$ ${total.toFixed(2)})`);

      const primaryMethod = validSplits.length === 1 ? validSplits[0].method_value : "misto";
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const uid = u.user.id;

      const now = new Date();
      const selectedDate = new Date(orderDate + "T" + format(now, "HH:mm:ss"));
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        customer_name: customerName.trim(), customer_phone: customerPhone.trim() || null,
        notes: notes.trim() || null, total, delivery_type: deliveryType,
        delivery_address: deliveryType === "entrega" ? deliveryAddress.trim() || null : null,
        delivery_fee: deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0,
        payment_method: primaryMethod, delivery_time: deliveryTime || null,
        created_at: selectedDate.toISOString(), user_id: uid,
      }).select().single();
      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id, menu_item_id: item.menu_item_id,
        quantity: item.quantity, unit_price: item.price,
        weight: item.unit_type === "kg" ? item.weight || null : null, user_id: uid,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      const paymentRows = validSplits.map((s) => ({
        order_id: order.id, method_value: s.method_value, method_label: s.method_label, amount: s.amountNum, user_id: uid,
      }));
      const { error: payError } = await supabase.from("order_payments").insert(paymentRows);
      if (payError) throw payError;

      if (pratoDoDia.trim()) {
        const totalMarmitas = cart.reduce((s, c) => s + (c.unit_type === "kg" ? 0 : c.quantity), 0);
        if (totalMarmitas > 0) {
          await (supabase as any).from("pratos").insert({
            nome_prato: pratoDoDia.trim(), data: orderDate, quantidade_vendida: totalMarmitas, user_id: uid,
          });
        }
      }

      if (!matchedClienteId && customerName.trim()) {
        await (supabase as any).from("clientes").insert({
          nome: customerName.trim(), telefone: customerPhone.trim() || null,
          rua: deliveryType === "entrega" ? deliveryAddress.trim() || null : null, user_id: uid,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pratos.ranking("") });
      toast.success("Pedido criado com sucesso!");
      resetForm();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar pedido"),
  });

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setMatchedClienteId(null); setPratoDoDia("");
    setNotes(""); clearCart(); setDeliveryType("retirada"); setDeliveryAddress("");
    setDeliveryFee("7.00"); setPaymentMethod("dinheiro");
    setSplits([{ method_value: "dinheiro", method_label: "Dinheiro", amount: "" }]);
    setCashReceived(""); setOrderDate(format(new Date(), "yyyy-MM-dd")); setDeliveryTime("");
  };

  const fee = deliveryType === "entrega" ? parseFloat(deliveryFee) || 0 : 0;
  const total = cart.reduce((sum, item) => {
    if (item.unit_type === "kg") return sum + item.price * (item.weight || 0);
    return sum + item.price * item.quantity;
  }, 0) + fee;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--color-accent)] text-[var(--color-accent-text)] text-[13px] font-bold uppercase tracking-[0.8px] rounded-[10px] px-6 py-3 shadow-warm hover:bg-[var(--color-accent-hover)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(200,133,42,0.3)] transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" /> Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Nome do cliente *</Label>
              <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Maria" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={customerPhone} list="clientes-telefones"
                onChange={(e) => { setCustomerPhone(e.target.value); setMatchedClienteId(null); }}
                onBlur={() => tryMatchCustomer(customerName, customerPhone)} placeholder="(00) 00000-0000" />
              <datalist id="clientes-telefones">
                {clientes?.filter((c: any) => c.telefone).map((c: any) => (
                  <option key={c.id} value={c.telefone}>{c.nome}</option>
                ))}
              </datalist>
            </div>
          </div>

          {customerName.trim() && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
              {matchedClienteId ? (
                <span className="text-success font-medium">✅ Cliente reconhecido — endereço preenchido</span>
              ) : (
                <>
                  <span className="text-muted-foreground">Cliente novo — será cadastrado ao salvar</span>
                  <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => saveAsNewCliente.mutate()} disabled={saveAsNewCliente.isPending}>
                    Cadastrar agora
                  </Button>
                </>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="prato-do-dia">Prato do dia (para ranking)</Label>
            <Input id="prato-do-dia" value={pratoDoDia} list="pratos-anteriores"
              onChange={(e) => setPratoDoDia(e.target.value)} placeholder="Ex: Frango grelhado com arroz e feijão" />
            <datalist id="pratos-anteriores">
              {(pratosAnteriores || []).map((nome: string, i: number) => (
                <option key={i} value={nome} />
              ))}
            </datalist>
            {pratoDoDia && pratosAnteriores?.includes(pratoDoDia.trim()) && (
              <p className="text-xs text-success mt-1">✅ Prato já cadastrado — será agrupado no ranking</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="order-date">Data do pedido</Label>
              <Input id="order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="delivery-time">Horário de entrega/retirada</Label>
              <Input id="delivery-time" type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Itens do cardápio</Label>
            <div className="mt-2 grid gap-2 max-h-40 overflow-y-auto">
              {menuItems?.map((item: any) => {
                const remaining = getStockRemaining(item);
                const isOut = remaining != null && remaining <= 0;
                return (
                  <button key={item.id} type="button" onClick={() => addToCart(item, remaining)} disabled={isOut}
                    className={`flex items-center justify-between rounded-lg border border-border p-3 text-left transition-colors ${isOut ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"}`}>
                    <div>
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category}{item.unit_type === "kg" ? " · por kg" : ""}
                        {remaining != null && ` · ${isOut ? "Esgotado" : `${remaining} restante${remaining !== 1 ? "s" : ""}`}`}
                      </p>
                    </div>
                    <span className="font-bold text-primary font-heading">R$ {item.price.toFixed(2)}{item.unit_type === "kg" ? "/kg" : ""}</span>
                  </button>
                );
              })}
              {!menuItems?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item no cardápio. Cadastre itens primeiro!</p>}
            </div>
          </div>

          {cart.length > 0 && (
            <div>
              <Label>Carrinho</Label>
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
                      <KgItemFields item={item} onUpdateWeight={(w) => updateWeight(item.cart_id, w)} />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cart_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cart_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold text-primary ml-auto">R$ {(item.price * item.quantity).toFixed(2)}</span>
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
                <RadioGroupItem value="retirada" id="retirada" />
                <Label htmlFor="retirada" className="flex items-center gap-1 cursor-pointer"><Store className="h-4 w-4" /> Retirada</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="entrega" id="entrega" />
                <Label htmlFor="entrega" className="flex items-center gap-1 cursor-pointer"><Truck className="h-4 w-4" /> Entrega</Label>
              </div>
            </RadioGroup>
          </div>

          {deliveryType === "entrega" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="address">Endereço de entrega *</Label>
                <Textarea id="address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Rua, número, bairro..." rows={2} />
              </div>
              <div>
                <Label htmlFor="delivery-fee">Taxa de entrega (R$)</Label>
                <Input id="delivery-fee" type="number" step="0.50" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="h-9 w-32" />
              </div>
            </div>
          )}

          <PaymentSplits splits={splits} setSplits={setSplits} methods={(paymentMethods || []) as any} total={total} />

          {isCashPayment && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <Label htmlFor="cash-received">Valor recebido (troco)</Label>
              <Input id="cash-received" type="number" step="0.01" min="0" value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)} placeholder={`Total: R$ ${total.toFixed(2)}`} className="h-9" />
              {cashReceived && parseFloat(cashReceived) > total && <p className="text-sm font-bold text-primary">💰 Troco: R$ {(parseFloat(cashReceived) - total).toFixed(2)}</p>}
              {cashReceived && parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < total && <p className="text-sm font-bold text-destructive">⚠️ Valor insuficiente (faltam R$ {(total - parseFloat(cashReceived)).toFixed(2)})</p>}
              {cashReceived && parseFloat(cashReceived) === total && <p className="text-sm text-muted-foreground">✅ Sem troco</p>}
            </div>
          )}

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola, arroz extra..." rows={2} />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-extrabold font-heading text-primary">R$ {total.toFixed(2)}</p>
            </div>
            <Button onClick={() => createOrder.mutate()} disabled={!customerName.trim() || cart.length === 0 || createOrder.isPending || (deliveryType === "entrega" && !deliveryAddress.trim())}
              className="gradient-warm text-primary-foreground shadow-warm font-heading font-bold">
              <ShoppingCart className="mr-2 h-4 w-4" /> {createOrder.isPending ? "Criando..." : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
