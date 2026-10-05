import type { FacturaType } from "@/types/factura";

/**
 * Solo un borrador se edita. Una emitida se puede regresar a borrador para corregirla (estas
 * facturas no se timbran ante el SAT), pero solo mientras no tenga pagos: con dinero registrado,
 * cambiar el total descuadraría el pago. Las que salieron de una venta del POS reflejan esa venta
 * y no se tocan desde aquí. `estadoPago` se pasa aparte porque el detalle lo puede haber cambiado
 * sin recargar la factura.
 */
export function puedeRestablecerABorrador(
  factura: Pick<FacturaType, "estado" | "venta_pos">,
  estadoPago: FacturaType["estadoPago"] | null | undefined
): boolean {
  return (
    factura.estado === "emitida" &&
    (estadoPago ?? "pendiente") === "pendiente" &&
    !factura.venta_pos
  );
}
