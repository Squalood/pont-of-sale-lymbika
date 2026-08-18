"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { fmtCompact, fmtMoney } from "@/lib/format";
import type { TrendPoint } from "@/lib/ventas-aggregate";

/* El color sigue a la entidad, nunca al ranking: ventas siempre chart-1, para que la
   vista no se repinte al cambiar de filtro. */
const trendConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface VentasTrendChartProps {
  data: TrendPoint[];
  total: number;
  className?: string;
}

export function VentasTrendChart({ data, total, className }: VentasTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tendencia de ventas</CardTitle>
        {/* El total va en el encabezado para que la cifra se lea sin hacer hover. */}
        <CardDescription>
          <span className="text-base font-semibold text-foreground">{fmtMoney(total)}</span>{" "}
          en el período
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <SinDatos height={240} />
        ) : (
          <ChartContainer config={trendConfig} className="aspect-auto h-[240px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-ventas)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-ventas)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={fmtCompact} />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => (
                      <span className="flex flex-1 justify-between gap-3">
                        <span className="text-muted-foreground">Ventas</span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtMoney(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="var(--color-ventas)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="url(#fillVentas)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
