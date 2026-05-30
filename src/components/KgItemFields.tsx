import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KgItemFieldsProps {
  item: {
    price: number;
    weight?: number;
  };
  onUpdateWeight: (weight: number) => void;
}

export default function KgItemFields({ item, onUpdateWeight }: KgItemFieldsProps) {
  const [weightStr, setWeightStr] = useState(String(item.weight || ""));
  const [valorStr, setValorStr] = useState(
    item.price && item.weight ? (item.price * item.weight).toFixed(2) : ""
  );
  const [editingField, setEditingField] = useState<"peso" | "valor" | null>(null);

  // Sync from parent when not actively editing
  useEffect(() => {
    if (editingField !== "peso") {
      setWeightStr(item.weight ? String(item.weight) : "");
    }
    if (editingField !== "valor") {
      setValorStr(
        item.price && item.weight ? (item.price * item.weight).toFixed(2) : ""
      );
    }
  }, [item.weight, item.price, editingField]);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Peso:</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={weightStr}
          onFocus={() => setEditingField("peso")}
          onBlur={() => setEditingField(null)}
          onChange={(e) => {
            setWeightStr(e.target.value);
            const w = parseFloat(e.target.value) || 0;
            onUpdateWeight(w);
            setValorStr(item.price && w ? (item.price * w).toFixed(2) : "");
          }}
          className="h-8 w-20 text-sm"
          placeholder="kg"
        />
      </div>
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Valor:</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={valorStr}
          onFocus={() => setEditingField("valor")}
          onBlur={() => setEditingField(null)}
          onChange={(e) => {
            setValorStr(e.target.value);
            const totalValue = parseFloat(e.target.value) || 0;
            if (item.price > 0) {
              // mantém precisão total para que preço × peso bata exatamente com o valor digitado
              const calculatedWeight = totalValue / item.price;
              onUpdateWeight(calculatedWeight);
              setWeightStr(calculatedWeight ? calculatedWeight.toFixed(3) : "");
            }
          }}
          className="h-8 w-24 text-sm"
          placeholder="R$"
        />
      </div>
      <span className="text-sm font-bold text-primary ml-auto">
        R$ {(item.price * (item.weight || 0)).toFixed(2)}
      </span>
    </div>
  );
}
