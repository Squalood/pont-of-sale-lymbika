import { authFetch, ForbiddenError } from "@/lib/auth";

/**
 * Cliente de /api/pos-stock: todas las escrituras de stock pasan por aquí.
 *
 * El backend corre cada operación en una transacción con las filas bloqueadas y la hace
 * idempotente (reintentar la misma venta, compra o devolución no descuenta dos veces). El
 * POS ya no calcula valores absolutos: manda el documento o el delta, y aplica los `levels`
 * que devuelve el servidor.
 *
 * Una ubicación es el documentId de una farmacia, o `null` para la bodega central.
 * `product.stock_central` es el total de todas las ubicaciones; la bodega es total − farmacias.
 */

export type StockLocation = string | null;

export interface StockLevelLot {
  documentId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  currentAmount: number;
  state: "activo" | "agotado" | "vencido";
}

export interface StockLevel {
  productDocumentId: string;
  /** "bodega" o el documentId de la farmacia. */
  location: string;
  stock: number;
  /** Total del producto en todas las ubicaciones (product.stock_central). */
  total: number;
  lots: StockLevelLot[];
}

export interface StockWarning {
  code: "NEGATIVE_STOCK" | "LOTS_INSUFFICIENT" | "LOT_NOT_AT_LOCATION" | "LOT_NOT_DISCARDABLE" | string;
  productDocumentId?: string;
  message: string;
}

export interface StockOpResult<R = unknown> {
  ok: true;
  duplicate: boolean;
  operationId: string;
  result?: R;
  warnings: StockWarning[];
  levels: StockLevel[];
}

export class StockApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** 4xx con código de negocio: reintentar no lo arregla. */
  get isPermanent() {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
  }
}

const base = () => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pos-stock`;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(`${base()}${path}`, init);
  } catch (err) {
    // authFetch lanza su propio error en los 403; aquí se vuelve un mensaje que dice qué falta.
    if (err instanceof ForbiddenError) {
      const action = path.split("?")[0].replace(/^\//, "");
      throw new StockApiError(
        403,
        "FORBIDDEN",
        `Sin permiso para "${action}". En Strapi: Settings → Users & Permissions → Roles → Authenticated → Pos-stock, habilita esa acción.`
      );
    }
    throw new StockApiError(0, "NETWORK", "No se pudo conectar con el servidor. Revisa la conexión o que el backend esté arriba.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const err = json?.error;
    throw new StockApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `Error de stock (${res.status})`,
      err?.details
    );
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) =>
  call<T>(path, { method: "POST", body: JSON.stringify(body) });

/** Llave de idempotencia para operaciones que no tienen documento propio (traspaso, ajuste, merma). */
export function newIdemKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const postStockSale = (ventaDocumentId: string) =>
  post<StockOpResult>("/sale", { ventaDocumentId });

export const postStockReturn = (devolucionDocumentId: string) =>
  post<StockOpResult>("/return", { devolucionDocumentId });

export const postStockPurchase = (compraDocumentId: string) =>
  post<StockOpResult<{ products: number; lotsCreated: number }>>("/purchase", { compraDocumentId });

export interface TransferLine {
  productDocumentId: string;
  quantity: number;
  lotDocumentId?: string | null;
}

export const postStockTransfer = (input: {
  from: StockLocation;
  to: StockLocation;
  lines: TransferLine[];
  notes?: string;
  idemKey: string;
}) =>
  post<StockOpResult<{ batchId: string; records: number }>>("/transfer", {
    ...input,
    from: input.from ?? "bodega",
    to: input.to ?? "bodega",
  });

export const postStockAdjust = (input: {
  productDocumentId: string;
  location: StockLocation;
  mode: "set" | "delta";
  value: number;
  reason?: string;
  lotDocumentId?: string | null;
  /** Solo con lote: false = corrige solo el lote (cuadrar), sin tocar el stock ni el total. */
  affectStock?: boolean;
  idemKey: string;
}) => post<StockOpResult>("/adjust", { ...input, location: input.location ?? "bodega" });

/**
 * Conteo físico ("Cuadrar"): cada lote queda con lo contado y el stock de la ubicación queda en
 * la suma de sus lotes más lo contado sin lote. Stock y lotes coinciden siempre después.
 */
export const postStockCount = (input: {
  productDocumentId: string;
  location: StockLocation;
  lots: { lotDocumentId: string; amount: number }[];
  unlotted: number;
  reason?: string;
  idemKey: string;
}) =>
  post<StockOpResult<{ stock: number; previous: number; inLots: number; unlotted: number }>>("/count", {
    ...input,
    location: input.location ?? "bodega",
  });

export const postDiscardLots = (input: {
  lotDocumentIds: string[];
  reason: "expired" | "damaged" | "theft" | "other";
  idemKey: string;
}) => post<StockOpResult<{ discardedLots: number; failed: string[] }>>("/discard-lot", input);

export interface LocationLevelItem {
  productDocumentId: string;
  productName: string;
  stock: number;
  minStock: number | null;
  lotsSum: number;
  lotsCount: number;
}

export const getStockLevels = (location: StockLocation) =>
  call<{ location: string; minStockDefault: number; items: LocationLevelItem[] }>(
    `/levels?pharmacy=${encodeURIComponent(location ?? "bodega")}`
  );

