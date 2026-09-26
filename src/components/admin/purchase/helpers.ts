import { productImpuesto, type ImpuestoProducto } from "@/lib/pricing";
import type { ProductType } from "@/types/product";
import { LocalPurchaseItem, LoteRow } from "./types";

/** Tasa decimal del IVA de la compra. */
export function ivaTasa(iva?: "iva8" | "iva16" | "exento"): number {
  if (iva === "iva8") return 0.08;
  if (iva === "iva16") return 0.16;
  return 0;
}

const centavos = (n: number) => Math.round(n * 100) / 100;

/**
 * Importe de un renglon con IVA, **cerrado en centavos por renglon**.
 *
 * Es como factura el proveedor: el CFDI redondea el importe y el impuesto de cada
 * concepto a dos decimales y luego suma. Arrastrar los decimales y redondear solo al
 * final descuadra contra la factura — en la compra #00331 daba 1,360.7472 contra los
 * 1,360.76 de NADRO, porque los tres conceptos gravados perdian medio centavo cada uno.
 */
export function loteTotalLine(lote: LoteRow, iva?: LocalPurchaseItem["iva"]): number {
  const importe = centavos((lote.cantidad || 0) * (lote.costoUnitario || 0));
  const impuesto = centavos(importe * ivaTasa(iva));
  return centavos(importe + impuesto);
}

// Cantidad total del producto = Σ cantidades de sus lotes.
export function itemQuantity(item: LocalPurchaseItem): number {
  return item.lotes.reduce((sum, l) => sum + (l.cantidad || 0), 0);
}

// Importe del producto: cada renglon aporta su cantidad por SU costo. Multiplicar la
// cantidad total por un costo unico perdia los centavos cuando el proveedor factura el
// mismo articulo a precios distintos.
export function itemTotalLine(item: LocalPurchaseItem): number {
  return centavos(item.lotes.reduce((sum, l) => sum + loteTotalLine(l, item.iva), 0));
}

/** El mas alto de los renglones: no subvalua el margen cuando la compra trae precios mixtos. */
export function itemCostoMasAlto(item: LocalPurchaseItem): number {
  return item.lotes.reduce((max, l) => Math.max(max, l.costoUnitario || 0), 0);
}

/** Costo que hereda el producto en el catalogo: el tecleado a mano, o el mas alto. */
export function itemCostoParaCatalogo(item: LocalPurchaseItem): number {
  return item.costoCatalogo ?? itemCostoMasAlto(item);
}

export function comprasTotal(items: LocalPurchaseItem[]): number {
  return centavos(items.reduce((sum, i) => sum + itemTotalLine(i), 0));
}

/**
 * Tasa que se escribe en `product.impuesto` al registrar la compra. El vocabulario no es el
 * mismo en los dos lados: la compra usa `exento` y el enum del producto en Strapi solo
 * acepta iva0/iva8/iva16, así que `exento` entra como `iva0` — el mismo default que aplica
 * `productImpuesto` cuando el campo viene vacío.
 */
export function ivaToImpuestoProducto(iva: LocalPurchaseItem["iva"]): ImpuestoProducto {
  return iva === "exento" ? "iva0" : iva;
}

/**
 * Tasa con la que se precarga un renglón de compra: la que el producto ya tiene.
 *
 * Es el inverso de `ivaToImpuestoProducto`. Importa porque al confirmar, la compra
 * **sobrescribe** el `impuesto` del producto con lo que tenga el renglón: si el valor
 * inicial fuera "exento", toda compra registrada sin tocar el chip pondría la tasa en cero
 * y borraría la captura previa.
 */
export function ivaDesdeProducto(product: ProductType): LocalPurchaseItem["iva"] {
  const actual = productImpuesto(product);
  return actual === "iva0" ? "exento" : actual;
}
