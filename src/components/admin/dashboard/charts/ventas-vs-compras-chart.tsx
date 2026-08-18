"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const vsConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface VentasVsComprasChartProps {
  data: TrendPoint[];
  /** Aclaración de alcance cuando ventas y compras no cubren lo mismo. */
  scopeNote?: string;
  /** Compras sin costo capturado que quedaron fuera del cálculo. */
  excluidas: number;
  className?: string;
}

export function VentasVsComprasChart({
  data,
  scopeNote,
  excluidas,
  className,
}: VentasVsComprasChartProps) {
  const notas = [
    scopeNote,
    excluidas > 0
      ? `${excluidas} ${excluidas === 1 ? "compra" : "compras"} sin costo registrado, fuera del cálculo.`
      : null,
  ].filter(Boolean);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ventas vs Compras</CardTitle>
        {notas.length > 0 && <CardDescription>{notas.join(" ")}</CardDescription>}
        {/* Leyenda propia en vez de la de recharts, que ordena al revés de como se
            declaran las series y dejaría la leyenda desalineada con las barras. */}
        <div className="flex items-center gap-4 pt-1 text-xs">
          {(["ventas", "compras"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[2px]"
                style={{ background: vsConfig[k].color }}
              />
              <span className="text-muted-foreground">{vsConfig[k].label}</span>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <SinDatos height={260} />
        ) : (
          <ChartContainer config={vsConfig} className="aspect-auto h-[260px] w-full">
            {/* Un solo eje Y a propósito: ambas series son pesos. Si las compras superan
                a las ventas, esa desproporción es el hallazgo. */}
            <BarChart data={data} barGap={2} margin={{ left: 4, right: 12, top: 8 }}>
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
                cursor={{ fill: "var(--muted)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="flex flex-1 justify-between gap-3">
                        <span className="text-muted-foreground">
                          {vsConfig[name as keyof typeof vsConfig]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtMoney(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="ventas"
                fill="var(--color-ventas)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="compras"
                fill="var(--color-compras)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
