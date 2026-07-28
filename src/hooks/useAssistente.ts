import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMonthRevenue } from "@/services/assistente";
import { getBills } from "@/services/bills";

export function useMonthRevenue() {
  return useQuery({
    queryKey: queryKeys.assistente.monthRevenue,
    queryFn: getMonthRevenue,
  });
}

export function useAssistenteBills() {
  return useQuery({
    queryKey: queryKeys.bills.all,
    queryFn: getBills,
  });
}
