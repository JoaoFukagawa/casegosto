import { supabase } from "@/integrations/supabase/client";

export async function getClients() {
  const { data, error } = await supabase.from("clientes").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function createClient(payload: {
  nome: string;
  telefone?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  observacoes?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("clientes").insert({ ...payload, user_id: u.user.id });
  if (error) throw error;
}

export async function updateClient(id: string, payload: any) {
  const { error } = await supabase.from("clientes").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}
