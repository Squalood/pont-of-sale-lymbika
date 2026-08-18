"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
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
import { fmtCompact, fmtInt, fmtMoney } from "@/lib/format";
import type { ProductoResumen } from "@/lib/ventas-aggregate";

const topConfig = {
  total: { label: "Importe", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface TopProductosChartProps {
  productos: ProductoResumen[];
  className?: string;
}

export function TopProductosChart({ productos, className }: TopProductosChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top 10 productos</CardTitle>
        <CardDescription>Por importe vendido en el período.</CardDescription>
      </CardHeader>
      <CardContent>
        {productos.length === 0 ? (
          <SinDatos height={340} />
        ) : (
          <ChartContainer config={topConfig} className="aspect-auto h-[340px] w-full">
            <BarChart
              layout="vertical"
              data={productos}
              margin={{ left: 0, right: 56, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nombre"
                width={170}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                // 22 caracteres es lo que cabe en una línea a 170px: más largo y recharts
                // parte la etiqueta en dos, que a 10 barras aprieta demasiado.
                tickFormatter={(s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <span className="flex flex-1 justify-between gap-3">
                        <span className="text-muted-foreground">
                          {fmtInt(Number(item?.payload?.cantidad ?? 0))} u.
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtMoney(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              {/* Un solo tono: los productos son nominales, un degradado por valor
                  duplicaría lo que ya dice el largo de la barra. */}
              <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(v) => fmtCompact(Number(v ?? 0))}
                  className="fill-muted-foreground"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
