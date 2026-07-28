import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getActivePaymentMethods, getPaymentMethods } from "@/services/payment-methods";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useActivePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.active,
    queryFn: getActivePaymentMethods,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.all,
    queryFn: getPaymentMethods,
  });
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function useSavePaymentMethod(method?: { id: string } | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { label: string; emoji: string; active: boolean; is_cash: boolean }) => {
      if (!payload.label.trim()) throw new Error("Informe um nome");
      if (method) {
        const { error } = await supabase
          .from("payment_methods")
          .update({ label: payload.label.trim(), emoji: payload.emoji.trim() || "💳", active: payload.active, is_cash: payload.is_cash })
          .eq("id", method.id);
        if (error) throw error;
      } else {
        const base = slugify(payload.label) || `metodo_${Date.now()}`;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sessão expirada");
        const { error } = await supabase.from("payment_methods").insert({
          value: `${base}_${Date.now().toString(36)}`,
          label: payload.label.trim(),
          emoji: payload.emoji.trim() || "💳",
          active: payload.active,
          is_cash: payload.is_cash,
          sort_order: 999,
          user_id: u.user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.active });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.active });
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });
}

export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { id: string; active: boolean }) => {
      const { error } = await supabase.from("payment_methods").update({ active: !m.active }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.active });
    },
  });
}

export function useMovePaymentMethod(methods?: any[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ m, dir }: { m: any; dir: -1 | 1 }) => {
      const list = (methods || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
      const idx = list.findIndex((x: any) => x.id === m.id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= list.length) return;
      const other = list[swapIdx];
      const a = m.sort_order;
      const b = other.sort_order;
      const newA = a === b ? a + dir : b;
      const newB = a === b ? a : a;
      await supabase.from("payment_methods").update({ sort_order: newA }).eq("id", m.id);
      await supabase.from("payment_methods").update({ sort_order: newB }).eq("id", other.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.paymentMethods.all }),
  });
}
