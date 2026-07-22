import { authFetch } from "@/lib/auth";

interface EstadoPagoPayload {
  estadoPago: "pendiente" | "pagada" | "pagada_parcial";
  montoPagado: number;
  fechaPago: string | null;
}

export async function patchFacturaEstadoPago(
  documentId: string,
  payload: EstadoPagoPayload
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throw new Error(`Error al actualizar estado de pago (${res.status})`);
}
