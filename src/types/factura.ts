export interface FacturaItemPayload {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: "iva16" | "iva8" | "exento";
  product?: string | null; // documentId
}

export interface FacturaPayload {
  /** `null` en un borrador sin folio: el folio se asigna al generar. */
  folio?: string | null;
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
  /** Un borrador se guarda sin imprimir y es lo único editable; al generarlo pasa a "emitida". */
  estado: "borrador" | "emitida";
  estadoPago?: "pendiente" | "pagada" | "pagada_parcial";
  montoPagado?: number;
  fechaPago?: string | null;
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
  product: { id: number; documentId: string; productName: string } | null;
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
  estado: "borrador" | "emitida" | "cancelada";
  estadoPago: "pendiente" | "pagada" | "pagada_parcial";
  montoPagado: number;
  fechaPago: string | null;
  items: FacturaItemType[];
  pharmacy: {
    id: number;
    documentId: string;
    nombre: string;
    razonSocial?: string | null;
    rfc?: string | null;
    direccion?: string | null;
    contacto_tel?: string | null;
    contacto_email?: string | null;
  } | null;
}
