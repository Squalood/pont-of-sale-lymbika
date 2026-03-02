"use client";

import { useState } from "react";
import { Banknote, CreditCard, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashInput } from "@/components/cash-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "./ui/spinner";

type PaymentMethod = "efectivo" | "tarjeta";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  isMember?: boolean;
  onConfirm: (method: PaymentMethod, received: number) => Promise<void>;
}

export function CheckoutDialog({ open, onClose, total, isMember, onConfirm }: CheckoutDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amounts, setAmounts] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const CARD_SURCHARGE_RATE = 0.03;
  const cardSurcharge = isMember && method === "tarjeta" ? total * CARD_SURCHARGE_RATE : 0;
  const effectiveTotal = total + cardSurcharge;

  const receivedTotal = amounts.reduce((sum, a) => sum + a, 0);
  const canConfirm = method === "tarjeta" || receivedTotal >= effectiveTotal;

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm(method, method === "tarjeta" ? effectiveTotal : receivedTotal);
    } finally {
      setIsLoading(false);
      setMethod("efectivo");
      setAmounts([]);
    }
  }

  function handleClose() {
    onClose();
    setMethod("efectivo");
    setAmounts([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isLoading && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cobro</DialogTitle>
        </DialogHeader>

        {/* Total banner */}
        <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground">
          <p className="text-sm font-medium">Total</p>
          <p className="text-3xl font-bold tracking-tight">${effectiveTotal.toFixed(2)}</p>
        </div>

        {/* Member price badge */}
        {isMember && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            <BadgePercent className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Precio de MediClub aplicado</span>
          </div>
        )}

        {/* Card surcharge notice */}
        {isMember && method === "tarjeta" && (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal MediClub</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Cargo por tarjeta (3%)</span>
              <span>+${cardSurcharge.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Payment method */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={method === "efectivo" ? "default" : "outline"}
            className={
              method === "efectivo"
                ? "h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                : "h-12"
            }
            onClick={() => setMethod("efectivo")}
          >
            <Banknote className="mr-2 h-4 w-4" />
            Efectivo
          </Button>
          <Button
            variant={method === "tarjeta" ? "default" : "outline"}
            className={
              method === "tarjeta"
                ? "h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                : "h-12"
            }
            onClick={() => setMethod("tarjeta")}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Tarjeta
          </Button>
        </div>

        {/* Cash input */}
        {method === "efectivo" && (
          <CashInput
            total={effectiveTotal}
            amounts={amounts}
            onAmountsChange={setAmounts}
          />
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" className="h-12" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!canConfirm || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            {isLoading ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
