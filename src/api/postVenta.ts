import { VentaPayload } from "@/types/venta";

export async function postVenta(venta: VentaPayload): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: venta }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al registrar la venta (${res.status})`
    );
  }
}
