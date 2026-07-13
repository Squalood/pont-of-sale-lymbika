import { authFetch } from "@/lib/auth";
import { FacturaPayload } from "@/types/factura";

export async function postFactura(payload: FacturaPayload): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas`;

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al guardar la factura (${res.status})`
    );
  }

  const json = await res.json();
  return json.data.documentId as string;
}
