import type { FacturaItemType, FacturaType } from "@/types/factura";

type EstadoPago = FacturaType["estadoPago"];

const TASA: Record<FacturaItemType["impuesto"], number> = {
  iva16: 0.16,
  iva8: 0.08,
  exento: 0,
};

const money = (n: number) => Math.round(n * 100) / 100;

/** Lo que cuesta la línea con su IVA, en centavos cerrados (P.U. es neto, como en el editor). */
export function importeLinea(item: Pick<FacturaItemType, "cantidad" | "precioUnitario" | "impuesto">): number {
  return money((item.cantidad ?? 0) * (item.precioUnitario ?? 0) * (1 + (TASA[item.impuesto] ?? 0)));
}

/**
 * Estado y monto se deducen de las líneas pagadas; ya no se teclean. Con todas pagadas el monto
 * es el `total` guardado (no la suma de importes) para no descuadrar por redondeo de centavos.
 */
export function resumenPago(
  factura: Pick<FacturaType, "items" | "total">,
  pagadas: ReadonlySet<number>
): { estadoPago: EstadoPago; montoPagado: number } {
  const items = factura.items ?? [];
  const marcadas = items.filter((i) => pagadas.has(i.id));
  if (marcadas.length === 0) return { estadoPago: "pendiente", montoPagado: 0 };
  if (marcadas.length === items.length) return { estadoPago: "pagada", montoPagado: factura.total ?? 0 };
  return {
    estadoPago: "pagada_parcial",
    montoPagado: money(marcadas.reduce((s, i) => s + importeLinea(i), 0)),
  };
}

/** Si alguna línea ya trae la marca de pago, el detalle por producto está en uso. */
export function tieneDetallePorLinea(factura: Pick<FacturaType, "items">): boolean {
  return (factura.items ?? []).some((i) => i.pagado);
}

/**
 * Líneas que arrancan marcadas. Una factura `pagada` registrada antes del detalle por producto
 * no trae marcas, pero se pagó completa: se muestran todas como pagadas.
 */
export function lineasPagadasIniciales(
  factura: Pick<FacturaType, "items">,
  estadoPago: EstadoPago | null | undefined
): Set<number> {
  const items = factura.items ?? [];
  if (!tieneDetallePorLinea(factura) && estadoPago === "pagada") {
    return new Set(items.map((i) => i.id));
  }
  return new Set(items.filter((i) => i.pagado).map((i) => i.id));
}
