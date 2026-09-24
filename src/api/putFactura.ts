import { authFetch } from "@/lib/auth";
import { FacturaPayload } from "@/types/factura";

/** Reescribe una factura completa. Solo se usa sobre borradores: `items` se reemplaza entero. */
export async function putFactura(documentId: string, payload: FacturaPayload): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas/${documentId}`;

  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al actualizar la factura (${res.status})`
    );
  }
}
