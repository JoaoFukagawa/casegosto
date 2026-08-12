import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMonthReceitas, createReceita, deleteReceita } from "@/services/receitas";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";

export function useMonthReceitas(selectedDate: string) {
  return useQuery({
    queryKey: queryKeys.receitas.byMonth(selectedDate),
    queryFn: async () => {
      const monthStart = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      return getMonthReceitas(monthStart, monthEnd);
    },
  });
}

export function useCreateReceita(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { description: string; category: string; amount: number; receita_date: string }) =>
      createReceita(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.receitas.byMonth("") });
      toast.success("Receita adicionada!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao adicionar receita"),
  });
}

export function useDeleteReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReceita(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.receitas.byMonth("") });
      toast.success("Receita removida!");
    },
  });
}
