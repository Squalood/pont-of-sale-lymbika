import { ProveedorType } from "@/types/proveedor";

// Component — payload (para POST/PUT)
export interface CompraItem {
  product: string | null; // product documentId
  productName: string;
  quantity: number;
  costoUnitario: number;
  totalLine: number;
  numeroLote?: string;
  fechaCaducidad?: string; // "YYYY-MM-DD"
  iva?: "iva8" | "iva16" | "exento";
}

// Component — tal como lo devuelve Strapi poblado
export interface CompraItemType {
  id: number;
  productName: string;
  quantity: number;
  costoUnitario: number;
  totalLine: number;
  numeroLote?: string;
  fechaCaducidad?: string;
  iva?: "iva8" | "iva16" | "exento";
  product: {
    id: number;
    documentId: string;
    productName: string;
  } | null;
}

// Documento completo que devuelve Strapi
export interface CompraType {
  id: number;
  documentId: string;
  fecha: string;
  total: number;
  operador: string;
  estado: "registrada" | "cancelada";
  notas?: string | null;
  archivo?: {
    id: number;
    url: string;
    name: string;
    mime: string;
  } | null;
  proveedor: ProveedorType | null;
  items: CompraItemType[];
}

// Payload para crear/actualizar una compra
export interface CompraPayload {
  fecha: string;
  total: number;
  operador: string;
  estado: "registrada" | "cancelada";
  notas?: string;
  proveedor?: string; // proveedor documentId
  /** Farmacia a la que entra la mercancía (documentId). Ausente = bodega central. */
  destination_pharmacy?: string;
  items: CompraItem[];
}