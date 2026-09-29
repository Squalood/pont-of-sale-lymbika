"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLotesAt, type LoteAt } from "@/api/getLotesAt";
import { newIdemKey, postStockCount, StockApiError, type StockLocation } from "@/api/posStock";

export interface CountTarget {
  productDocumentId: string;
  productName: string;
  /** Stock que marca hoy la ubicación. */
  stock: number;
}

interface StockCountDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  location: StockLocation;
  locationName: string;
  target: CountTarget | null;
}

const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

/**
 * "Cuadrar": conteo físico de un producto en una ubicación. Se cuenta cada lote en el anaquel
 * (y lo que no se pueda identificar va como "sin lote"). Al guardar, cada lote queda con lo
 * contado y el stock queda en la suma: stock y lotes coinciden siempre después de cuadrar. La
 * diferencia contra lo que marcaba el sistema se aplica al total, porque es una corrección real.
 */
export function StockCountDialog({ open, onClose, onDone, location, locationName, target }: StockCountDialogProps) {
  const [lots, setLots] = useState<LoteAt[] | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [unlotted, setUnlotted] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idemKey = useRef(newIdemKey());

  useEffect(() => {
    if (!open || !target) return;
    let alive = true;
    setLots(null);
    setError(null);
    idemKey.current = newIdemKey();
    getLotesAt(target.productDocumentId, location, { includeEmpty: true })
      .then((l) => {
        if (!alive) return;
        setLots(l);
        setCounts(Object.fromEntries(l.map((x) => [x.documentId, String(x.currentAmount)])));
        const enLotes = l.reduce((s, x) => s + x.currentAmount, 0);
        setUnlotted(String(Math.max(0, target.stock - enLotes)));
      })
      .catch(() => {
        if (!alive) return;
        setLots([]);
        setError("No se pudieron cargar los lotes");
      });
    return () => {
      alive = false;
    };
  }, [open, target, location]);

  const contadoLotes = (lots ?? []).reduce((s, l) => s + Number(counts[l.documentId] || 0), 0);
  const sinLote = Number(unlotted || 0);
  const nuevoStock = contadoLotes + sinLote;
  const diferencia = target ? nuevoStock - target.stock : 0;
  const lotesSinCambio = (lots ?? []).every((l) => Number(counts[l.documentId] || 0) === l.currentAmount);
  const sinCambios = diferencia === 0 && lotesSinCambio;

  async function handleSave() {
    if (!target || !lots) return;
    setLoading(true);
    setError(null);
    try {
      await postStockCount({
        productDocumentId: target.productDocumentId,
        location,
        lots: lots.map((l) => ({ lotDocumentId: l.documentId, amount: Number(counts[l.documentId] || 0) })),
        unlotted: sinLote,
        reason: "Conteo físico (cuadrar)",
        idemKey: idemKey.current,
      });
      toast.success(`${target.productName}: cuadrado`, {
        description: `${locationName} queda en ${nuevoStock}${diferencia !== 0 ? ` (el total ${diferencia > 0 ? "sube" : "baja"} ${Math.abs(diferencia)})` : ""}`,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof StockApiError ? err.message : "No se pudo guardar el conteo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Cuadrar · {locationName}</DialogTitle>
        </DialogHeader>

        {target && (
          <div className="min-w-0 space-y-4 text-sm">
            <div>
              <p className="truncate font-medium" title={target.productName}>{target.productName}</p>
              <p className="text-xs text-muted-foreground">
                Cuenta lo que hay físicamente en {locationName}. Cada lote quedará con lo que cuentes y
                el stock con la suma.
              </p>
            </div>

            {lots === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>Lote</span>
                  <span className="w-16 text-right">Sistema</span>
                  <span className="w-20 text-center">Contado</span>
                </div>
                {lots.map((l) => (
                  <div key={l.documentId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {l.lotNumber ?? "Sin número"}
                      {l.expirationDate && <span className="text-xs text-muted-foreground"> · cad. {l.expirationDate}</span>}
                    </span>
                    <span className="w-16 text-right text-muted-foreground">{l.currentAmount}</span>
                    <Input
                      className="h-8 w-20 text-center"
                      inputMode="numeric"
                      value={counts[l.documentId] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [l.documentId]: onlyDigits(e.target.value) }))}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Sin lote / sin identificar</span>
                  <span className="w-16" />
                  <Input
                    className="h-8 w-20 text-center"
                    inputMode="numeric"
                    value={unlotted}
                    onChange={(e) => setUnlotted(onlyDigits(e.target.value))}
                  />
                </div>
              </div>
            )}

            {lots !== null && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <div className="flex justify-between">
                  <span>Stock de {locationName}</span>
                  <span className="font-semibold">
                    {target.stock} → {nuevoStock}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {diferencia === 0
                    ? "El total no cambia."
                    : `El total ${diferencia > 0 ? "sube" : "baja"} ${Math.abs(diferencia)}.`}
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || lots === null || sinCambios}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar conteo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
