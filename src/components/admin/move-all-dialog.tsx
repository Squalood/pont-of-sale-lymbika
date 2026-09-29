"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { newIdemKey, postMoveAll, previewMoveAll, StockApiError, type MoveAllPreview } from "@/api/posStock";
import type { PharmacyType } from "@/types/pharmacy";

interface MoveAllDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  pharmacies: PharmacyType[];
  defaultPharmacy?: string;
}

const fmt = (n: number) => n.toLocaleString("es-MX");
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido");

/**
 * "Pasar toda la bodega a una farmacia": para cuando toda la mercancía está físicamente en una
 * farmacia. Mueve el stock y todos los lotes de la bodega a esa farmacia; el total no cambia.
 * Primero muestra la vista previa; al confirmar va por tandas (el servidor procesa unos cuantos
 * productos por transacción) hasta que la bodega queda vacía.
 */
export function MoveAllDialog({ open, onClose, onDone, pharmacies, defaultPharmacy }: MoveAllDialogProps) {
  const activas = pharmacies.filter((p) => p.estado !== "inactivo");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<MoveAllPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ products: number; units: number; lots: number; sold: number } | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!open) return;
    setTo(defaultPharmacy && activas.some((p) => p.documentId === defaultPharmacy) ? defaultPharmacy : activas[0]?.documentId ?? "");
    setFinished(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !to) return;
    let alive = true;
    setPreview(null);
    setLoadingPreview(true);
    setError(null);
    previewMoveAll(to)
      .then((p) => alive && setPreview(p))
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoadingPreview(false));
    return () => {
      alive = false;
    };
  }, [open, to]);

  async function run() {
    if (!preview) return;
    setRunning(true);
    setError(null);
    cancelled.current = false;
    const total = preview.products;
    const acc = { products: 0, units: 0, lots: 0, sold: 0 };
    setProgress({ done: 0, total });
    try {
      let remaining = total;
      while (remaining > 0 && !cancelled.current) {
        // Una llave por tanda; si la red falla se reintenta con la misma y el servidor no la
        // aplica dos veces.
        const key = newIdemKey();
        let res: Awaited<ReturnType<typeof postMoveAll>> | null = null;
        for (let intento = 1; !res; intento++) {
          try {
            res = await postMoveAll(to, key);
          } catch (e) {
            if (intento >= 3 || (e instanceof StockApiError && e.isPermanent)) throw e;
          }
        }
        if (!res.duplicate && res.result) {
          acc.products += res.result.products;
          acc.units += res.result.units;
          acc.lots += res.result.lotsMoved;
          acc.sold += res.result.soldApplied;
          if (res.result.products === 0) break; // nada que mover: evita un ciclo sin fin
        }
        remaining = res.remaining;
        setProgress({ done: Math.min(total, total - remaining), total });
      }
      setFinished(acc);
      toast.success(`Bodega pasada a ${preview.pharmacy.nombre}: ${fmt(acc.products)} productos`);
      onDone();
    } catch (e) {
      setError(`Se detuvo a medias (lo ya movido se queda así; puedes volver a correrlo): ${errMsg(e)}`);
      onDone();
    } finally {
      setRunning(false);
    }
  }

  function close() {
    if (running) {
      cancelled.current = true; // termina la tanda en curso y se detiene
      return;
    }
    onClose();
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pasar toda la bodega a una farmacia</DialogTitle>
          <DialogDescription>
            Para cuando toda la mercancía está físicamente en una farmacia. Todo el stock y los lotes de
            la bodega pasan a ella; el total de cada producto no cambia.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <Label>Farmacia destino</Label>
            <Select value={to} onValueChange={setTo} disabled={running || !!finished}>
              <SelectTrigger>
                <SelectValue placeholder="Elige una farmacia" />
              </SelectTrigger>
              <SelectContent>
                {activas.map((p) => (
                  <SelectItem key={p.documentId} value={p.documentId}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {finished ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              Listo: {fmt(finished.products)} productos, {fmt(finished.units)} unidades y {fmt(finished.lots)} lotes
              pasaron a {preview?.pharmacy.nombre}.
              {finished.sold > 0 && ` Se descontaron ${fmt(finished.sold)} unidades ya vendidas de sus lotes.`}
            </div>
          ) : loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando qué hay en la bodega…
            </div>
          ) : preview && preview.products === 0 ? (
            <p className="text-sm text-muted-foreground">La bodega ya está vacía: no hay nada que mover.</p>
          ) : preview ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Productos", value: preview.products },
                  { label: "Unidades", value: preview.units },
                  { label: "Lotes", value: preview.lots },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold">{fmt(c.value)}</p>
                  </div>
                ))}
              </div>
              {preview.soldUnlotted > 0 && (
                <p className="text-muted-foreground">
                  {preview.pharmacy.nombre} ya vendió {fmt(preview.soldUnlotted)} unidades sin lote (está en
                  negativo): se descuentan de los lotes que llegan, empezando por el que caduca antes.
                </p>
              )}
              {preview.negativeBodega > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-800">
                  {fmt(preview.negativeBodega)} producto(s) tienen la bodega en negativo; su stock no se mueve
                  (revísalos después en Todas las ubicaciones):
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {preview.negativeSamples.slice(0, 5).map((s) => (
                      <li key={s.productDocumentId} className="truncate">
                        {s.productName}: {s.bodega}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {running && (
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmt(progress.done)} de {fmt(progress.total)} productos… no cierres esta ventana.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          {finished ? (
            <Button onClick={onClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close}>
                {running ? "Detener" : "Cancelar"}
              </Button>
              <Button onClick={run} disabled={running || loadingPreview || !preview || preview.products === 0}>
                {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pasar {preview ? fmt(preview.products) : ""} productos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
