/** Motivo de merma. Los valores son literalmente los del enum `discardReason` de
 *  Strapi, en inglés como el resto de los campos del content-type; la etiqueta en
 *  español vive solo en la UI. */
export type DiscardReason = "expired" | "damaged" | "theft" | "other";

export const DISCARD_REASONS: DiscardReason[] = ["expired", "damaged", "theft", "other"];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  expired: "Caducado",
  damaged: "Dañado",
  theft: "Robo",
  other: "Otro",
};

export type LoteState = "activo" | "agotado" | "vencido";

/** Documento completo de `inventory-lot`, tal como lo devuelve `useGetLotes`.
 *  El lote que viaja dentro del producto en el POS es el más ligero
 *  `InventoryLotOnProduct` (`@/types/product`). */
export interface LoteType {
  id: number;
  documentId: string;
  lotNumber: string;
  /** Nulo cuando la compra no capturó caducidad; `getSellableLots` lo trata como
   *  la centinela 2099-12-31, o sea "sin caducidad real". */
  expirationDate: string | null;
  /** Nulo en buena parte de los lotes históricos, capturados antes del campo. */
  initialQuantity: number | null;
  currentAmount: number;
  state: LoteState;
  /** `stock_central` viene poblado para poder ajustar el stock al desechar sin un
   *  segundo fetch. Nulo si la relación se rompió: un lote así no se puede desechar. */
  product: {
    id: number;
    documentId: string;
    productName: string;
    stock_central: number;
  } | null;
  /** El lote de apertura no nace de una compra. */
  compra: { id: number; documentId: string } | null;

  // Merma. Solo tienen valor en lotes con `state: "vencido"`.
  discardedAt?: string | null;
  discardedBy?: string | null;
  discardedQuantity?: number | null;
  discardReason?: DiscardReason | null;
}
