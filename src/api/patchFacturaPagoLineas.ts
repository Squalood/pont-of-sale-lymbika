import { authFetch } from "@/lib/auth";
import type { FacturaItemType, FacturaType } from "@/types/factura";

interface PagoLineasPayload {
  estadoPago: FacturaType["estadoPago"];
  montoPagado: number;
  fechaPago: string | null;
  items: FacturaItemType[];
}

/**
 * Guarda qué líneas están pagadas y el estado/monto deducido. Strapi reemplaza el arreglo del
 * componente `items` completo, así que cada línea se manda con TODOS sus campos (incluida la
 * relación `product`); omitir alguno lo borraría.
 */
export async function patchFacturaPagoLineas(
  documentId: string,
  payload: PagoLineasPayload
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      data: {
        estadoPago: payload.estadoPago,
        montoPagado: payload.montoPagado,
        fechaPago: payload.fechaPago,
        // Sin `id`: la API REST de Strapi 5 lo rechaza ("Invalid key id"). El arreglo se recrea
        // con ids nuevos, lo cual no importa porque nada fuera de la factura apunta a una línea.
        items: payload.items.map((i) => ({
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          impuesto: i.impuesto,
          product: i.product?.documentId ?? null,
          pagado: !!i.pagado,
          fechaPago: i.fechaPago ?? null,
        })),
      },
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || `Error al registrar el pago (${res.status})`);
  }
}
