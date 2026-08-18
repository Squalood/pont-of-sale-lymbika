"use client";

import { Download, DollarSign, Package, Receipt, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { MetodosPagoChart } from "@/components/admin/dashboard/charts/metodos-pago-chart";
import { VentasTrendChart } from "@/components/admin/dashboard/charts/ventas-trend-chart";
import type { DashboardData } from "@/lib/dashboard-aggregate";
import { fmtInt, fmtMoney } from "@/lib/format";

interface VentasSectionProps {
  data: DashboardData;
  onExport: () => void;
  onExportDetalle: () => void;
  /** El detalle necesita el catálogo para el costo y el IVA por línea. */
  detalleDisabled?: boolean;
}

export function VentasSection({
  data,
  onExport,
  onExportDetalle,
  detalleDisabled,
}: VentasSectionProps) {
  const vacio = data.ventasFiltradas.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ventas</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={vacio}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportDetalle}
            disabled={vacio || detalleDisabled}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV detalle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingresos" value={fmtMoney(data.ingresos)} icon={DollarSign} tone="green" />
        <KpiCard
          label="Ventas"
          value={fmtInt(data.pagos.numVentas)}
          icon={ShoppingBag}
          tone="blue"
        />
        <KpiCard
          label="Ticket promedio"
          value={fmtMoney(data.ticketPromedio)}
          icon={Receipt}
          tone="purple"
        />
        <KpiCard
          label="Artículos vendidos"
          value={fmtInt(data.articulos)}
          icon={Package}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <VentasTrendChart
          data={data.trend}
          total={data.ingresos}
          className="min-w-0 lg:col-span-2"
        />
        <MetodosPagoChart pagos={data.pagos} className="min-w-0" />
      </div>
    </section>
  );
}
