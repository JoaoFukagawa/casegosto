import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getMenuItems,
  getActiveMenuItems,
  toggleMenuItemActive,
  updateMenuItemStock,
  updateMenuItemStockByUnit,
  deleteMenuItem,
} from "@/services/menu-items";
import { toast } from "sonner";

export function useMenuItems() {
  return useQuery({
    queryKey: queryKeys.menuItems.all,
    queryFn: getMenuItems,
  });
}

export function useActiveMenuItems() {
  return useQuery({
    queryKey: queryKeys.menuItems.active,
    queryFn: getActiveMenuItems,
  });
}

export function useToggleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleMenuItemActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.all });
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.active });
    },
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number | null }) => updateMenuItemStock(id, stock),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.all });
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.active });
      toast.success("Estoque atualizado!");
    },
  });
}

export function useUpdateStockByUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock_by_unit }: { id: string; stock_by_unit: boolean }) =>
      updateMenuItemStockByUnit(id, stock_by_unit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.all });
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.active });
      toast.success("Modo de estoque atualizado!");
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.all });
      qc.invalidateQueries({ queryKey: queryKeys.menuItems.active });
      toast.success("Item removido!");
    },
    onError: () => toast.error("Erro ao remover. Pode haver pedidos vinculados."),
  });
}
