import { type DateRange } from "react-day-picker";

/**
 * Periodos de las barras de filtro del admin. Extraído del patrón que repiten
 * `cajas-table`, `sales-table`, `compras-table`, `devoluciones-table` y `facturas-table`.
 */
export type Period = "hoy" | "semana" | "mes" | "todo" | "custom";

/** Ventana resuelta a fechas concretas. `null` en cualquier extremo significa sin límite. */
export interface ResolvedRange {
  from: Date | null;
  to: Date | null;
}

export function fmtDateShort(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Convierte el periodo seleccionado en una ventana concreta.
 *
 * Reproduce la semántica que ya usan las tablas: `semana` son 7 días corridos hacia
 * atrás (no la semana calendario) y `mes` es del día 1 del mes actual a hoy.
 */
export function resolveRange(period: Period, dateRange?: DateRange): ResolvedRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "custom" && dateRange?.from) {
    const from = new Date(
      dateRange.from.getFullYear(),
      dateRange.from.getMonth(),
      dateRange.from.getDate()
    );
    const to = dateRange.to
      ? new Date(
          dateRange.to.getFullYear(),
          dateRange.to.getMonth(),
          dateRange.to.getDate(),
          23,
          59,
          59
        )
      : // Un solo día seleccionado: hasta el último milisegundo de ese día.
        new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { from, to };
  }

  switch (period) {
    case "hoy":
      return { from: today, to: null };
    case "semana":
      return { from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), to: null };
    case "mes":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    default:
      return { from: null, to: null };
  }
}

export function inRange(iso: string, range: ResolvedRange): boolean {
  const fecha = new Date(iso);
  if (range.from && fecha < range.from) return false;
  if (range.to && fecha > range.to) return false;
  return true;
}

export function rangeLabel(dateRange?: DateRange): string {
  if (!dateRange?.from) return "Rango de fechas";
  return dateRange.to
    ? `${fmtDateShort(dateRange.from)} – ${fmtDateShort(dateRange.to)}`
    : fmtDateShort(dateRange.from);
}

/**
 * Días que abarca la ventana. `fallbackFrom` cubre el caso "Todo", donde no hay
 * inicio y el llamador pasa la fecha más antigua de sus datos.
 */
export function rangeSpanDays(range: ResolvedRange, fallbackFrom: Date): number {
  const from = range.from ?? fallbackFrom;
  const to = range.to ?? new Date();
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}
