"use client";

import { useState } from "react";
import { Banknote, CreditCard, BadgePercent, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashInput, CashEntry } from "@/components/cash-input";
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
  tipoCambio: number;
  isMember?: boolean;
  onConfirm: (
    method: PaymentMethod,
    received: number,
    recibidoUSD: number,
    tipoCambioUsado: number,
    nota: string
  ) => Promise<void>;
}

export function CheckoutDialog({ open, onClose, total, tipoCambio, isMember, onConfirm }: CheckoutDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [nota, setNota] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const CARD_SURCHARGE_RATE = 0.03;
  const cardSurcharge = isMember && method === "tarjeta" ? total * CARD_SURCHARGE_RATE : 0;
  const effectiveTotal = total + cardSurcharge;

  const receivedTotal = entries.reduce(
    (sum, e) => sum + (e.currency === "MXN" ? e.amount : e.amount * tipoCambio),
    0
  );
  const canConfirm = method === "tarjeta" || receivedTotal >= effectiveTotal;

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const recibidoUSD = entries.reduce(
        (sum, e) => sum + (e.currency === "USD" ? e.amount : 0),
        0
      );
      const received = method === "tarjeta" ? effectiveTotal : receivedTotal;
      await onConfirm(method, received, recibidoUSD, tipoCambio, nota);
    } finally {
      setIsLoading(false);
      setMethod("efectivo");
      setEntries([]);
      setNota("");
    }
  }

  function handleClose() {
    onClose();
    setMethod("efectivo");
    setEntries([]);
    setNota("");
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
            onClick={() => { setMethod("efectivo"); setEntries([]); }}
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
            onClick={() => { setMethod("tarjeta"); setEntries([]); }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Tarjeta
          </Button>
        </div>

        {/* Cash input */}
        {method === "efectivo" && (
          <CashInput
            total={effectiveTotal}
            tipoCambio={tipoCambio}
            entries={entries}
            onEntriesChange={setEntries}
          />
        )}

        {/* Nota */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <NotebookPen className="h-3.5 w-3.5" />
            Nota (opcional)
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. nombre del paciente, indicaciones..."
            rows={2}
            className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

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
            {isLoading ? <Spinner data-icon="inline-start" /> : null}
            {isLoading ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
