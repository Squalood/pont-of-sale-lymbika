import { PharmacyType } from "./pharmacy";

export interface VentaItem {
  type: "product" | "service";
  product?: string | null; // product documentId
  service_rate?: string | null; // service-rate documentId
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
  /**
   * Costo del producto al momento de cobrar. Snapshot, y por eso existe: el catálogo solo
   * guarda el costo de la última compra, así que leerlo al exportar reescribía el costo de
   * todas las ventas pasadas del producto.
   *
   * Congela lo que el catálogo decía ese día, no lo que costó la pieza concreta: dos líneas
   * de lotes distintos del mismo producto guardan el mismo costo.
   */
  unitCost?: number | null; // snapshot
  /**
   * Tasa que se cobró en la línea, incluida la corrección del chip del cajero. Es el código
   * (`iva8`, `exento`), no el monto: el monto se deriva en el reporte.
   */
  tax?: string | null; // snapshot
  lotDocumentId?: string | null; // documentId del lote del que sale la línea [D1]
  lotNumber?: string | null; // snapshot
  expirationDate?: string | null; // snapshot
}

export interface VentaItemType {
  id: number;
  type: "product" | "service";
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
  /** Costo al momento de cobrar. Ausente en ventas previas al campo: ahí hay que caer al catálogo. */
  unitCost?: number | null;
  /**
   * Código de la tasa cobrada en la línea, no el monto. Sin tipar a `ImpuestoLinea` a
   * propósito: es dato crudo de la API, igual que `ProductType.impuesto`, y se valida en
   * `taxRate`.
   */
  tax?: string | null;
  lotDocumentId?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  product: {
    id: number;
    productName: string;
  } | null;
  service_rate: {
    id: number;
    documentId: string;
  } | null;
}

export type MetodoPago = "efectivo" | "tarjeta" | "mixto" | "transfe";

export interface VentaType {
  id: number;
  documentId: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: MetodoPago;
  /** Base cubierta con tarjeta, sin recargo. */
  montoTarjeta?: number;
  montoTransferencia?: number;
  /** Recargo Health Pass cobrado en la terminal. Ausente en ventas previas al campo. */
  recargoTarjeta?: number;
  recibido: number;
  cambio: number;
  recibidoUSD: number;
  tipoCambioUsado: number;
  estado: "completada" | "cancelada";
  operador: string;
  nota?: string;
  esMembresia?: boolean;
  esProveedor?: boolean;
  /** Management fee cobrado. `total` ya lo incluye. Ausente en ventas previas al campo. */
  managementFee?: number;
  venta: VentaItemType[];
  pharmacies?: PharmacyType[] | null;
}

export interface VentaPayload {
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: MetodoPago;
  /** Base cubierta con tarjeta, sin recargo. */
  montoTarjeta?: number;
  montoTransferencia?: number;
  /** Recargo Health Pass cobrado en la terminal. `total` ya lo incluye. */
  recargoTarjeta?: number;
  recibido: number;
  cambio: number;
  recibidoUSD: number;
  tipoCambioUsado: number;
  estado: "completada" | "cancelada";
  operador: string;
  nota?: string;
  esMembresia?: boolean;
  esProveedor?: boolean;
  /** Management fee cobrado. `total` ya lo incluye. */
  managementFee?: number;
  venta: VentaItem[];
  pharmacies?: string;
}