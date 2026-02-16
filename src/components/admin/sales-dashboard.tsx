"use client";

import { useMemo } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const cards = [
    {
      title: "Ventas de hoy",
      value: metrics.cantidadHoy.toString(),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total del día",
      value: `$${metrics.totalHoy.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total de la semana",
      value: `$${metrics.totalSemana.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Ticket promedio",
      value: `$${metrics.ticketPromedio.toFixed(2)}`,
      icon: Receipt,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
