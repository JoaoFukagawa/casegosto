import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  getFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  setFinanceCategoryAtivo,
} from "@/services/finance-categories";
import type { Database } from "@/integrations/supabase/types";

type Update = Database["public"]["Tables"]["categorias_financeiras"]["Update"];

export function useFinanceCategories() {
  return useQuery({
    queryKey: queryKeys.financeCategories.all,
    queryFn: getFinanceCategories,
    staleTime: 60_000,
  });
}

export function useCreateFinanceCategory(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFinanceCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeCategories.all });
      toast.success("Categoria criada!");
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar categoria"),
  });
}

export function useUpdateFinanceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Update }) => updateFinanceCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeCategories.all });
      toast.success("Categoria atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });
}

export function useToggleFinanceCategoryAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setFinanceCategoryAtivo(id, ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeCategories.all });
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });
}
