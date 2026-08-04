"use client";

import { useState } from "react";
import { CashInput } from "@/components/cash-input";
import { computeCharge, type CashEntry } from "@/lib/checkout-math";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TotalBanner } from "@/components/checkout/total-banner";
import { MemberInfo } from "@/components/checkout/member-info";
import { ProveedorInfo } from "@/components/checkout/proveedor-info";
import { NoteInput } from "@/components/checkout/note-input";
import { CheckoutActions } from "@/components/checkout/checkout-actions";
import type { PaymentMethod } from "@/components/checkout/types";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  tipoCambio: number;
  isMember?: boolean;
  /** Mercancía a precio de proveedor, antes del fee. */
  feeBase?: number;
  /** Management fee ya incluido en `total`. 0 cuando la tarifa no es de proveedor. */
  managementFee?: number;
  onConfirm: (
    method: PaymentMethod,
    received: number,
    recibidoUSD: number,
    tipoCambioUsado: number,
    nota: string,
    montoTarjeta: number,
    montoTransfe: number
  ) => Promise<void>;
}

export function CheckoutDialog({ open, onClose, total, tipoCambio, isMember, feeBase = 0, managementFee = 0, onConfirm }: CheckoutDialogProps) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [nota, setNota] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const charge = computeCharge(entries, total, !!isMember, tipoCambio);
  const { method, cardBase, transfeBase, cardSurcharge, effectiveTotal, receivedTotal } = charge;

  const canConfirm = entries.length > 0 && charge.isCovered;

  function resetState() {
    setEntries([]);
    setNota("");
  }

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const received =
        method === "tarjeta"
          ? effectiveTotal
          : method === "transfe"
            ? total
            : method === "mixto"
              ? charge.cash
              : receivedTotal;
      await onConfirm(method, received, charge.usd, tipoCambio, nota, cardBase, transfeBase);
    } finally {
      setIsLoading(false);
      resetState();
    }
  }

  function handleClose() {
    onClose();
    resetState();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isLoading && handleClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl">Cobro</DialogTitle>
        </DialogHeader>

        <TotalBanner total={effectiveTotal} />

        <ProveedorInfo feeBase={feeBase} managementFee={managementFee} />

        <MemberInfo
          isMember={!!isMember}
          method={method}
          subtotal={total}
          cardBase={cardBase}
          cardSurcharge={cardSurcharge}
        />

        <CashInput
          total={total}
          tipoCambio={tipoCambio}
          entries={entries}
          onEntriesChange={setEntries}
          allowTarjeta
          isMember={!!isMember}
        />

        <NoteInput value={nota} onChange={setNota} />

        <CheckoutActions
          onCancel={handleClose}
          onConfirm={handleConfirm}
          canConfirm={canConfirm}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
