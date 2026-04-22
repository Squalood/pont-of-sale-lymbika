"use client";

import { useState } from "react";
import { CashInput, CashEntry } from "@/components/cash-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TotalBanner } from "@/components/checkout/total-banner";
import { MemberInfo } from "@/components/checkout/member-info";
import { NoteInput } from "@/components/checkout/note-input";
import { CheckoutActions } from "@/components/checkout/checkout-actions";
import type { PaymentMethod } from "@/components/checkout/types";

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
    nota: string,
    montoTarjeta: number,
    montoTransfe: number
  ) => Promise<void>;
}

export function CheckoutDialog({ open, onClose, total, tipoCambio, isMember, onConfirm }: CheckoutDialogProps) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [nota, setNota] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const CARD_SURCHARGE_RATE = 0.03;

  const tarjetaFromEntries = entries.reduce(
    (sum, e) => sum + (e.currency === "tarjeta" ? e.amount : 0),
    0
  );
  const transfeFromEntries = entries.reduce(
    (sum, e) => sum + (e.currency === "transfe" ? e.amount : 0),
    0
  );
  const cashFromEntries = entries.reduce(
    (sum, e) =>
      sum + (e.currency === "MXN" ? e.amount : e.currency === "USD" ? e.amount * tipoCambio : 0),
    0
  );
  const usdFromEntries = entries.reduce(
    (sum, e) => sum + (e.currency === "USD" ? e.amount : 0),
    0
  );
  const receivedTotal = cashFromEntries + tarjetaFromEntries + transfeFromEntries;

  const hasCash = entries.some((e) => e.currency === "MXN" || e.currency === "USD");
  const hasCard = entries.some((e) => e.currency === "tarjeta");
  const hasTransfe = entries.some((e) => e.currency === "transfe");
  const kindCount = [hasCash, hasCard, hasTransfe].filter(Boolean).length;
  const method: PaymentMethod =
    kindCount > 1
      ? "mixto"
      : hasCard
        ? "tarjeta"
        : hasTransfe
          ? "transfe"
          : "efectivo";

  const cardBase = tarjetaFromEntries;
  const transfeBase = transfeFromEntries;
  const cardSurcharge = isMember && cardBase > 0 ? cardBase * CARD_SURCHARGE_RATE : 0;
  const effectiveTotal = total + cardSurcharge;

  const canConfirm = entries.length > 0 && receivedTotal >= total;

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
              ? cashFromEntries
              : receivedTotal;
      await onConfirm(method, received, usdFromEntries, tipoCambio, nota, cardBase, transfeBase);
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
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cobro</DialogTitle>
        </DialogHeader>

        <TotalBanner total={effectiveTotal} />

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
