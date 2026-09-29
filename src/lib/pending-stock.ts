import {
  postStockPurchase,
  postStockReturn,
  postStockSale,
  StockApiError,
  type StockOpResult,
} from "@/api/posStock";

/**
 * Movimientos de stock que quedaron pendientes: el documento (venta, devolución, compra) sí se
 * registró, pero la llamada a /pos-stock falló. Se guardan en localStorage y se reintentan.
 *
 * Reintentar es seguro: el backend usa el documentId como llave de idempotencia, así que un
 * movimiento que en realidad sí se aplicó (se perdió solo la respuesta) no se descuenta dos veces.
 */

export type PendingKind = "sale" | "return" | "purchase";

export interface PendingStockOp {
  kind: PendingKind;
  documentId: string;
  /** Texto para mostrar al usuario, ej. "Venta #00123". */
  label: string;
  attempts: number;
  lastError?: string;
  /** El backend lo rechazó con un error de negocio: reintentar no lo arregla. */
  permanent?: boolean;
  createdAt: string;
}

const KEY = "pos_pending_stock";

function read(): PendingStockOp[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingStockOp[]) : [];
  } catch {
    return [];
  }
}

function write(ops: PendingStockOp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    // Sin localStorage no hay cola; el error ya se le mostró al usuario.
  }
}

const runners: Record<PendingKind, (documentId: string) => Promise<StockOpResult>> = {
  sale: postStockSale,
  return: postStockReturn,
  purchase: postStockPurchase,
};

export function enqueuePendingStock(op: Omit<PendingStockOp, "attempts" | "createdAt">, error?: unknown) {
  const ops = read().filter((o) => !(o.kind === op.kind && o.documentId === op.documentId));
  ops.push({
    ...op,
    attempts: 1,
    lastError: error instanceof Error ? error.message : undefined,
    permanent: error instanceof StockApiError ? error.isPermanent : false,
    createdAt: new Date().toISOString(),
  });
  write(ops);
}

export function getPendingStock(): PendingStockOp[] {
  return read();
}

/** Ejecuta un movimiento y, si falla, lo deja en la cola. Devuelve el resultado o `null`. */
export async function runOrQueue(
  kind: PendingKind,
  documentId: string,
  label: string
): Promise<StockOpResult | null> {
  try {
    return await runners[kind](documentId);
  } catch (err) {
    enqueuePendingStock({ kind, documentId, label }, err);
    return null;
  }
}

let flushing = false;

/** Reintenta la cola. Los rechazos permanentes se conservan para revisarlos, sin reintentarse. */
export async function flushPendingStock(): Promise<{ done: number; remaining: PendingStockOp[] }> {
  if (flushing) return { done: 0, remaining: read() };
  flushing = true;
  let done = 0;
  try {
    for (const op of read()) {
      if (op.permanent) continue;
      try {
        await runners[op.kind](op.documentId);
        write(read().filter((o) => !(o.kind === op.kind && o.documentId === op.documentId)));
        done++;
      } catch (err) {
        write(
          read().map((o) =>
            o.kind === op.kind && o.documentId === op.documentId
              ? {
                  ...o,
                  attempts: o.attempts + 1,
                  lastError: err instanceof Error ? err.message : String(err),
                  permanent: err instanceof StockApiError ? err.isPermanent : false,
                }
              : o
          )
        );
      }
    }
  } finally {
    flushing = false;
  }
  return { done, remaining: read() };
}
