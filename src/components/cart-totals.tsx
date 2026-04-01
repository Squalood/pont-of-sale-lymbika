import { BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartTotalsProps {
  subtotal: number;
  iva: number;
  total: number;
  ahorro: number;
  isMember: boolean;
  tipoCambio: number;
  onCheckout: () => void;
}

export function CartTotals({ subtotal, iva, total, ahorro, isMember, tipoCambio, onCheckout }: CartTotalsProps) {
  return (
    <div className="border-t px-4 py-3" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-1 text-sm">
        <div />
        <span className="text-right text-xs font-semibold text-muted-foreground">MXN</span>
        <span className="text-right text-xs font-semibold text-green-600">USD</span>

        <span className="text-muted-foreground">Subtotal</span>
        <span className="text-right tabular-nums">${subtotal.toFixed(2)}</span>
        <span className="text-right tabular-nums text-green-600">${(subtotal / tipoCambio).toFixed(2)}</span>

        {iva > 0 && (
          <>
            <span className="text-muted-foreground">IVA (8%)</span>
            <span className="text-right tabular-nums">${iva.toFixed(2)}</span>
            <span className="text-right tabular-nums text-green-600">${(iva / tipoCambio).toFixed(2)}</span>
          </>
        )}

        {isMember && ahorro > 0 && (
          <>
            <span className="flex items-center gap-1 text-emerald-600">
              <BadgePercent className="h-3 w-3" />
              Ahorro Health Pass
            </span>
            <span className="text-right tabular-nums text-emerald-600">-${ahorro.toFixed(2)}</span>
            <span className="text-right tabular-nums text-emerald-600">-${(ahorro / tipoCambio).toFixed(2)}</span>
          </>
        )}

        <div className="col-span-3 my-0.5 border-t" />

        <span className="text-base font-bold">Total</span>
        <span className="text-right text-base font-bold tabular-nums">${total.toFixed(2)}</span>
        <span className="text-right text-base font-bold tabular-nums text-green-600">${(total / tipoCambio).toFixed(2)}</span>
      </div>

      <Button
        className="mt-3 h-12 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90"
        onClick={(e) => { e.stopPropagation(); onCheckout(); }}
      >
        Cobrar — ${total.toFixed(2)}
      </Button>
    </div>
  );
}
