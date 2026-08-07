// Plano de contas — as categorias vivem na tabela `categorias_financeiras`
// (fonte única, usada pelo front-end e pela function assistente-financeiro).
// Este arquivo só tem helpers puros que operam sobre a lista já carregada.

export interface CategoriaFinanceira {
  id: string;
  slug: string;
  nome: string;
  // string solta (não união literal) porque o Supabase gera o tipo da coluna como `text`.
  tipo: string;
  grupo: string;
  emoji: string | null;
  is_operacional: boolean;
  ativo: boolean;
  ordem: number;
}

export function categoriaLabel(cat: Pick<CategoriaFinanceira, "nome" | "emoji">): string {
  return cat.emoji ? `${cat.emoji} ${cat.nome}` : cat.nome;
}

export function getExpenseCategoryLabel(categorias: CategoriaFinanceira[], slug: string): string {
  const cat = categorias.find((c) => c.slug === slug);
  return cat ? categoriaLabel(cat) : slug;
}

export function findCategoryBySlug(categorias: CategoriaFinanceira[], slug: string): CategoriaFinanceira | null {
  return categorias.find((c) => c.slug === slug) ?? null;
}

// Contas (bills) guardam o nome de exibição da categoria em texto livre.
// Faz o match (exato, depois por aproximação) contra o plano de contas atual.
export function findCategoryByNome(categorias: CategoriaFinanceira[], nome: string): CategoriaFinanceira | null {
  const alvo = (nome || "").trim().toLowerCase();
  if (!alvo) return null;
  return (
    categorias.find((c) => c.nome.toLowerCase() === alvo) ??
    categorias.find((c) => c.nome.toLowerCase().includes(alvo) || alvo.includes(c.nome.toLowerCase())) ??
    null
  );
}

export function groupCategories(categorias: CategoriaFinanceira[], tipo: "receita" | "despesa") {
  const filtradas = categorias.filter((c) => c.tipo === tipo && c.ativo).sort((a, b) => a.ordem - b.ordem);
  const grupos = new Map<string, CategoriaFinanceira[]>();
  for (const cat of filtradas) {
    if (!grupos.has(cat.grupo)) grupos.set(cat.grupo, []);
    grupos.get(cat.grupo)!.push(cat);
  }
  return Array.from(grupos.entries()).map(([grupo, itens]) => ({ grupo, itens }));
}
