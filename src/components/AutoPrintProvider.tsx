import { createContext, useContext } from "react";
import { useDashboardTodayOrders } from "@/hooks/useOrders";
import { useAutoPrint } from "@/hooks/useAutoPrint";

interface AutoPrintContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

const AutoPrintContext = createContext<AutoPrintContextValue>({
  enabled: false,
  setEnabled: () => {},
});

export function AutoPrintProvider({ children }: { children: React.ReactNode }) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: orders } = useDashboardTodayOrders(startOfDay.toISOString());
  const value = useAutoPrint((orders || []) as any);
  return <AutoPrintContext.Provider value={value}>{children}</AutoPrintContext.Provider>;
}

export function useAutoPrintContext() {
  return useContext(AutoPrintContext);
}
