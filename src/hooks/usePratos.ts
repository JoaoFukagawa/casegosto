import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getPratosRanking, getPratosRaw, getSoldToday, getTodayOrderItems } from "@/services/pratos";

export function usePratosRaw(monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: queryKeys.pratos.ranking(monthStart),
    queryFn: () => getPratosRaw(monthStart, monthEnd),
  });
}

export function usePratosRanking(monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: queryKeys.pratos.ranking(monthStart),
    queryFn: () => getPratosRanking(monthStart, monthEnd),
    refetchInterval: 30000,
  });
}

export function useSoldToday(dayStart: string) {
  return useQuery({
    queryKey: queryKeys.pratos.soldToday(dayStart),
    queryFn: () => getSoldToday(dayStart),
    refetchInterval: 10000,
  });
}

export function useTodayOrderItems(dayStart: string) {
  return useQuery({
    queryKey: queryKeys.orderItems.today(dayStart),
    queryFn: () => getTodayOrderItems(dayStart),
    refetchInterval: 10000,
  });
}
