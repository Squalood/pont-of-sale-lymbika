import { InventoryLotOnProduct, ProductType, SelectedLot } from "@/types/product";

// Fecha centinela del lote de apertura [D4]. Se ordena al final y ningún filtro
// de vencidos la toca. Un lote con caducidad >= a esto se considera "sin caducidad real".
export const SENTINEL_EXPIRATION = "2099-12-31";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function effectiveExpiration(lot: InventoryLotOnProduct): string {
  return lot.expirationDate ?? SENTINEL_EXPIRATION;
}

// Un lote está vencido si su caducidad real es anterior a hoy.
export function isExpired(lot: InventoryLotOnProduct, today = todayISO()): boolean {
  return effectiveExpiration(lot) < today;
}

// Lotes vendibles: activos, con existencia y no vencidos. Ordenados por caducidad
// ascendente (FEFO visual); los de apertura (2099) quedan al final.
export function getSellableLots(product: ProductType, today = todayISO()): InventoryLotOnProduct[] {
  return (product.inventory_lots ?? [])
    .filter((l) => l.state === "activo" && l.currentAmount > 0 && !isExpired(l, today))
    .sort((a, b) => effectiveExpiration(a).localeCompare(effectiveExpiration(b)));
}

export function toSelectedLot(lot: InventoryLotOnProduct): SelectedLot {
  return {
    documentId: lot.documentId,
    lotNumber: lot.lotNumber,
    expirationDate: lot.expirationDate,
  };
}

// Suma de currentAmount de lotes vendibles (lo que realmente se puede vender del producto).
export function sellableStock(product: ProductType, today = todayISO()): number {
  return getSellableLots(product, today).reduce((sum, l) => sum + l.currentAmount, 0);
}
