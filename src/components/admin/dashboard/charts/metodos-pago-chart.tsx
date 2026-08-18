"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SinDatos } from "@/components/admin/dashboard/charts/sin-datos";
import { fmtMoney } from "@/lib/format";
import type { PagosResumen } from "@/lib/ventas-aggregate";

const PAGO_SLOTS = [
  { key: "efectivoMXN", label: "Efectivo MXN", color: "var(--chart-1)" },
  { key: "tarjeta", label: "Tarjeta", color: "var(--chart-3)" },
  { key: "transferencia", label: "Transferencia", color: "var(--chart-4)" },
] as const;

const pagosConfig = Object.fromEntries(
  PAGO_SLOTS.map((s) => [s.key, { label: s.label, color: s.color }])
) satisfies ChartConfig;

interface MetodosPagoChartProps {
  pagos: PagosResumen;
  className?: string;
}

export function MetodosPagoChart({ pagos, className }: MetodosPagoChartProps) {
  // El USD queda fuera de la barra: está en dólares sin convertir, y apilarlo con pesos
  // mentiría sobre las proporciones. Va como fila aparte en la lista.
  const enBarra = PAGO_SLOTS.map((s) => ({ ...s, value: pagos[s.key] }));
  const totalBarra = enBarra.reduce((sum, s) => sum + s.value, 0);

  const chartData = [
    {
      n: "pagos",
      efectivoMXN: pagos.efectivoMXN,
      tarjeta: pagos.tarjeta,
      transferencia: pagos.transferencia,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Métodos de pago</CardTitle>
        <CardDescription>
          Montos cobrados (la tarjeta incluye el recargo Health Pass del 3%).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalBarra <= 0 && pagos.efectivoUSD <= 0 ? (
          <SinDatos height={200} />
        ) : (
          <>
            <ChartContainer config={pagosConfig} className="aspect-auto h-[56px] w-full">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="n" hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <span className="flex flex-1 justify-between gap-3">
                          <span className="text-muted-foreground">
                            {pagosConfig[name as keyof typeof pagosConfig]?.label ?? name}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {fmtMoney(Number(value))}
                          </span>
                        </span>
                      )}
                    />
                  }
                />
                {PAGO_SLOTS.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="a"
                    fill={`var(--color-${s.key})`}
                    barSize={20}
                    radius={2}
                    // El trazo del color de la tarjeta es la separación entre segmentos.
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </BarChart>
            </ChartContainer>

            {/* Hace de leyenda, etiqueta directa y tabla a la vez: los montos se leen sin
                hover y sin depender de distinguir los colores. */}
            <ul className="space-y-2 text-sm">
              {enBarra.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: s.color }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
                  <span className="tabular-nums font-medium">{fmtMoney(s.value)}</span>
                  <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">
                    {totalBarra > 0 ? `${Math.round((s.value / totalBarra) * 100)}%` : "—"}
                  </span>
                </li>
              ))}
              {pagos.efectivoUSD > 0 && (
                <li className="flex items-center gap-2 border-t pt-2">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: "var(--chart-2)" }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">Efectivo USD</span>
                  <span className="tabular-nums font-medium">
                    US$
                    {pagos.efectivoUSD.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="w-12" />
                </li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
