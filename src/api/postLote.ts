import { authFetch } from "@/lib/auth";

interface PostLotePayload {
  product: string;      // product documentId
  numeroLote: string;
  fechaCaducidad?: string;
  cantidadInicial: number;
  compraDocId?: string; // opcional: el lote de apertura no tiene compra asociada
}

export async function postLote(payload: PostLotePayload): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory-lots`;
  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({
      data: {
        product: payload.product,
        lotNumber: payload.numeroLote,
        ...(payload.fechaCaducidad ? { expirationDate: payload.fechaCaducidad } : {}),
        initialQuantity: payload.cantidadInicial,
        currentAmount: payload.cantidadInicial,
        ...(payload.compraDocId ? { compra: payload.compraDocId } : {}),
        state: "activo",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Error al registrar lote "${payload.numeroLote}"`);
  }
}
