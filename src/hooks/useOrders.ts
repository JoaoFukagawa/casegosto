import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getOrdersByDate,
  getHaverOrders,
  getRecentOrders,
  getDashboardTodayOrders,
  getHistoryOrders,
  getReportsOrderData,
  updateOrderStatus,
  deleteOrder,
} from "@/services/orders";
import { toast } from "sonner";

export function useOrders(dayStart: string, dayEnd: string) {
  return useQuery({
    queryKey: queryKeys.orders.byDate(dayStart),
    queryFn: () => getOrdersByDate(dayStart, dayEnd),
    refetchInterval: 10000,
  });
}

export function useHaverOrders() {
  return useQuery({
    queryKey: queryKeys.orders.haver,
    queryFn: getHaverOrders,
    refetchInterval: 10000,
  });
}

export function useRecentOrders() {
  return useQuery({
    queryKey: queryKeys.orders.recent,
    queryFn: () => getRecentOrders(8),
    refetchInterval: 10000,
  });
}

export function useDashboardTodayOrders(startOfDay: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.today,
    queryFn: () => getDashboardTodayOrders(startOfDay),
    refetchInterval: 10000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.orders.haver });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.today });
      toast.success("Status atualizado!");
    },
  });
}

export function useHistoryOrders(date: string) {
  return useQuery({
    queryKey: queryKeys.orders.byDate(date),
    queryFn: () => getHistoryOrders(date),
  });
}

export function useSalesReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["relatorios-sales", startDate, endDate],
    queryFn: () => getReportsOrderData(startDate, endDate),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.orders.haver });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.today });
      toast.success("Pedido excluído!");
    },
  });
}
