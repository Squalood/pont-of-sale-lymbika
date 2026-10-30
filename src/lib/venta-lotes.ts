import type { DispensedLot, VentaItemType } from "@/types/venta";
import { hasRealExpiration } from "@/lib/lotes";

/**
 * De qué lotes salió una línea de venta.
 *
 * Prefiere `dispensedLots`, el reparto que hizo el servidor al descontar. Sin él (ventas
 * anteriores al campo, o con el descuento todavía en la cola) cae al lote que eligió el cajero,
 * que puede no ser exacto: si no alcanzaba, el servidor completó con otros lotes.
 */
export function lineLots(item: VentaItemType): { lots: DispensedLot[]; exact: boolean } {
  if (Array.isArray(item.dispensedLots) && item.dispensedLots.length > 0) {
    return { lots: item.dispensedLots, exact: true };
  }
  return {
    lots: [
      {
        lotDocumentId: item.lotDocumentId ?? null,
        lotNumber: item.lotNumber ?? null,
        expirationDate: item.expirationDate ?? null,
        quantity: item.quantity,
      },
    ],
    exact: false,
  };
}

/** `2027-03-15` → `15/03/2027`; nada para los lotes sin caducidad real (apertura, sin capturar). */
export function fmtCaducidad(expirationDate: string | null): string | null {
  if (!expirationDate || !hasRealExpiration({ expirationDate })) return null;
  const [y, m, d] = expirationDate.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * "Lote ABC · Cad. 15/03/2027". Con `withQty` agrega "×n", que solo informa algo cuando la
 * línea salió de más de un lote.
 */
export function lotPortionLabel(lot: DispensedLot, withQty: boolean): string {
  const qty = withQty ? ` ×${lot.quantity}` : "";
  if (!lot.lotNumber) return `Sin lote${qty}`;
  const cad = fmtCaducidad(lot.expirationDate);
  return `Lote ${lot.lotNumber}${qty}${cad ? ` · Cad. ${cad}` : ""}`;
}
