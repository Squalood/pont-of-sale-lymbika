import { BadgePercent } from "lucide-react";
import type { PaymentMethod } from "./types";

interface MemberInfoProps {
  isMember: boolean;
  method: PaymentMethod;
  subtotal: number;
  cardBase: number;
  cardSurcharge: number;
}

export function MemberInfo({ isMember, method, subtotal, cardBase, cardSurcharge }: MemberInfoProps) {
  if (!isMember) return null;

  const showBreakdown = cardBase > 0 && (method === "tarjeta" || method === "mixto");

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
        <BadgePercent className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Precio de Health Pass aplicado</span>
      </div>

      {showBreakdown && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal Health Pass</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {method === "mixto" && (
            <div className="flex items-center justify-between text-sm">
              <span>Porción en tarjeta</span>
              <span>${cardBase.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span>Cargo por tarjeta (3%)</span>
            <span>+${cardSurcharge.toFixed(2)}</span>
          </div>
        </div>
      )}
    </>
  );
}
