// Mantido em sincronia manual com src/lib/finance-categories.ts
// (edge functions rodam em Deno e não importam de src/, então este arquivo é
// uma cópia intencional — ao mudar categorias, atualize os dois lugares).

export const EXPENSE_CATEGORIES = [
  { value: "mercado", label: "Mercado" },
  { value: "embalagens", label: "Embalagens" },
  { value: "gas", label: "Gás" },
  { value: "entregador", label: "Entregador" },
  { value: "retirada", label: "Retirada/Pró-labore" },
  { value: "diaria", label: "Diária" },
  { value: "caixinha", label: "Caixinha" },
  { value: "troco", label: "Troco" },
  { value: "outros", label: "Outros" },
];

export const BILL_CATEGORIES = [
  "Moradia",
  "Energia/Água",
  "Ingredientes",
  "Transporte",
  "Internet/Telefone",
  "Funcionários",
  "Retirada/Pró-labore",
  "Diária",
  "Caixinha",
  "Troco",
  "Impostos",
  "Outros",
];

export function mapBillCategoryToExpenseCategory(cat: string): string | null {
  const c = (cat || "").toLowerCase();
  if (/(ingredient|mercado|merca|alimento|comida|hortifr|carne|frango|fruta|verdura|legume|couve)/.test(c)) return "mercado";
  if (/(embalag|marmitex|pote|sacola|descart)/.test(c)) return "embalagens";
  if (/(g[áa]s|botij)/.test(c)) return "gas";
  if (/(entregad|motoboy|ifood|uber|delivery)/.test(c)) return "entregador";
  if (/(retirada|pr[óo].?labore)/.test(c)) return "retirada";
  if (/(di[áa]ria)/.test(c)) return "diaria";
  if (/(caixinha|gorjeta)/.test(c)) return "caixinha";
  if (/(troco)/.test(c)) return "troco";
  return null;
}
