"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { CajaType } from "@/types/caja";
import { CierreResumenData } from "@/types/cierre";
import { fetchReporteCierre } from "@/api/getReporteCierre";
import { printCierre } from "@/lib/print-cierre";

function StatRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function DiffRow({ label, esperado, declarado, diff }: { label: string; esperado: number; declarado: number; diff: number }) {
  const diffColor = diff > 0 ? "text-emerald-600" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  const diffLabel = diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`;

  return (
    <div className="grid grid-cols-4 gap-2 text-sm py-1.5 border-b last:border-0">
      <span className="font-medium">{label}</span>
      <span className="text-right text-muted-foreground">${esperado.toFixed(2)}</span>
      <span className="text-right">${declarado.toFixed(2)}</span>
      <span className={`text-right font-medium ${diffColor}`}>{diffLabel}</span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
}

interface CajaDetailDialogProps {
  caja: CajaType | null;
  open: boolean;
  onClose: () => void;
}

export function CajaDetailDialog({ caja, open, onClose }: CajaDetailDialogProps) {
  const [printLoading, setPrintLoading] = useState(false);

  if (!caja) return null;

  const isAbierta = caja.estado === "Abierta";
  const isAutoCierre = caja.closedBy === "auto-cierre";

  const hasCierre =
    !isAbierta &&
    caja.expectedMXN != null &&
    caja.finalCashMXN != null;

  async function handlePrint() {
    if (!caja || !caja.pharmacy?.documentId) return;
    setPrintLoading(true);
    try {
      const resumenData: CierreResumenData = {
        pharmacyName: caja.pharmacy?.nombre,
        apertura: caja.fecha,
        cierre: caja.closedAt ?? new Date().toISOString(),
        cerradoPor: caja.closedBy ?? "—",
        fondoInicial: caja.fondoInicial,
        ventasNetoMXN: 0,
        devolucionesMXN: 0,
        expectedMXN: caja.expectedMXN ?? 0,
        expectedUSD: caja.expectedUSD ?? 0,
        finalCashMXN: caja.finalCashMXN ?? 0,
        finalCashUSD: caja.finalCashUSD ?? 0,
        diffMXN: caja.diffMXN ?? 0,
        diffUSD: caja.diffUSD ?? 0,
        expectedCard: caja.expectedCard ?? 0,
        finalCard: caja.finalCard ?? 0,
        diffCard: caja.diffCard ?? 0,
        expectedTransfe: caja.expectedTransfe ?? 0,
        finalTransfe: caja.finalTransfe ?? 0,
        diffTransfe: caja.diffTransfe ?? 0,
      };
      const reporte = await fetchReporteCierre(caja.pharmacy.documentId, caja.fecha);
      printCierre(resumenData, reporte);
    } catch (e) {
      console.error("Error al generar PDF:", e);
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle de Caja
            <Badge variant={isAbierta ? "default" : "secondary"} className={isAbierta ? "bg-emerald-500 hover:bg-emerald-500" : ""}>
              {caja.estado}
            </Badge>
            {isAutoCierre && (
              <Badge variant="outline" className="text-xs">Auto-cierre</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Info básica */}
          <div className="rounded-lg border bg-card p-4 space-y-0.5">
            <StatRow label="Farmacia" value={caja.pharmacy?.nombre ?? "—"} />
            <StatRow label="Apertura" value={fmtTime(caja.fecha)} />
            <StatRow label="Operador" value={caja.operador} />
            <StatRow label="Fondo inicial" value={`$${fmt(caja.fondoInicial)}`} />
            <StatRow label="Tipo de cambio" value={`$${caja.tipoCambio.toFixed(2)} MXN/USD`} />
            {!isAbierta && caja.closedAt && (
              <StatRow label="Cierre" value={fmtTime(caja.closedAt)} />
            )}
            {!isAbierta && caja.closedBy && (
              <StatRow label="Cerrado por" value={caja.closedBy} />
            )}
          </div>

          {/* Corte de efectivo (solo cajas cerradas con datos) */}
          {hasCierre && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Corte de efectivo
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
                <span></span>
                <span className="text-right">Esperado</span>
                <span className="text-right">Declarado</span>
                <span className="text-right">Diferencia</span>
              </div>
              <DiffRow
                label="Pesos (MXN)"
                esperado={caja.expectedMXN!}
                declarado={caja.finalCashMXN!}
                diff={caja.diffMXN ?? 0}
              />
              <DiffRow
                label="Dólares (USD)"
                esperado={caja.expectedUSD ?? 0}
                declarado={caja.finalCashUSD ?? 0}
                diff={caja.diffUSD ?? 0}
              />
              {(caja.expectedCard ?? 0) > 0 && (
                <DiffRow
                  label="Tarjeta (MXN)"
                  esperado={caja.expectedCard!}
                  declarado={caja.finalCard ?? 0}
                  diff={caja.diffCard ?? 0}
                />
              )}
              {(caja.expectedTransfe ?? 0) > 0 && (
                <DiffRow
                  label="Transferencia (MXN)"
                  esperado={caja.expectedTransfe!}
                  declarado={caja.finalTransfe ?? 0}
                  diff={caja.diffTransfe ?? 0}
                />
              )}
            </div>
          )}

          {!isAbierta && !hasCierre && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sin datos de corte registrados
            </p>
          )}
        </div>

        {hasCierre && (
          <DialogFooter>
            <Button onClick={handlePrint} disabled={printLoading} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              {printLoading ? "Generando..." : "Imprimir PDF"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
