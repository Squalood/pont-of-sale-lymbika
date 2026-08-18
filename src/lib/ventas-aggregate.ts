import { ventaCardCharged } from "@/lib/checkout-math";
import type { ResolvedRange } from "@/lib/date-range";

/**
 * Agregaciones de ventas compartidas. La lógica de reparto por método de pago sale
 * de `fetchReporteCierre`, que es la fuente de verdad del corte de caja: si el
 * dashboard la reimplementara, los dos números divergirían en silencio.
 *
 * Ninguna función de aquí filtra por `estado`. `fetchReporteCierre` cuenta las
 * ventas canceladas y `useEfectivoCaja` no; el filtro es decisión del llamador.
 */

export interface PagosResumen {
  efectivoMXN: number;
  /** En dólares, sin convertir. */
  efectivoUSD: number;
  tarjeta: number;
  transferencia: number;
  numVentas: number;
  totalImporte: number;
}

export interface ProductoResumen {
  nombre: string;
  cantidad: number;
  total: number;
}

/** Campos mínimos para repartir una venta entre métodos de pago. */
export interface VentaPagoRow {
  total: number;
  metodoPago: string;
  montoTarjeta?: number | null;
  montoTransferencia?: number | null;
  recargoTarjeta?: number | null;
  esMembresia?: boolean | null;
  recibido?: number;
  cambio?: number;
  recibidoUSD?: number;
  tipoCambioUsado?: number;
}

interface VentaConItems {
  venta?: { productName: string; quantity: number; unitPrice: number }[] | null;
}

export function emptyPagos(): PagosResumen {
  return {
    efectivoMXN: 0,
    efectivoUSD: 0,
    tarjeta: 0,
    transferencia: 0,
    numVentas: 0,
    totalImporte: 0,
  };
}

/** Suma una venta al acumulado. Muta `pagos`. */
export function accumulatePago(pagos: PagosResumen, v: VentaPagoRow): void {
  pagos.numVentas += 1;
  pagos.totalImporte += v.total;

  const usd = v.recibidoUSD ?? 0;
  const tc = v.tipoCambioUsado ?? 1;

  if (v.metodoPago === "efectivo" || v.metodoPago === "mixto") {
    const recibidoMXN = (v.recibido ?? 0) - usd * tc;
    pagos.efectivoMXN += recibidoMXN - (v.cambio ?? 0);
    pagos.efectivoUSD += usd;
  }
  // La terminal cobra base + recargo Health Pass, así que el cuadre suma ambos.
  if (v.metodoPago === "tarjeta" || v.metodoPago === "mixto") {
    pagos.tarjeta += ventaCardCharged(v);
  }
  if (v.metodoPago === "mixto") {
    pagos.transferencia += v.montoTransferencia ?? 0;
  }
  if (v.metodoPago === "transfe") {
    pagos.transferencia += v.total;
  }
}

export function sumPagos(ventas: VentaPagoRow[]): PagosResumen {
  const pagos = emptyPagos();
  for (const v of ventas) accumulatePago(pagos, v);
  return pagos;
}

/** Ranking de productos por importe. Sin `limit` devuelve la lista completa. */
export function topProductos(
  ventas: VentaConItems[],
  limit = Infinity
): ProductoResumen[] {
  const map = new Map<string, { cantidad: number; total: number }>();

  for (const v of ventas) {
    for (const item of v.venta ?? []) {
      if (!item.productName) continue;
      const entry = map.get(item.productName) ?? { cantidad: 0, total: 0 };
      entry.cantidad += item.quantity;
      entry.total += item.quantity * item.unitPrice;
      map.set(item.productName, entry);
    }
  }

  const productos = Array.from(map.entries())
    .map(([nombre, { cantidad, total }]) => ({ nombre, cantidad, total }))
    .sort((a, b) => b.total - a.total);

  return limit === Infinity ? productos : productos.slice(0, limit);
}

export function contarArticulos(ventas: VentaConItems[]): number {
  let n = 0;
  for (const v of ventas) {
    for (const item of v.venta ?? []) n += item.quantity;
  }
  return n;
}

/* ── Serie temporal ──────────────────────────────────────────────────────── */

export type Bucket = "hora" | "dia" | "semana" | "mes";

export interface TrendPoint {
  key: string;
  label: string;
  /** Inicio del bucket en epoch ms, para ordenar y para el tooltip. */
  ts: number;
  ventas: number;
  compras: number;
}

export function pickBucket(spanDays: number): Bucket {
  if (spanDays <= 2) return "hora";
  if (spanDays <= 62) return "dia";
  if (spanDays <= 366) return "semana";
  return "mes";
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Inicio del bucket que contiene `d`, en hora local.
 *
 * Local y no UTC a propósito: México es UTC−6, así que una clave derivada de
 * `toISOString()` mandaría toda venta anterior a las 06:00 al día anterior y el
 * dashboard discreparía del corte de caja cada mañana.
 */
function bucketStart(d: Date, bucket: Bucket): Date {
  switch (bucket) {
    case "hora":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
    case "dia":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    case "semana": {
      // Semana de lunes a domingo; getDay() da 0 para domingo.
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      monday.setDate(monday.getDate() - (dow - 1));
      return monday;
    }
    case "mes":
      return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

function bucketKey(d: Date, bucket: Bucket): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (bucket === "hora") return `${base}T${pad(d.getHours())}`;
  if (bucket === "mes") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  return base;
}

function bucketLabel(d: Date, bucket: Bucket): string {
  switch (bucket) {
    case "hora":
      return `${pad(d.getHours())}:00`;
    case "mes":
      return d.toLocaleDateString("es-MX", { month: "short", year: "numeric" });
    default:
      return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }
}

function advance(d: Date, bucket: Bucket): Date {
  const next = new Date(d);
  if (bucket === "hora") next.setHours(next.getHours() + 1);
  else if (bucket === "dia") next.setDate(next.getDate() + 1);
  else if (bucket === "semana") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Serie de ingresos y egresos por bucket.
 *
 * Siembra todos los buckets del rango en cero antes de acumular: sin eso recharts
 * une los extremos de un hueco con una recta y la línea reporta ingresos que nunca
 * ocurrieron.
 *
 * Las ventas y compras que llegan ya vienen filtradas por el llamador (estado,
 * rango, farmacia); aquí solo se reparten en el tiempo.
 */
export function buildTrend(
  range: ResolvedRange,
  bucket: Bucket,
  ventas: { fecha: string; total: number }[],
  compras: { fecha: string; total: number }[]
): TrendPoint[] {
  const fechas = [...ventas, ...compras].map((r) => new Date(r.fecha).getTime());
  if (!range.from && fechas.length === 0) return [];

  const from = range.from ?? new Date(Math.min(...fechas));
  const to = range.to ?? new Date(Math.max(Date.now(), ...(fechas.length ? fechas : [0])));
  if (from > to) return [];

  const points = new Map<string, TrendPoint>();
  const last = bucketStart(to, bucket);
  for (let cur = bucketStart(from, bucket); cur <= last; cur = advance(cur, bucket)) {
    points.set(bucketKey(cur, bucket), {
      key: bucketKey(cur, bucket),
      label: bucketLabel(cur, bucket),
      ts: cur.getTime(),
      ventas: 0,
      compras: 0,
    });
  }

  const add = (iso: string, field: "ventas" | "compras", amount: number) => {
    const point = points.get(bucketKey(bucketStart(new Date(iso), bucket), bucket));
    if (point) point[field] += amount;
  };

  for (const v of ventas) add(v.fecha, "ventas", v.total);
  for (const c of compras) add(c.fecha, "compras", c.total);

  return Array.from(points.values()).sort((a, b) => a.ts - b.ts);
}
