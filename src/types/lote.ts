export interface LoteType {
  id: number;
  documentId: string;
  lotNumber: string;
  expirationDate: string; // "YYYY-MM-DD"
  initialQuantity: number;
  currentAmount: number;
  state: "activo" | "agotado" | "vencido";
  product: { id: number; documentId: string; productName: string };
  compra: { id: number; documentId: string };
}
