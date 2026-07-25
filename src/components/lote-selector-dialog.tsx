"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InventoryLotOnProduct, ProductType } from "@/types/product";
import { getSellableLots, SENTINEL_EXPIRATION } from "@/lib/lotes";
import { CalendarClock, Package } from "lucide-react";

interface LoteSelectorDialogProps {
  product: ProductType | null;
  open: boolean;
  onSelect: (lot: InventoryLotOnProduct) => void;
  onClose: () => void;
}

function caducidadLabel(expirationDate: string | null): string {
  if (!expirationDate || expirationDate >= SENTINEL_EXPIRATION) return "Sin caducidad";
  return `Caduca: ${expirationDate}`;
}

export function LoteSelectorDialog({ product, open, onSelect, onClose }: LoteSelectorDialogProps) {
  const lots = product ? getSellableLots(product) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elegir lote</DialogTitle>
          <DialogDescription>
            {product?.productName} — selecciona el lote del que sale esta línea.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {lots.map((lot) => (
            <button
              key={lot.documentId}
              type="button"
              onClick={() => onSelect(lot)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{lot.lotNumber}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {caducidadLabel(lot.expirationDate)}
                </p>
              </div>
              <span className="flex items-center gap-1 shrink-0 text-sm font-medium text-primary">
                <Package className="h-3.5 w-3.5" />
                {lot.currentAmount}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
