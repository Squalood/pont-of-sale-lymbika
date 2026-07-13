export interface FacturaItemPayload {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: "iva16" | "iva8" | "exento";
  product?: string | null; // documentId
}

export interface FacturaPayload {
  folio?: string;
  fecha: string; // ISO
  fechaVencimiento?: string | null;
  cliente: string;
  rfc?: string;
  tipoCliente?: "empresa" | "particular";
  formaDePago?: string;
  politicaDePago?: string;
  usoCfdi?: string;
  cfdiAlPublico?: boolean;
  diario?: string;
  cfdiOrigen?: string;
  subtotal: number;
  iva16: number;
  iva8: number;
  total: number;
  estado: "emitida";
  items: FacturaItemPayload[];
  pharmacy?: string;  // documentId
  venta_pos?: string; // documentId
}

export interface FacturaItemType {
  id: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: "iva16" | "iva8" | "exento";
  product: { id: number; productName: string } | null;
}

export interface FacturaType {
  id: number;
  documentId: string;
  folio: string;
  fecha: string;
  fechaVencimiento: string | null;
  cliente: string;
  rfc: string | null;
  tipoCliente: "empresa" | "particular" | null;
  formaDePago: string | null;
  politicaDePago: string | null;
  usoCfdi: string | null;
  cfdiAlPublico: boolean;
  diario: string | null;
  cfdiOrigen: string | null;
  subtotal: number;
  iva16: number;
  iva8: number;
  total: number;
  estado: "emitida" | "cancelada";
  items: FacturaItemType[];
  pharmacy: { id: number; documentId: string; nombre: string } | null;
}
