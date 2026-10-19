"use client";

import { Boxes, Download, Scale, ShoppingCart, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { TopProductosChart } from "@/components/admin/dashboard/charts/top-productos-chart";
import { VentasVsComprasChart } from "@/components/admin/dashboard/charts/ventas-vs-compras-chart";
import type { DashboardData } from "@/lib/dashboard-aggregate";
import { fmtInt, fmtMoney } from "@/lib/format";

interface ComprasSectionProps {
  data: DashboardData;
  /** Un fallo de compras degrada solo esta sección; ventas sigue en pie. */
  comprasError?: string | null;
  /** Nombre de la sucursal filtrada, para avisar que las compras no se acotan. */
  sucursal?: string;
  onExport: () => void;
  onExportPorProducto: () => void;
}

export function ComprasSection({
  data,
  comprasError,
  sucursal,
  onExport,
  onExportPorProducto,
}: ComprasSectionProps) {
  const vacio = data.comprasRango.length === 0;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Compras</h2>
          {sucursal && (
            <Badge variant="outline" className="font-normal">
              Todas las farmacias
            </Badge>
          )}
        </div>
        {/* Mismo par que en Ventas: una fila por documento, o una por mercancía. */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={vacio}
            title="Una fila por compra, con el total y el proveedor"
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV por compra
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPorProducto}
            disabled={vacio}
            title="Una fila por renglón recibido, con lote, caducidad y costo unitario"
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV por producto comprado
          </Button>
        </div>
      </div>

      {sucursal && (
        <p className="text-xs text-muted-foreground">
          Las compras se registran a nivel central y no se filtran por sucursal.
        </p>
      )}

      {comprasError ? (
        <p className="text-sm text-destructive">{comprasError}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Egresos"
            value={fmtMoney(data.egresos)}
            icon={TrendingDown}
            tone="rose"
            hint={data.sinCosto > 0 ? `${data.sinCosto} sin costo registrado` : undefined}
          />
          <KpiCard
            label="Compras"
            value={fmtInt(data.comprasRango.length)}
            icon={ShoppingCart}
            tone="blue"
          />
          <KpiCard
            label="Unidades ingresadas"
            value={fmtInt(data.unidadesCompradas)}
            icon={Boxes}
            tone="amber"
          />
          <KpiCard
            label="Balance"
            value={fmtMoney(data.balance)}
            icon={Scale}
            tone={data.balance >= 0 ? "green" : "rose"}
            hint="Ingresos − egresos"
          />
        </div>
      )}

      {/* Top productos es una métrica de ventas, pero vive en esta fila por layout: cierra
          la página con dos gráficas del mismo alto. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopProductosChart productos={data.top} className="min-w-0" />
        <VentasVsComprasChart
          data={data.trend}
          excluidas={comprasError ? 0 : data.sinCosto}
          scopeNote={
            comprasError
              ? "Compras no disponibles."
              : sucursal
                ? `Ventas de ${sucursal} · Compras de todas las farmacias.`
                : undefined
          }
          className="min-w-0"
        />
      </div>
    </section>
  );
}
