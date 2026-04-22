export interface VentaItem {
  type: "product" | "service";
  product?: string | null; // product documentId
  service_rate?: string | null; // service-rate documentId
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
}

export interface VentaItemType {
  id: number;
  type: "product" | "service";
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
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
}