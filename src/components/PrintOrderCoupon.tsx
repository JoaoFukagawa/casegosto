import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { printCouponViaWindow, type Order } from "@/utils/printCoupon";

export default function PrintOrderCoupon({ order }: { order: Order }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title="Imprimir cupom"
      onClick={() => printCouponViaWindow(order)}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
