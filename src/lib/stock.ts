import type { StockLevel } from "@/api/posStock";
import type { CartItem, ProductType } from "@/types/product";

/**
 * Stock que el POS vende y muestra.
 *
 * - Catálogo de la caja: trae `pharmacy_stocks` filtrado a su farmacia (0 o 1 fila). Sin
 *   fila, la farmacia nunca ha tenido ese producto: stock 0.
 * - Catálogo sin farmacia (admin): `pharmacy_stocks` no viene y el stock es `stock_central`,
 *   el total de todas las ubicaciones.
 */
export function localStock(p: ProductType): number {
  if (p.pharmacy_stocks !== undefined) return Number(p.pharmacy_stocks[0]?.stock ?? 0);
  return Number(p.stock_central ?? 0);
}

/** Mínimo configurado para la farmacia, o null si no hay (catálogo sin farmacia o sin fila). */
export function localMinStock(p: ProductType): number | null {
  return p.pharmacy_stocks?.[0]?.min_stock ?? null;
}

/**
 * Unidades que tiene el lote elegido en la línea (según el catálogo de la farmacia), o null si
 * la línea no tiene lote o el lote ya no está en esta farmacia. No es un tope: vender más solo
 * hace que el servidor complete con otros lotes (por caducidad) o sin lote, y lo avisa.
 */
export function lotAvailable(item: CartItem): number | null {
  if (item.type !== "product" || !item.selectedLot) return null;
  const selected = item.selectedLot;
  const lot = item.product.inventory_lots?.find((l) => l.documentId === selected.documentId);
  return lot ? lot.currentAmount : null;
}

export function isPerPharmacy(p: ProductType): boolean {
  return p.pharmacy_stocks !== undefined;
}

function withLocalStock(p: ProductType, stock: number): ProductType {
  if (p.pharmacy_stocks !== undefined) {
    const row = p.pharmacy_stocks[0] ?? { stock: 0, min_stock: null };
    return { ...p, pharmacy_stocks: [{ ...row, stock }] };
  }
  return { ...p, stock_central: stock };
}

/**
 * Aplica los niveles que devolvió /pos-stock (valores reales tras la transacción). El catálogo
 * de una farmacia toma el nivel de una farmacia; uno sin farmacia toma el total.
 */
export function applyStockLevels(p: ProductType, levels: StockLevel[]): ProductType {
  const mine = levels.filter((l) => l.productDocumentId === p.documentId);
  if (!mine.length) return p;
  if (!isPerPharmacy(p)) return { ...p, stock_central: mine[0].total };
  const level = mine.find((l) => l.location !== "bodega");
  if (!level) return p;
  const byDoc = new Map(level.lots.map((l) => [l.documentId, l]));
  const inventory_lots = p.inventory_lots?.map((lot) => {
    const fresh = byDoc.get(lot.documentId);
    return fresh ? { ...lot, currentAmount: fresh.currentAmount, state: fresh.state } : lot;
  });
  return { ...withLocalStock(p, level.stock), inventory_lots };
}

/**
 * Aproximación local cuando el servidor no respondió (la operación quedó en la cola): resta la
 * cantidad al stock local y a los lotes elegidos. Se corrige sola con el siguiente catálogo.
 */
export function applyLocalSale(
  p: ProductType,
  qty: number,
  soldPerLot: Map<string, number>
): ProductType {
  const inventory_lots = p.inventory_lots?.map((lot) => {
    const sold = soldPerLot.get(lot.documentId);
    if (!sold) return lot;
    const currentAmount = Math.max(0, lot.currentAmount - sold);
    return { ...lot, currentAmount, state: currentAmount === 0 ? ("agotado" as const) : lot.state };
  });
  return { ...withLocalStock(p, localStock(p) - qty), inventory_lots };
}
