import { authFetch } from "@/lib/auth";

export async function patchVentaEstado(documentId: string, estado: "completada" | "cancelada"): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: { estado } }),
  });
  if (!res.ok) throw new Error(`Error al actualizar estado de venta (${res.status})`);
}
