import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { printCouponViaIframe, type Order } from "@/utils/printCoupon";

const STORAGE_ENABLED = "casegosto_auto_print_enabled";
const STORAGE_SEEN = "casegosto_auto_print_seen";

function todayKey() {
  return new Date().toLocaleDateString("en-CA"); // yyyy-MM-dd
}

function loadSeen(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SEEN) || "{}");
  } catch {
    return {};
  }
}

export function useAutoPrint(orders: Order[]) {
  const [enabled, setEnabled] = useState<boolean>(() => localStorage.getItem(STORAGE_ENABLED) !== "off");
  const initializedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_ENABLED, enabled ? "on" : "off");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const seenMap = loadSeen();
    const key = todayKey();
    const todaySeen = new Set(seenMap[key] || []);

    if (!initializedRef.current) {
      initializedRef.current = true;
      for (const o of orders || []) todaySeen.add(o.id);
      seenMap[key] = [...todaySeen];
      for (const k of Object.keys(seenMap)) if (k !== key) delete seenMap[k];
      localStorage.setItem(STORAGE_SEEN, JSON.stringify(seenMap));
      return;
    }

    for (const o of orders || []) {
      if (todaySeen.has(o.id)) continue;
      if (o.status === "cancelado") continue;
      if (!o.order_items?.length) continue;
      todaySeen.add(o.id);
      seenMap[key] = [...todaySeen];
      localStorage.setItem(STORAGE_SEEN, JSON.stringify(seenMap));
      printCouponViaIframe(o);
      toast.success(`🖨️ Pedido de ${o.customer_name} impresso automaticamente`);
    }
  }, [orders, enabled]);

  return { enabled, setEnabled };
}
