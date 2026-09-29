import { newIdemKey, postDiscardLots } from "@/api/posStock";
import type { DiscardReason, LoteType } from "@/types/lote";

export interface DiscardResult {
  /** Lotes marcados como vencidos con éxito. */
  ok: number;
  /** Etiquetas legibles de los lotes que no se pudieron marcar. */
  failed: string[];
  /** Productos cuyo lote sí se marcó pero cuyo stock no se pudo ajustar. */
  stockFailed: string[];
}

export interface StockEffect {
  productDocumentId: string;
  productName: string;
  before: number;
  after: number;
  quantity: number;
  lotes: LoteType[];
}

function label(lote: LoteType): string {
  return `${lote.product?.productName ?? "?"} · lote ${lote.lotNumber}`;
}

/**
 * Efecto que tendría desechar `lotes`, agregado por producto. Lo usa el diálogo
 * para mostrar "Producto: 40 → 30" antes de confirmar, con la misma agrupación
 * que después ejecuta `discardLotes`.
 */
export function stockEffects(lotes: LoteType[]): StockEffect[] {
  const byProduct = new Map<string, StockEffect>();
  for (const lote of lotes) {
    if (!lote.product) continue;
    const cur = byProduct.get(lote.product.documentId) ?? {
      productDocumentId: lote.product.documentId,
      productName: lote.product.productName,
      before: lote.product.stock_central,
      after: lote.product.stock_central,
      quantity: 0,
      lotes: [],
    };
    cur.quantity += lote.currentAmount;
    cur.after = Math.max(0, cur.before - cur.quantity);
    cur.lotes.push(lote);
    byProduct.set(lote.product.documentId, cur);
  }
  return [...byProduct.values()];
}

/**
 * Marca lotes como vencidos y descuenta su cantidad del stock de su ubicación.
 *
 * Lo hace el servidor (/pos-stock/discard-lot) en una sola transacción: el lote pasa a
 * `vencido` con `currentAmount = 0` y `discardedQuantity = Q`, y el stock de la ubicación del
 * lote baja Q (con piso en 0). Como el lote sale del conteo de activos a la vez que baja el
 * stock, el `diff` de la reconciliación no se mueve. Ya no puede quedar un lote marcado con el
 * stock sin ajustar: si algo falla, no se aplica nada.
 */
export async function discardLotes(
  lotes: LoteType[],
  reason: DiscardReason
): Promise<DiscardResult> {
  // Un lote sin producto no se puede desechar: no hay stock que ajustar.
  const failed = lotes.filter((l) => !l.product).map(label);
  const validos = lotes.filter((l) => l.product);
  if (validos.length === 0) return { ok: 0, failed, stockFailed: [] };

  try {
    const res = await postDiscardLots({
      lotDocumentIds: validos.map((l) => l.documentId),
      reason,
      idemKey: newIdemKey(),
    });
    const byDoc = new Map(validos.map((l) => [l.documentId, l]));
    for (const id of res.result?.failed ?? []) {
      const lote = byDoc.get(id);
      failed.push(lote ? label(lote) : id);
    }
    for (const w of res.warnings) {
      if (w.code === "LOT_NOT_DISCARDABLE") failed.push(w.message);
    }
    return { ok: res.result?.discardedLots ?? 0, failed, stockFailed: [] };
  } catch {
    return { ok: 0, failed: [...failed, ...validos.map(label)], stockFailed: [] };
  }
}
