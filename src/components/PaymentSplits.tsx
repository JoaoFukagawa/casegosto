import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";


export type PaymentSplit = {
  method_value: string;
  method_label: string;
  amount: string; // string for input control
};

interface Props {
  splits: PaymentSplit[];
  setSplits: (s: PaymentSplit[]) => void;
  methods: { value: string; label: string; emoji: string }[];
  total: number;
}

export default function PaymentSplits({ splits, setSplits, methods, total }: Props) {
  const sum = splits.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const diff = +(total - sum).toFixed(2);

  // Auto-fill the single split with the order total while user hasn't touched it
  const touchedRef = useRef(false);
  useEffect(() => {
    if (touchedRef.current) return;
    if (splits.length === 1 && total > 0) {
      const current = parseFloat(splits[0].amount) || 0;
      const target = +total.toFixed(2);
      if (Math.abs(current - target) > 0.009) {
        const copy = splits.slice();
        copy[0] = { ...copy[0], amount: target.toFixed(2) };
        setSplits(copy);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, splits.length]);


  const update = (i: number, patch: Partial<PaymentSplit>) => {
    const copy = splits.slice();
    copy[i] = { ...copy[i], ...patch };
    setSplits(copy);
  };

  const addSplit = () => {
    const fallback = methods[0];
    if (!fallback) return;
    const remaining = Math.max(0, diff);
    setSplits([
      ...splits,
      {
        method_value: fallback.value,
        method_label: fallback.label,
        amount: remaining > 0 ? remaining.toFixed(2) : "",
      },
    ]);
  };

  const removeSplit = (i: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, idx) => idx !== i));
  };

  const fillRemaining = (i: number) => {
    const others = splits.reduce(
      (s, p, idx) => (idx === i ? s : s + (parseFloat(p.amount) || 0)),
      0
    );
    const rest = Math.max(0, +(total - others).toFixed(2));
    update(i, { amount: rest.toFixed(2) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Formas de pagamento</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addSplit}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {splits.map((split, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={split.method_value}
              onValueChange={(v) => {
                const m = methods.find((x) => x.value === v);
                if (!m) return;
                update(i, { method_value: m.value, method_label: m.label });
              }}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.emoji} {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={split.amount}
              onChange={(e) => { touchedRef.current = true; update(i, { amount: e.target.value }); }}
              placeholder="0,00"
              className="h-9 w-28"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => fillRemaining(i)}
              title="Preencher com o restante"
            >
              =
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10"
              onClick={() => removeSplit(i)}
              disabled={splits.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground">
          Total pago: <span className="font-bold text-foreground">R$ {sum.toFixed(2)}</span> / R$ {total.toFixed(2)}
        </span>
        {Math.abs(diff) > 0.009 ? (
          <span className={diff > 0 ? "text-warning font-bold" : "text-destructive font-bold"}>
            {diff > 0 ? `Falta R$ ${diff.toFixed(2)}` : `Excedeu R$ ${Math.abs(diff).toFixed(2)}`}
          </span>
        ) : (
          <span className="text-primary font-bold">✓ Confere</span>
        )}
      </div>
    </div>
  );
}
