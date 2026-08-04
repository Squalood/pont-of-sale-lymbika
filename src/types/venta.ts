import { PharmacyType } from "./pharmacy";

export interface VentaItem {
  type: "product" | "service";
  product?: string | null; // product documentId
  service_rate?: string | null; // service-rate documentId
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
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