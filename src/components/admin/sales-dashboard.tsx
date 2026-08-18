"use client";

import { useMemo } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Receipt } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { VentaType } from "@/types/venta";

interface SalesDashboardProps {
  ventas: VentaType[];
}

export function SalesDashboard({ ventas }: SalesDashboardProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ventasHoy = ventas.filter(
      (v) => new Date(v.fecha) >= today && v.estado === "completada"
    );
    const ventasSemana = ventas.filter(
      (v) => new Date(v.fecha) >= weekAgo && v.estado === "completada"
    );

    const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
    const totalSemana = ventasSemana.reduce((sum, v) => sum + v.total, 0);
    const ticketPromedio =
      ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0;

    return {
      cantidadHoy: ventasHoy.length,
      totalHoy,
      totalSemana,
      ticketPromedio,
    };
  }, [ventas]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Ventas de hoy"
        value={metrics.cantidadHoy.toString()}
        icon={ShoppingBag}
        tone="blue"
      />
      <KpiCard
        label="Total del día"
        value={`$${metrics.totalHoy.toFixed(2)}`}
        icon={DollarSign}
        tone="green"
      />
      <KpiCard
        label="Total de la semana"
        value={`$${metrics.totalSemana.toFixed(2)}`}
        icon={TrendingUp}
        tone="purple"
      />
      <KpiCard
        label="Ticket promedio"
        value={`$${metrics.ticketPromedio.toFixed(2)}`}
        icon={Receipt}
        tone="amber"
      />
    </div>
  );
}
