import { supabase } from "@/integrations/supabase/client";

export async function getPaymentMethods() {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getActivePaymentMethods() {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}
