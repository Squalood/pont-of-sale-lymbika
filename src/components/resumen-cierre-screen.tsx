"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
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

interface ResumenCierreScreenProps {
  data: CierreResumenData;
}

export function ResumenCierreScreen({ data }: ResumenCierreScreenProps) {
  const router = useRouter();
  const { setCierreResumen, pharmacyId } = useCaja();
  const [printLoading, setPrintLoading] = useState(false);

  function handleLogout() {
    clearAuth();
    setCierreResumen(null);
    router.push("/login");
  }

  async function handlePrint() {
    if (!pharmacyId) return;
    setPrintLoading(true);
    try {
      const reporte = await fetchReporteCierre(pharmacyId);
      printCierre(data, reporte);
    } finally {
      setPrintLoading(false);
    }
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold">Caja Cerrada</h1>
            {data.pharmacyName && (
              <p className="text-muted-foreground">{data.pharmacyName}</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-0.5">
            <StatRow label="Apertura" value={fmtTime(data.apertura)} />
            <StatRow label="Cierre" value={fmtTime(data.cierre)} />
            <StatRow label="Cerrado por" value={data.cerradoPor} />
            <StatRow label="Fondo inicial" value={`$${data.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
            <StatRow
              label="Ventas efectivo (neto)"
              value={`+$${data.ventasNetoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              valueClass="text-emerald-600"
            />
            {data.devolucionesMXN > 0 && (
              <StatRow
                label="Devoluciones"
                value={`-$${data.devolucionesMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                valueClass="text-destructive"
              />
            )}
          </div>

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
              esperado={data.expectedMXN}
              declarado={data.finalCashMXN}
              diff={data.diffMXN}
            />
            <DiffRow
              label="Dólares (USD)"
              esperado={data.expectedUSD}
              declarado={data.finalCashUSD}
              diff={data.diffUSD}
            />
            {data.expectedCard > 0 && (
              <DiffRow
                label="Tarjeta (MXN)"
                esperado={data.expectedCard}
                declarado={data.finalCard}
                diff={data.diffCard}
              />
            )}
            {data.expectedTransfe > 0 && (
              <DiffRow
                label="Transferencia (MXN)"
                esperado={data.expectedTransfe}
                declarado={data.finalTransfe}
                diff={data.diffTransfe}
              />
            )}
          </div>

          <Button className="w-full" variant="outline" onClick={handlePrint} disabled={printLoading}>
            <Printer className="mr-2 h-4 w-4" />
            {printLoading ? "Generando reporte..." : "Imprimir / Guardar PDF"}
          </Button>

          <Button className="w-full" variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
