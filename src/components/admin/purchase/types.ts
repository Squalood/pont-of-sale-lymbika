// Renglón de lote dentro de un producto de la compra. Número y caducidad son opcionales:
// un renglón con solo cantidad (sin número) equivale a "sin lote" (solo suma stock).
export interface LoteRow {
  numeroLote: string;
  cantidad: number;
  fechaCaducidad?: string; // "YYYY-MM-DD"
}

// Un producto de la compra agrupa uno o más renglones de lote. Costo e IVA son por producto;
// la cantidad total del producto = Σ cantidades de sus lotes.
export interface LocalPurchaseItem {
  productId: number;
  product: string; // product documentId
  productName: string;
  /**
   * Stock del producto al momento de agregarlo, leído del resultado de búsqueda.
   * Al confirmar se escribe `stockActual + cantidad`: el dialogo ya no tiene el
   * catálogo en memoria de donde releerlo.
   */
  stockActual: number;
  costoUnitario: number;
  iva: "iva8" | "iva16" | "exento";
  lotes: LoteRow[];
}
