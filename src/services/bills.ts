import { supabase } from "@/integrations/supabase/client";

import type { Database } from "@/integrations/supabase/types";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];
type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export async function getBills(): Promise<BillRow[]> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBill(payload: BillInsert) {
  const { error } = await supabase.from("bills").insert(payload);
  if (error) throw error;
}

export async function deleteBill(id: string) {
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

export async function markBillPaid(id: string, paidAt: string) {
  const { error } = await supabase
    .from("bills")
    .update({ status: "paga", paid_at: paidAt } satisfies Partial<BillUpdate>)
    .eq("id", id);
  if (error) throw error;
}

export async function undoBillPaid(id: string, newStatus: string) {
  const { error } = await supabase
    .from("bills")
    .update({ status: newStatus, paid_at: null } satisfies Partial<BillUpdate>)
    .eq("id", id);
  if (error) throw error;
}
