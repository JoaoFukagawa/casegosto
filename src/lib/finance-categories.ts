// Fonte única de categorias financeiras (despesas e contas).
// Mantido em sincronia manual com supabase/functions/_shared/finance-categories.ts
// (edge functions rodam em Deno e não importam de src/).

export type ExpenseCategoryValue =
  | "mercado"
  | "embalagens"
  | "gas"
  | "entregador"
  | "retirada"
  | "diaria"
  | "caixinha"
  | "troco"
  | "outros";

export interface ExpenseCategory {
  value: ExpenseCategoryValue;
  label: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: "mercado", label: "🛒 Mercado" },
  { value: "embalagens", label: "📦 Embalagens" },
  { value: "gas", label: "🔥 Gás" },
  { value: "entregador", label: "🛵 Entregador" },
  { value: "retirada", label: "💵 Retirada/Pró-labore" },
  { value: "diaria", label: "🗓️ Diária" },
  { value: "caixinha", label: "🐷 Caixinha" },
  { value: "troco", label: "🔄 Troco" },
  { value: "outros", label: "📋 Outros" },
];

export function getExpenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Categorias sugeridas para "bills" (contas a pagar) — texto livre, apenas sugestão de UI.
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

// Mapeia a categoria livre de uma conta (bills.categoria) para uma categoria de
// despesa operacional (expenses.category). Retorna null quando NÃO é uma despesa
// operacional do dia (ex: aluguel, impostos) — nesse caso a conta continua como
// "conta a pagar" com vencimento, em vez de virar despesa automaticamente.
export function mapBillCategoryToExpenseCategory(cat: string): ExpenseCategoryValue | null {
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
