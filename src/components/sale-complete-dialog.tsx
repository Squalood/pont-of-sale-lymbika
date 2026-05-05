"use client";

import { CheckCircle2, CreditCard, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MetodoPago } from "@/types/venta";

interface SaleCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  paymentMethod: MetodoPago;
  change: number;
  cardCharge?: number;
}

export function SaleCompleteDialog({ open, onClose, paymentMethod, change, cardCharge = 0 }: SaleCompleteDialogProps) {
  const showChange = paymentMethod === "efectivo" || paymentMethod === "mixto";
  const showCard = (paymentMethod === "tarjeta" || paymentMethod === "mixto") && cardCharge > 0;
  const showTransfe = paymentMethod === "transfe";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm text-center" showCloseButton={false} aria-describedby={undefined}>
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" strokeWidth={1.5} />
          <DialogTitle className="text-xl font-semibold">Venta Completada</DialogTitle>

          {showChange && (
            <div className="w-full rounded-lg bg-gray-50 border px-6 py-5">
              <p className="text-sm text-gray-500 mb-1">Cambio</p>
              <p className="text-5xl font-bold tracking-tight text-gray-900">
                ${change.toFixed(2)}
              </p>
            </div>
          )}

          {showCard && (
            <div className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-6 py-4 text-blue-700">
              <CreditCard className="h-6 w-6 shrink-0" />
              <p className="text-base font-medium">
                {paymentMethod === "mixto"
                  ? `Cobraste $${cardCharge.toFixed(2)} en terminal`
                  : "Cobrado en terminal"}
              </p>
            </div>
          )}

          {showTransfe && (
            <div className="flex w-full items-center justify-center gap-3 rounded-lg bg-purple-50 border border-purple-200 px-6 py-4 text-purple-700">
              <ArrowLeftRight className="h-6 w-6 shrink-0" />
              <p className="text-base font-medium">Cobrado por transferencia</p>
            </div>
          )}

          <Button
            className="mt-2 h-12 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90"
            onClick={onClose}
          >
            Nueva Venta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
