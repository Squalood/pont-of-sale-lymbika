// Renglón de lote dentro de un producto de la compra. Número y caducidad son opcionales:
// un renglón con solo cantidad (sin número) equivale a "sin lote" (solo suma stock).
//
// El costo vive aquí y no en el producto porque el proveedor factura por renglón: el mismo
// artículo puede llegar en la misma compra a precios distintos (ver la compra #00331).
export interface LoteRow {
  numeroLote: string;
  cantidad: number;
  costoUnitario: number;
  fechaCaducidad?: string; // "YYYY-MM-DD"
}

// Un producto de la compra agrupa uno o más renglones de lote. El IVA es por producto —es su
// tasa fiscal, no la del lote—; la cantidad y el importe salen de sumar sus renglones.
export interface LocalPurchaseItem {
  productId: number;
  product: string; // product documentId
  productName: string;
  /**
   * Stock del producto al momento de agregarlo, leído del resultado de búsqueda. Solo
   * informativo: el ingreso lo calcula el servidor (/pos-stock/purchase) sobre el valor real.
   */
  stockActual: number;
  iva: "iva8" | "iva16" | "exento";
  /**
   * Costo que se escribira en `priceMember` del producto. `undefined` lo deja en
   * automatico: el mas alto de los renglones. Se fija solo cuando el operador lo
   * teclea a mano, para poder corregir un precio de catalogo que los renglones de
   * esta compra no representan bien.
   */
  costoCatalogo?: number;
  lotes: LoteRow[];
}
