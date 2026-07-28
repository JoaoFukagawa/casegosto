import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMonthExpenses, getReportExpenses, createExpense, deleteExpense } from "@/services/expenses";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";

export function useExpenseReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.expenses.report(startDate, endDate),
    queryFn: () => getReportExpenses(startDate, endDate),
  });
}

export function useMonthExpenses(selectedDate: string) {
  return useQuery({
    queryKey: queryKeys.expenses.byMonth(selectedDate),
    queryFn: async () => {
      const monthStart = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
      return getMonthExpenses(monthStart, monthEnd);
    },
  });
}

export function useCreateExpense(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { description: string; category: string; amount: number; expense_date: string }) =>
      createExpense(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses.byMonth("") });
      toast.success("Despesa adicionada!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao adicionar despesa"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses.byMonth("") });
      toast.success("Despesa removida!");
    },
  });
}
