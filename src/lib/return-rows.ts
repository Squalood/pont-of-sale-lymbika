import type { VentaItemType } from "@/types/venta";
import type { DevolucionType } from "@/types/devolucion";
import { lineLots, lotPortionLabel } from "@/lib/venta-lotes";

export interface ReturnLotOption {
  lotDocumentId: string;
  label: string;
  /** Piezas de ese lote que todavía no han regresado por otra devolución. */
  remaining: number;
}

export interface ReturnRow extends VentaItemType {
  alreadyReturned: number;
  maxReturnable: number;
  returnQty: number;
  /** Lotes de los que salió la línea y aún pueden recibir. Vacío si no se sabe (venta vieja). */
  lotOptions: ReturnLotOption[];
  /** Lote al que regresa; solo se pregunta cuando hay más de una opción. */
  lotChoice: string | null;
}

/**
 * Renglones del diálogo de devolución: cuánto queda por devolver de cada línea de la venta y a
 * qué lotes puede regresar.
 *
 * - Lo ya devuelto se sabe **por producto** (la devolución no guarda de qué línea viene), así
 *   que se reparte entre las líneas de ese producto en orden. Antes cada línea tomaba el total
 *   del producto, y con dos líneas iguales el máximo por devolver salía mal.
 * - Los lotes salen del reparto real de la venta (`dispensedLots`), menos lo que otras
 *   devoluciones ya regresaron a cada uno (`fromLotDocumentId`). Sin reparto (venta anterior al
 *   30-oct-2026) no hay opciones: el servidor decide con la bitácora, o regresa sin lote.
 */
export function buildReturnRows(lines: VentaItemType[], prevDevoluciones: DevolucionType[]): ReturnRow[] {
  const returnedLeft: Record<number, number> = {};
  const returnedFromLot = new Map<string, number>();
  for (const dev of prevDevoluciones) {
    for (const item of dev.items) {
      const pid = item.product?.id ?? 0;
      returnedLeft[pid] = (returnedLeft[pid] ?? 0) + item.quantity;
      for (const l of item.dispensedLots ?? []) {
        if (l.fromLotDocumentId) {
          returnedFromLot.set(l.fromLotDocumentId, (returnedFromLot.get(l.fromLotDocumentId) ?? 0) + l.quantity);
        }
      }
    }
  }

  const soldByLot = new Map<string, number>();
  for (const item of lines) {
    const { lots, exact } = lineLots(item);
    if (item.type !== "product" || !exact) continue;
    for (const l of lots) {
      if (l.lotDocumentId) soldByLot.set(l.lotDocumentId, (soldByLot.get(l.lotDocumentId) ?? 0) + l.quantity);
    }
  }

  return lines.map((item) => {
    const pid = item.product?.id ?? 0;
    const alreadyReturned = Math.min(item.quantity, returnedLeft[pid] ?? 0);
    returnedLeft[pid] = (returnedLeft[pid] ?? 0) - alreadyReturned;

    const { lots, exact } = lineLots(item);
    const lotOptions: ReturnLotOption[] =
      item.type === "product" && exact
        ? lots
            .filter((l) => l.lotDocumentId)
            .map((l) => ({
              lotDocumentId: l.lotDocumentId!,
              label: lotPortionLabel(l, false),
              remaining: Math.max(0, (soldByLot.get(l.lotDocumentId!) ?? 0) - (returnedFromLot.get(l.lotDocumentId!) ?? 0)),
            }))
            .filter((o) => o.remaining > 0)
        : [];

    return {
      ...item,
      alreadyReturned,
      maxReturnable: item.quantity - alreadyReturned,
      returnQty: 0,
      lotOptions,
      // El primero en el orden de venta, que es el mismo que sigue el servidor si no se elige.
      lotChoice: lotOptions[0]?.lotDocumentId ?? null,
    };
  });
}
