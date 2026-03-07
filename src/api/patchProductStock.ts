import { authFetch } from "@/lib/auth";

export async function patchProductStock(documentId: string, newStock: number): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: { stock_central: newStock } }),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar stock (producto ${documentId})`);
  }
}
