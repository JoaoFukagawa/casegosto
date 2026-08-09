import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["categorias_financeiras"]["Row"];
type Insert = Database["public"]["Tables"]["categorias_financeiras"]["Insert"];
type Update = Database["public"]["Tables"]["categorias_financeiras"]["Update"];

function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function getFinanceCategories(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .select("*")
    .order("tipo", { ascending: false })
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFinanceCategory(payload: {
  nome: string;
  tipo: "receita" | "despesa";
  grupo: string;
  codigo?: string | null;
  emoji?: string | null;
  is_operacional?: boolean;
}): Promise<Row> {
  const slugBase = slugify(payload.nome) || "categoria";
  let slug = slugBase;
  let tentativa = 1;
  // Garante slug único mesmo se já existir uma categoria com nome parecido/removida.
  while (true) {
    const { data: existente } = await supabase
      .from("categorias_financeiras")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existente) break;
    tentativa += 1;
    slug = `${slugBase}_${tentativa}`;
  }

  // Deriva a ordem de exibição a partir do código (ex: "2.4" -> 240) para
  // que a linha nova apareça no lugar certo dentro do grupo.
  let ordem = 999;
  if (payload.codigo) {
    const m = payload.codigo.match(/^(\d+)\.(\d+)/);
    if (m) ordem = parseInt(m[1], 10) * 100 + parseInt(m[2], 10) * 10;
  }

  const insert: Insert = {
    slug,
    codigo: payload.codigo || null,
    nome: payload.nome.trim(),
    tipo: payload.tipo,
    grupo: payload.grupo.trim() || "Outros",
    emoji: payload.emoji || null,
    is_operacional: payload.is_operacional ?? true,
    ordem,
  };
  const { data, error } = await supabase.from("categorias_financeiras").insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function updateFinanceCategory(id: string, payload: Update) {
  const { error } = await supabase.from("categorias_financeiras").update(payload).eq("id", id);
  if (error) throw error;
}

export async function setFinanceCategoryAtivo(id: string, ativo: boolean) {
  return updateFinanceCategory(id, { ativo });
}
