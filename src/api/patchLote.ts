import { authFetch } from "@/lib/auth";
import type { DiscardReason, LoteState } from "@/types/lote";

interface PatchLotePayload {
  currentAmount?: number;
  state?: LoteState;
  // Merma: los escribe `discardLotes` junto con state="vencido".
  discardedAt?: string;
  discardedBy?: string;
  discardedQuantity?: number;
  discardReason?: DiscardReason;
}

// Escritura absoluta del lote (consistente con patchProductStock).
// Setear state="agotado" cuando currentAmount llegue a 0.
export async function patchLote(documentId: string, payload: PatchLotePayload): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory-lots/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar lote ${documentId}`);
  }
}
