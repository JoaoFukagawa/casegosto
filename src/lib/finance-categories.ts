// Plano de contas — as categorias vivem na tabela `categorias_financeiras`
// (fonte única, usada pelo front-end e pela function assistente-financeiro).
// Este arquivo só tem helpers puros que operam sobre a lista já carregada.

export interface CategoriaFinanceira {
  id: string;
  codigo: string | null;
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

export function categoriaLabel(cat: Pick<CategoriaFinanceira, "nome" | "codigo">): string {
  return cat.codigo ? `${cat.codigo} ${cat.nome}` : cat.nome;
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

// Calcula o próximo código dentro de um grupo (ex: grupo "2. Custos Diretos"
// com linhas 2.1/2.2/2.3 cadastradas -> devolve "2.4"). Se o grupo ainda não
// existir, cria o próximo número de grupo disponível (ex: "6.1").
export function computeNextCodigo(categorias: CategoriaFinanceira[], grupo: string): string {
  const grupoTrim = grupo.trim();
  const match = grupoTrim.match(/^(\d+)\./);

  if (match) {
    const grupoNum = match[1];
    const irmãos = categorias.filter((c) => c.grupo.trim() === grupoTrim && c.codigo);
    let maxSub = 0;
    for (const c of irmãos) {
      const m = c.codigo!.match(/^\d+\.(\d+)/);
      if (m) maxSub = Math.max(maxSub, parseInt(m[1], 10));
    }
    return `${grupoNum}.${maxSub + 1}`;
  }

  // Grupo novo (digitado pelo usuário) — acha o próximo número de grupo livre.
  let maxGrupo = 0;
  for (const c of categorias) {
    const m = c.grupo.trim().match(/^(\d+)\./);
    if (m) maxGrupo = Math.max(maxGrupo, parseInt(m[1], 10));
  }
  return `${maxGrupo + 1}.1`;
}
