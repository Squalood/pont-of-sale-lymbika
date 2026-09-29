"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus } from "lucide-react";
import { VentaType, VentaItemType } from "@/types/venta";
import { getDevolucionesByVenta } from "@/api/getDevolucionesByVenta";
import { postDevolucion } from "@/api/postDevolucion";
import { toast } from "sonner";
import { runOrQueue } from "@/lib/pending-stock";
import { patchVentaEstado } from "@/api/patchVentaEstado";
import { printReturnReceipt } from "@/lib/print-return-receipt";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";

interface ReturnDialogProps {
  venta: VentaType;
  open: boolean;
  onClose: () => void;
  onReturnComplete?: (returnedItems: { productId: number; quantity: number }[]) => void;
}

type Step = "items" | "details" | "confirm";

interface ReturnRow extends VentaItemType {
  alreadyReturned: number;
  maxReturnable: number;
  returnQty: number;
}

export function ReturnDialog({ venta, open, onClose, onReturnComplete }: ReturnDialogProps) {
  const { caja, refetchEfectivo } = useCaja();
  const [step, setStep] = useState<Step>("items");
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState<"Efectivo" | "Tarjeta">("Efectivo");
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setStep("items");
    setMotivo("");
    setMetodo("Efectivo");
    setError(null);
    setLoadingItems(true);

    (async () => {
      try {
        const prevDevoluciones = await getDevolucionesByVenta(venta.id);

        const returnedMap: Record<number, number> = {};
        for (const dev of prevDevoluciones) {
          for (const item of dev.items) {
            const pid = item.product?.id ?? 0;
            returnedMap[pid] = (returnedMap[pid] ?? 0) + item.quantity;
          }
        }

        const initialRows: ReturnRow[] = venta.venta.map((item) => {
          const pid = item.product?.id ?? 0;
          const alreadyReturned = returnedMap[pid] ?? 0;
          const maxReturnable = Math.max(0, item.quantity - alreadyReturned);
          return { ...item, alreadyReturned, maxReturnable, returnQty: 0 };
        });

        setRows(initialRows);
      } catch {
        setError("Error al cargar devoluciones previas");
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [open, venta.id, venta.venta]);

  function adjustQty(index: number, delta: number) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = Math.min(row.maxReturnable, Math.max(0, row.returnQty + delta));
        return { ...row, returnQty: next };
      })
    );
  }

  const selectedRows = rows.filter((r) => r.returnQty > 0);
  const montoReembolso = selectedRows.reduce((sum, r) => sum + r.unitPrice * r.returnQty, 0);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const operador = getUser()?.username ?? "";

      // La devolución entra a la farmacia donde se hace (la caja abierta) o, si se registra
      // desde un admin sin caja, a la farmacia que hizo la venta.
      const pharmacyDocId =
        caja?.pharmacy?.documentId ?? venta.pharmacies?.[0]?.documentId;

      // 1. Create devolucion in Strapi
      const { id: devolucionId, documentId: devolucionDocId } = await postDevolucion({
        fecha: new Date().toISOString(),
        motivo,
        metodo,
        montoReembolso,
        estado: "Completada",
        operador,
        items: selectedRows.map((r) => {
          // La línea de la venta ya trae su producto poblado (getVentas): no hace falta el catálogo.
          const productDocId = r.product?.documentId ?? null;
          return {
            product: productDocId,
            productName: r.productName,
            quantity: r.returnQty,
            unitPrice: r.unitPrice,
            totalLine: r.unitPrice * r.returnQty,
          };
        }),
        venta: venta.documentId,
        pharmacies: pharmacyDocId,
      });

      // 2. Mark venta as cancelada only if all items are fully returned
      const isFullReturn = rows.every((r) => r.alreadyReturned + r.returnQty === r.quantity);
      if (isFullReturn) {
        await patchVentaEstado(venta.documentId, "cancelada");
      }

      // 3. Regresar el stock en el servidor (farmacia de la devolución; bodega en modo legacy).
      //    El backend agrega por producto y no aplica dos veces la misma devolución.
      const stock = await runOrQueue("return", devolucionDocId, `Devolución #${String(devolucionId).padStart(5, "0")}`);
      if (!stock) toast.warning("Devolución registrada. El regreso de inventario quedó pendiente y se reintentará.");

      const returnedMap = new Map<number, number>();
      for (const row of selectedRows) {
        if (row.product) returnedMap.set(row.product.id, (returnedMap.get(row.product.id) ?? 0) + row.returnQty);
      }
      const returnedItems = [...returnedMap].map(([productId, quantity]) => ({ productId, quantity }));

      // 4. Update local state
      onReturnComplete?.(returnedItems);
      if (metodo === "Efectivo") refetchEfectivo();

      // 5. Print receipt
      printReturnReceipt({
        devolucionId,
        ventaId: venta.id,
        operador,
        items: selectedRows.map((r) => ({
          productName: r.productName,
          quantity: r.returnQty,
          unitPrice: r.unitPrice,
          totalLine: r.unitPrice * r.returnQty,
        })),
        montoReembolso,
        metodo,
        motivo,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la devolución");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Devolución{" "}
            <span className="text-muted-foreground font-normal">
              #{String(venta.id).padStart(5, "0")}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step: items */}
        {step === "items" && (
          <>
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="min-w-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selecciona los artículos y la cantidad a devolver.
                </p>
                <div className="divide-y rounded-lg border overflow-hidden max-h-72 overflow-y-auto">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="truncate text-sm font-medium">{row.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Comprado: {row.quantity}
                          {row.alreadyReturned > 0 && (
                            <> · Ya devuelto: {row.alreadyReturned}</>
                          )}
                          {row.maxReturnable === 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">Agotado</Badge>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => adjustQty(i, -1)}
                          disabled={row.returnQty === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{row.returnQty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => adjustQty(i, 1)}
                          disabled={row.returnQty >= row.maxReturnable}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => setStep("details")}
                disabled={selectedRows.length === 0 || loadingItems}
              >
                Siguiente
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: details */}
        {step === "details" && (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo de devolución</Label>
                <Textarea
                  id="motivo"
                  placeholder="Describe el motivo..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Método de reembolso</Label>
                <Select value={metodo} onValueChange={(v) => setMetodo(v as "Efectivo" | "Tarjeta")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("items")}>Atrás</Button>
              <Button onClick={() => setStep("confirm")} disabled={!motivo.trim()}>
                Siguiente
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: confirm */}
        {step === "confirm" && (
          <>
            <div className="space-y-4">
              <div className="divide-y rounded-lg border text-sm">
                {selectedRows.map((row, i) => (
                  <div key={i} className="flex justify-between px-3 py-2">
                    <span className="truncate max-w-48">{row.productName}</span>
                    <span className="text-muted-foreground">
                      x{row.returnQty} · ${(row.unitPrice * row.returnQty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Método</span>
                  <span>{metodo}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Reembolso</span>
                  <span>${montoReembolso.toFixed(2)}</span>
                </div>
              </div>

              {motivo && (
                <p className="text-xs text-muted-foreground italic">"{motivo}"</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("details")} disabled={loading}>
                Atrás
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar devolución
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
