import { patchLote } from "@/api/patchLote";
import { patchProductStock } from "@/api/patchProductStock";
import { getUser } from "@/lib/auth";
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
 * Marca lotes como vencidos y ajusta el stock del producto.
 *
 * Dos reglas que no se pueden romper:
 *
 * 1. **Un solo `patchProductStock` por producto**, con la suma de todos sus
 *    lotes. `patchProductStock` escribe un valor absoluto calculado desde el
 *    `stock_central` que venía en el fetch, así que patchear dentro del loop de
 *    lotes haría que el último sobrescriba a los anteriores y solo se
 *    descontaría uno. Es el mismo agrupado que hace `useCheckout`.
 *
 * 2. **`patchLote` primero, `patchProductStock` después**, restando solo lo de
 *    los lotes que sí se marcaron. Si falla el lote, el stock no baja y la
 *    reconciliación detecta el desajuste; al revés el lote seguiría vendible y
 *    se despacharía mercancía caducada.
 *
 * `currentAmount` se pone en 0 y la cantidad mermada queda en
 * `discardedQuantity`. Como `sumActiveLots` de la reconciliación solo cuenta
 * lotes `activo`, el lote sale del conteo (−Q) a la vez que baja `stock_central`
 * (−Q): el `diff` del producto no se mueve.
 */
export async function discardLotes(
  lotes: LoteType[],
  reason: DiscardReason
): Promise<DiscardResult> {
  const discardedAt = new Date().toISOString();
  const discardedBy = getUser()?.username ?? "desconocido";

  const failed: string[] = [];
  const stockFailed: string[] = [];
  let ok = 0;

  // Un lote sin producto no se puede desechar: no hay stock que ajustar.
  for (const lote of lotes) {
    if (!lote.product) failed.push(label(lote));
  }

  for (const effect of stockEffects(lotes)) {
    const results = await Promise.allSettled(
      effect.lotes.map((lote) =>
        patchLote(lote.documentId, {
          currentAmount: 0,
          state: "vencido",
          discardedAt,
          discardedBy,
          discardedQuantity: lote.currentAmount,
          discardReason: reason,
        })
      )
    );

    // Solo se descuenta del stock lo que realmente quedó marcado.
    let discarded = 0;
    results.forEach((res, i) => {
      if (res.status === "fulfilled") {
        ok++;
        discarded += effect.lotes[i].currentAmount;
      } else {
        failed.push(label(effect.lotes[i]));
      }
    });

    if (discarded === 0) continue;
    try {
      await patchProductStock(
        effect.productDocumentId,
        Math.max(0, effect.before - discarded)
      );
    } catch {
      stockFailed.push(effect.productName);
    }
  }

  return { ok, failed, stockFailed };
}
