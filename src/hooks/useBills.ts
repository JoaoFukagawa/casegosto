import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getBills, createBill, deleteBill, markBillPaid, undoBillPaid } from "@/services/bills";
import { createExpense } from "@/services/expenses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { findCategoryByNome } from "@/lib/finance-categories";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";

export function useBills() {
  return useQuery({
    queryKey: queryKeys.bills.finance,
    queryFn: getBills,
  });
}

export function useMarkBillPaid() {
  const qc = useQueryClient();
  const { data: categorias = [] } = useFinanceCategories();
  return useMutation({
    mutationFn: async ({ id, bill }: { id: string; bill: any }) => {
      await markBillPaid(id, new Date().toISOString());
      if (bill) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const categoria = findCategoryByNome(categorias, bill.categoria);
          // Só lança como despesa do mês quando a categoria é operacional (mercado, gás, retirada...).
          // Contas administrativas (aluguel, impostos...) ficam só como conta paga, sem duplicar em despesas.
          if (categoria?.is_operacional) {
            await createExpense({
              description: bill.nome,
              category: categoria.slug,
              amount: Number(bill.valor),
              expense_date: format(new Date(), "yyyy-MM-dd"),
            });
          }
        }
      }
    },
    onSuccess: (_data, { bill }) => {
      qc.invalidateQueries({ queryKey: queryKeys.bills.all });
      qc.invalidateQueries({ queryKey: queryKeys.bills.finance });
      qc.invalidateQueries({ queryKey: queryKeys.expenses.byMonth("") });
      const categoria = findCategoryByNome(categorias, bill?.categoria ?? "");
      toast.success(
        categoria?.is_operacional
          ? "Conta marcada como paga e lançada nas despesas ✓"
          : "Conta marcada como paga ✓"
      );
    },
    onError: () => toast.error("Erro ao dar baixa"),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bills.all });
      qc.invalidateQueries({ queryKey: queryKeys.bills.finance });
      toast.success("Conta removida");
    },
  });
}

export function useUndoBillPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bill: any) => {
      let newStatus = "proxima";
      if (bill.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(bill.due_date + "T00:00:00");
        if (d.getTime() < today.getTime()) newStatus = "atrasada";
        else if (d.getTime() === today.getTime()) newStatus = "vence-hoje";
      }
      await undoBillPaid(bill.id, newStatus);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bills.all });
      qc.invalidateQueries({ queryKey: queryKeys.bills.finance });
      toast.success("Baixa desfeita");
    },
    onError: () => toast.error("Erro ao desfazer"),
  });
}
