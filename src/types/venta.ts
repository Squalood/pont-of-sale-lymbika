export interface VentaItem {
  product: number; // product ID
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
}

export interface VentaItemType {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
  product: {
    id: number;
    productName: string;
  } | null;
}

export interface VentaType {
  id: number;
  documentId: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: "efectivo" | "tarjeta";
  recibido: number;
  cambio: number;
  estado: "completada" | "cancelada";
  operador: string;
  venta: VentaItemType[];
}

export interface VentaPayload {
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: "efectivo" | "tarjeta";
  recibido: number;
  cambio: number;
  estado: "completada" | "cancelada";
  operador: string;
  venta: VentaItem[];
}
