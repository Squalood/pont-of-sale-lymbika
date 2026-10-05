import { authFetch } from "@/lib/auth";
import type { FacturaType } from "@/types/factura";

export async function patchFacturaEstado(
  documentId: string,
  estado: FacturaType["estado"]
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: { estado } }),
  });
  if (!res.ok) throw new Error(`Error al cambiar el estado de la factura (${res.status})`);
}
