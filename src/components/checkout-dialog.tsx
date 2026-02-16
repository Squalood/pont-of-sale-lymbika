"use client";

import { useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashInput } from "@/components/cash-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PaymentMethod = "efectivo" | "tarjeta";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (method: PaymentMethod, received: number) => void;
}

export function CheckoutDialog({ open, onClose, total, onConfirm }: CheckoutDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amounts, setAmounts] = useState<number[]>([]);

  const receivedTotal = amounts.reduce((sum, a) => sum + a, 0);
  const canConfirm = method === "tarjeta" || receivedTotal >= total;

  function handleConfirm() {
    onConfirm(method, method === "tarjeta" ? total : receivedTotal);
    setMethod("efectivo");
    setAmounts([]);
  }

  function handleClose() {
    onClose();
    setMethod("efectivo");
    setAmounts([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cobro</DialogTitle>
        </DialogHeader>

        {/* Total banner */}
        <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground">
          <p className="text-sm font-medium">Total</p>
          <p className="text-3xl font-bold tracking-tight">${total.toFixed(2)}</p>
        </div>

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
            total={total}
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
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
