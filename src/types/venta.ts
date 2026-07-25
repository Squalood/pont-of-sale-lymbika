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
  montoTarjeta?: number;
  montoTransferencia?: number;
  recibido: number;
  cambio: number;
  recibidoUSD: number;
  tipoCambioUsado: number;
  estado: "completada" | "cancelada";
  operador: string;
  nota?: string;
  esMembresia?: boolean;
  venta: VentaItemType[];
  pharmacies?: PharmacyType[] | null;
}

export interface VentaPayload {
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: MetodoPago;
  montoTarjeta?: number;
  montoTransferencia?: number;
  recibido: number;
  cambio: number;
  recibidoUSD: number;
  tipoCambioUsado: number;
  estado: "completada" | "cancelada";
  operador: string;
  nota?: string;
  esMembresia?: boolean;
  venta: VentaItem[];
  pharmacies?: string;
}