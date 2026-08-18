import { inRange, rangeSpanDays, type ResolvedRange } from "@/lib/date-range";
import {
  buildTrend,
  contarArticulos,
  pickBucket,
  sumPagos,
  topProductos,
  type PagosResumen,
  type ProductoResumen,
  type TrendPoint,
} from "@/lib/ventas-aggregate";
import type { CompraType } from "@/types/compra";
import type { VentaType } from "@/types/venta";

/** Valor centinela de los filtros cuando no acotan nada. */
export const TODAS = "todas";
export const TODOS = "todos";

export interface PharmacyOption {
  documentId: string;
  nombre: string;
}

/** Sucursales presentes en los datos. Solo salen de ventas: compras no tiene la relación. */
export function derivePharmacias(ventas: VentaType[]): PharmacyOption[] {
  const map = new Map<string, string>();
  for (const v of ventas) {
    const p = v.pharmacies?.[0];
    if (p?.documentId) map.set(p.documentId, p.nombre);
  }
  return Array.from(map.entries()).map(([documentId, nombre]) => ({ documentId, nombre }));
}

/** Unión de operadores de ambas colecciones: `operador` sí existe en ventas y compras. */
export function deriveOperadores(ventas: VentaType[], compras: CompraType[]): string[] {
  const unique = new Set<string>();
  for (const v of ventas) if (v.operador) unique.add(v.operador);
  for (const c of compras) if (c.operador) unique.add(c.operador);
  return Array.from(unique).sort();
}

export interface DashboardFilters {
  range: ResolvedRange;
  pharmacyId: string;
  operador: string;
}

export interface DashboardData {
  ventasFiltradas: VentaType[];
  comprasRango: CompraType[];
  comprasCosto: CompraType[];
  /** Compras del rango sin costo capturado, excluidas del dinero pero reportadas. */
  sinCosto: number;
  pagos: PagosResumen;
  ingresos: number;
  egresos: number;
  ticketPromedio: number;
  costoPromedio: number;
  articulos: number;
  unidadesCompradas: number;
  top: ProductoResumen[];
  trend: TrendPoint[];
  balance: number;
}

/**
 * Aplica los filtros y calcula todo lo que consumen las tarjetas y las gráficas.
 *
 * Pura a propósito: el filtrado por estado vive aquí y no en `ventas-aggregate`, que es
 * compartido con el corte de caja y no debe decidir qué registros cuentan.
 */
export function aggregateDashboard(
  ventas: VentaType[],
  compras: CompraType[],
  { range, pharmacyId, operador }: DashboardFilters
): DashboardData {
  // Los hooks no filtran cancelados: hay que excluirlos explícitamente.
  const ventasFiltradas = ventas.filter(
    (v) =>
      v.estado === "completada" &&
      inRange(v.fecha, range) &&
      (pharmacyId === TODAS || v.pharmacies?.[0]?.documentId === pharmacyId) &&
      (operador === TODOS || v.operador === operador)
  );

  // Las compras no tienen relación con farmacia: se registran a nivel central, así que el
  // selector de sucursal no puede acotarlas. El operador sí existe en ambas colecciones.
  const comprasRango = compras.filter(
    (c) =>
      c.estado === "registrada" &&
      inRange(c.fecha, range) &&
      (operador === TODOS || c.operador === operador)
  );
  // Las compras previas a la captura de costos traen `total: 0` y hundirían cualquier
  // promedio, así que quedan fuera del dinero pero se reportan.
  const comprasCosto = comprasRango.filter((c) => c.total > 0);
  const sinCosto = comprasRango.length - comprasCosto.length;

  const pagos = sumPagos(ventasFiltradas);
  const ingresos = pagos.totalImporte;
  const egresos = comprasCosto.reduce((sum, c) => sum + c.total, 0);

  const fechas = [...ventasFiltradas, ...comprasRango].map((r) => new Date(r.fecha));
  const masAntigua = fechas.length
    ? new Date(Math.min(...fechas.map((d) => d.getTime())))
    : new Date();
  const bucket = pickBucket(rangeSpanDays(range, masAntigua));

  return {
    ventasFiltradas,
    comprasRango,
    comprasCosto,
    sinCosto,
    pagos,
    ingresos,
    egresos,
    ticketPromedio: pagos.numVentas > 0 ? ingresos / pagos.numVentas : 0,
    costoPromedio: comprasCosto.length > 0 ? egresos / comprasCosto.length : 0,
    articulos: contarArticulos(ventasFiltradas),
    unidadesCompradas: comprasRango.reduce(
      (sum, c) => sum + (c.items ?? []).reduce((s, i) => s + i.quantity, 0),
      0
    ),
    top: topProductos(ventasFiltradas, 10),
    trend: buildTrend(range, bucket, ventasFiltradas, comprasCosto),
    balance: ingresos - egresos,
  };
}
