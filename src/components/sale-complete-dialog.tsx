"use client";

import { CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type PaymentMethod = "efectivo" | "tarjeta";

interface SaleCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod;
  change: number;
}

export function SaleCompleteDialog({ open, onClose, paymentMethod, change }: SaleCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" strokeWidth={1.5} />
          <DialogTitle className="text-xl font-semibold">Venta Completada</DialogTitle>

          {paymentMethod === "efectivo" ? (
            <div className="w-full rounded-lg bg-gray-50 border px-6 py-5">
              <p className="text-sm text-gray-500 mb-1">Cambio</p>
              <p className="text-5xl font-bold tracking-tight text-gray-900">
                ${change.toFixed(2)}
              </p>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-6 py-5 text-blue-700">
              <CreditCard className="h-6 w-6 shrink-0" />
              <p className="text-base font-medium">Cobrado en terminal</p>
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
