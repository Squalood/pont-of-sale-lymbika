import { Fragment } from "react";
import { BadgePercent, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MANAGEMENT_FEE_RATE, impuestoLabel, type PriceMode } from "@/lib/pricing";
import type { IvaBreakdown } from "@/lib/tax";
import { useMembershipName } from "@/api/getSiteConfig";
import { fmtMoney } from "@/lib/format";

interface CartTotalsProps {
  subtotal: number;
  total: number;
  ahorro: number;
  priceMode: PriceMode;
  /** Desglose cerrado en centavos: las filas suman exacto el total. */
  ivaBreakdown: IvaBreakdown;
  tipoCambio: number;
  onCheckout: () => void;
}

export function CartTotals({ subtotal, total, ahorro, priceMode, ivaBreakdown, tipoCambio, onCheckout }: CartTotalsProps) {
  const membershipName = useMembershipName();

  return (
    <div className="border-t px-4 py-3" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-1 text-sm">
        <div />
        <span className="text-right text-xs font-semibold text-muted-foreground">MXN</span>
        <span className="text-right text-xs font-semibold text-green-600">USD</span>

        <span className="text-muted-foreground">Subtotal</span>
        <span className="text-right tabular-nums">{fmtMoney(subtotal)}</span>
        <span className="text-right tabular-nums text-green-600">{fmtMoney(subtotal / tipoCambio)}</span>

        {ivaBreakdown.rows.map((row) => {
          const amount = row.amountCents / 100;
          return (
            <Fragment key={row.impuesto}>
              <span className="text-muted-foreground">{impuestoLabel(row.impuesto)} incl.</span>
              <span className="text-right tabular-nums">{fmtMoney(amount)}</span>
              <span className="text-right tabular-nums text-green-600">{fmtMoney(amount / tipoCambio)}</span>
            </Fragment>
          );
        })}

        {priceMode === "member" && ahorro > 0 && (
          <>
            <span className="flex items-center gap-1 text-emerald-600">
              <BadgePercent className="h-3 w-3" />
              Ahorro {membershipName}
            </span>
            <span className="text-right tabular-nums text-emerald-600">-{fmtMoney(ahorro)}</span>
            <span className="text-right tabular-nums text-emerald-600">-{fmtMoney(ahorro / tipoCambio)}</span>
          </>
        )}

        <div className="col-span-3 my-0.5 border-t" />

        <span className="text-base font-bold">Total</span>
        <span className="text-right text-base font-bold tabular-nums">{fmtMoney(total)}</span>
        <span className="text-right text-base font-bold tabular-nums text-green-600">{fmtMoney(total / tipoCambio)}</span>
      </div>

      <Button
        className="mt-3 h-12 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90"
        onClick={(e) => { e.stopPropagation(); onCheckout(); }}
      >
        Cobrar — {fmtMoney(total)}
      </Button>
    </div>
  );
}
