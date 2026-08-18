"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
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
import { fmtCompact, fmtInt, fmtMoney } from "@/lib/format";
import type { PagosResumen, ProductoResumen, TrendPoint } from "@/lib/ventas-aggregate";

/* El color sigue a la entidad, nunca al ranking: ventas siempre chart-1, compras
   siempre chart-2, para que la vista no se repinte al cambiar de filtro. */
const trendConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
} satisfies ChartConfig;

const vsConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  compras: { label: "Compras", color: "var(--chart-2)" },
} satisfies ChartConfig;

const topConfig = {
  total: { label: "Importe", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Placeholder a la altura de la gráfica, para que la tarjeta no cambie de tamaño. */
function SinDatos({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      Sin datos en este período
    </div>
  );
}

/* ── Tendencia de ventas ─────────────────────────────────────────────────── */

export function VentasTrendChart({
  data,
  total,
  className,
}: {
  data: TrendPoint[];
  total: number;
  className?: string;
}) {
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

/* ── Métodos de pago ─────────────────────────────────────────────────────── */

const PAGO_SLOTS = [
  { key: "efectivoMXN", label: "Efectivo MXN", color: "var(--chart-1)" },
  { key: "tarjeta", label: "Tarjeta", color: "var(--chart-3)" },
  { key: "transferencia", label: "Transferencia", color: "var(--chart-4)" },
] as const;

const pagosConfig = Object.fromEntries(
  PAGO_SLOTS.map((s) => [s.key, { label: s.label, color: s.color }])
) satisfies ChartConfig;

export function MetodosPagoChart({
  pagos,
  className,
}: {
  pagos: PagosResumen;
  className?: string;
}) {
  // El USD queda fuera de la barra: está en dólares sin convertir, y apilarlo con
  // pesos mentiría sobre las proporciones. Va como fila aparte en la lista.
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

            {/* Hace de leyenda, etiqueta directa y tabla a la vez: los montos se leen
                sin hover y sin depender de distinguir los colores. */}
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
                    US${pagos.efectivoUSD.toLocaleString("es-MX", {
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

/* ── Top productos ───────────────────────────────────────────────────────── */

export function TopProductosChart({
  productos,
  className,
}: {
  productos: ProductoResumen[];
  className?: string;
}) {
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
                // 22 caracteres es lo que cabe en una línea a 170px: más largo y
                // recharts parte la etiqueta en dos, que a 10 barras aprieta demasiado.
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

/* ── Ventas vs Compras ───────────────────────────────────────────────────── */

export function VentasVsComprasChart({
  data,
  scopeNote,
  excluidas,
  className,
}: {
  data: TrendPoint[];
  scopeNote?: string;
  excluidas: number;
  className?: string;
}) {
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
            {/* Un solo eje Y a propósito: ambas series son pesos. Si las compras
                superan a las ventas, esa desproporción es el hallazgo. */}
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
