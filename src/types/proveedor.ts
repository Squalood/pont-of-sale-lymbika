export interface ProveedorType {
  id: number;
  documentId: string;
  name: string;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
  notas?: string | null;
}

export interface ProveedorPayload {
  name: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  notas?: string;
}