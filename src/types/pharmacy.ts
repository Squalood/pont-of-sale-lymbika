export interface PharmacyType {
  id: number;
  documentId: string;
  nombre: string;
  clave: string;
  razonSocial?: string | null;
  rfc?: string | null;
  direccion?: string | null;
  contacto_email?: string | null;
  contacto_tel?: string | null;
  min_stock_default: number;
  is_b2b: boolean;
  estado: "activo" | "inactivo";
}
