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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { patchCaja } from "@/api/patchCaja";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import { CierreResumenData } from "@/types/cierre";

interface CierreCajaDialogProps {
  open: boolean;
  onClose: () => void;
}

type Step = "declaracion" | "confirmacion";

function DiffRow({ label, esperado, declarado }: { label: string; esperado: number; declarado: number }) {
  const diff = declarado - esperado;
  const diffColor = diff > 0 ? "text-emerald-600" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  const diffLabel = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);

  return (
    <div className="grid grid-cols-4 gap-2 text-sm py-1.5 border-b last:border-0">
      <span className="font-medium">{label}</span>
      <span className="text-right text-muted-foreground">${esperado.toFixed(2)}</span>
      <span className="text-right">${declarado.toFixed(2)}</span>
      <span className={`text-right font-medium ${diffColor}`}>{diffLabel}</span>
    </div>
  );
}

function CashInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          id={id}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="pl-7"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function CierreCajaDialog({ open, onClose }: CierreCajaDialogProps) {
  const { caja, efectivo, refetch, refetchEfectivo, setCierreResumen } = useCaja();
  const [step, setStep] = useState<Step>("declaracion");
  const [finalCashMXN, setFinalCashMXN] = useState("");
  const [finalCashUSD, setFinalCashUSD] = useState("");
  const [finalCard, setFinalCard] = useState("");
  const [finalTransfe, setFinalTransfe] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("declaracion");
    setFinalCashMXN("");
    setFinalCashUSD("");
    setFinalCard("");
    setFinalTransfe("");
    setError(null);
    refetchEfectivo();
  }, [open, refetchEfectivo]);

  if (!caja || !efectivo) return null;

  const mxnNum = parseFloat(finalCashMXN);
  const usdNum = parseFloat(finalCashUSD);
  const cardNum = parseFloat(finalCard);
  const transfeNum = parseFloat(finalTransfe);

  const hasCard = efectivo.ventasTarjeta > 0;
  const hasTransfe = efectivo.ventasTransfe > 0;

  const canNext =
    finalCashMXN !== "" && mxnNum >= 0 &&
    finalCashUSD !== "" && usdNum >= 0 &&
    (!hasCard || (finalCard !== "" && cardNum >= 0)) &&
    (!hasTransfe || (finalTransfe !== "" && transfeNum >= 0));

  async function handleConfirm() {
    if (!caja || !efectivo) return;
    setLoading(true);
    setError(null);
    try {
      const user = getUser();
      const closedAt = new Date().toISOString();
      const cerradoPor = user?.username ?? "desconocido";

      const diffCard = cardNum - efectivo.ventasTarjeta;
      const diffTransfe = transfeNum - efectivo.ventasTransfe;

      const resumen: CierreResumenData = {
        pharmacyName: caja.pharmacy?.nombre,
        pharmacyDireccion: caja.pharmacy?.direccion,
        pharmacyTelefono: caja.pharmacy?.contacto_tel,
        operador: caja.operador,
        tipoCambio: caja.tipoCambio,
        apertura: caja.fecha,
        cierre: closedAt,
        cerradoPor,
        fondoInicial: efectivo.fondoInicial,
        ventasNetoMXN: efectivo.ventasNetoMXN,
        devolucionesMXN: efectivo.devolucionesMXN,
        expectedMXN: efectivo.efectivoMXN,
        expectedUSD: efectivo.efectivoUSD,
        finalCashMXN: mxnNum,
        finalCashUSD: usdNum,
        diffMXN: mxnNum - efectivo.efectivoMXN,
        diffUSD: usdNum - efectivo.efectivoUSD,
        expectedCard: efectivo.ventasTarjeta,
        finalCard: cardNum,
        diffCard,
        expectedTransfe: efectivo.ventasTransfe,
        finalTransfe: transfeNum,
        diffTransfe,
      };

      await patchCaja(caja.documentId, {
        estado: "Cerrada",
        finalCashMXN: mxnNum,
        finalCashUSD: usdNum,
        expectedMXN: efectivo.efectivoMXN,
        expectedUSD: efectivo.efectivoUSD,
        diffMXN: resumen.diffMXN,
        diffUSD: resumen.diffUSD,
        expectedCard: efectivo.ventasTarjeta,
        finalCard: cardNum,
        diffCard,
        expectedTransfe: efectivo.ventasTransfe,
        finalTransfe: transfeNum,
        diffTransfe,
        closedAt,
        closedBy: cerradoPor,
      });

      setCierreResumen(resumen);
      refetch();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cerrar la caja");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Cierre de Caja
            {step === "confirmacion" && (
              <span className="text-muted-foreground font-normal text-base ml-2">— Confirmación</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "declaracion" && (
          <div className="space-y-5 py-1">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Resumen del día
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fondo inicial</span>
                <span>${efectivo.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas en efectivo (neto)</span>
                <span className="text-emerald-600">+${efectivo.ventasNetoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              {efectivo.devolucionesMXN > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devoluciones</span>
                  <span className="text-destructive">-${efectivo.devolucionesMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {hasCard && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas con tarjeta</span>
                  <span>${efectivo.ventasTarjeta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {hasTransfe && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas por transferencia</span>
                  <span>${efectivo.ventasTransfe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Esperado en caja (MXN)</span>
                <span>${efectivo.efectivoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              {efectivo.efectivoUSD > 0 && (
                <div className="flex justify-between font-medium">
                  <span>Esperado en caja (USD)</span>
                  <span>${efectivo.efectivoUSD.toFixed(2)} USD</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <CashInput id="final-mxn" label="Efectivo contado (MXN)" value={finalCashMXN} onChange={setFinalCashMXN} />
              <CashInput id="final-usd" label="Dólares contados (USD)" value={finalCashUSD} onChange={setFinalCashUSD} />
              {hasCard && (
                <CashInput id="final-card" label="Total reportado en terminal (MXN)" value={finalCard} onChange={setFinalCard} />
              )}
              {hasTransfe && (
                <CashInput id="final-transfe" label="Total recibido por transferencia (MXN)" value={finalTransfe} onChange={setFinalTransfe} />
              )}
            </div>
          </div>
        )}

        {step === "confirmacion" && (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
              <span></span>
              <span className="text-right">Esperado</span>
              <span className="text-right">Declarado</span>
              <span className="text-right">Diferencia</span>
            </div>
            <DiffRow label="Pesos (MXN)" esperado={efectivo.efectivoMXN} declarado={mxnNum} />
            <DiffRow label="Dólares (USD)" esperado={efectivo.efectivoUSD} declarado={usdNum} />
            {hasCard && <DiffRow label="Tarjeta (MXN)" esperado={efectivo.ventasTarjeta} declarado={cardNum} />}
            {hasTransfe && <DiffRow label="Transferencia (MXN)" esperado={efectivo.ventasTransfe} declarado={transfeNum} />}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {step === "declaracion" ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button disabled={!canNext} onClick={() => setStep("confirmacion")}>
                Siguiente
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("declaracion")} disabled={loading}>
                Atrás
              </Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  "Confirmar cierre"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
