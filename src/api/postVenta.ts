import { VentaPayload } from "@/types/venta";
import { authFetch } from "@/lib/auth";

export async function postVenta(venta: VentaPayload): Promise<{ id: number; documentId: string }> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos`;

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ data: venta }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al registrar la venta (${res.status})`
    );
  }

  const json = await res.json();
  return { id: json.data.id as number, documentId: json.data.documentId as string };
}
