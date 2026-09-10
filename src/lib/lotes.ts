import { InventoryLotOnProduct, ProductType, SelectedLot } from "@/types/product";

// Fecha centinela del lote de apertura [D4]. Se ordena al final y ningún filtro
// de vencidos la toca. Un lote con caducidad >= a esto se considera "sin caducidad real".
export const SENTINEL_EXPIRATION = "2099-12-31";

// Ventana por defecto de la alerta "por vencer" en la pantalla de caducidades.
export const EXPIRING_SOON_DAYS = 30;

/** Lo mínimo que hace falta para razonar sobre caducidad. Lo cumplen tanto
 *  `InventoryLotOnProduct` (el lote dentro del producto en el POS) como
 *  `LoteType` (el documento completo de la pantalla de caducidades). */
type LotExpiry = { expirationDate: string | null };

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Suma días a una fecha `YYYY-MM-DD`. En UTC para que no se corra un día. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Días de `today` a `iso`: negativo si ya pasó. */
export function daysUntil(iso: string, today = todayISO()): number {
  const a = Date.parse(`${iso}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

function effectiveExpiration(lot: LotExpiry): string {
  return lot.expirationDate ?? SENTINEL_EXPIRATION;
}

/** Falso para los lotes de apertura y para los que nunca capturaron caducidad. */
export function hasRealExpiration(lot: LotExpiry): boolean {
  return effectiveExpiration(lot) < SENTINEL_EXPIRATION;
}

// Un lote está vencido si su caducidad real es anterior a hoy.
export function isExpired(lot: LotExpiry, today = todayISO()): boolean {
  return effectiveExpiration(lot) < today;
}

// Caduca dentro de los próximos `days` días (hoy incluido) sin estar ya vencido.
// La centinela 2099 queda fuera por construcción: nunca cae en la ventana.
export function isExpiringSoon(
  lot: LotExpiry,
  days = EXPIRING_SOON_DAYS,
  today = todayISO()
): boolean {
  const exp = effectiveExpiration(lot);
  return exp >= today && exp <= addDaysISO(today, days);
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
