import type { ImpuestoProducto } from "@/lib/pricing";
import { LocalPurchaseItem } from "./types";

export function ivaMultiplier(iva?: "iva8" | "iva16" | "exento"): number {
  if (iva === "iva8") return 1.08;
  if (iva === "iva16") return 1.16;
  return 1;
}

// Cantidad total del producto = Σ cantidades de sus lotes.
export function itemQuantity(item: LocalPurchaseItem): number {
  return item.lotes.reduce((sum, l) => sum + (l.cantidad || 0), 0);
}

export function itemTotalLine(item: LocalPurchaseItem): number {
  return itemQuantity(item) * item.costoUnitario * ivaMultiplier(item.iva);
}

export function comprasTotal(items: LocalPurchaseItem[]): number {
  return items.reduce((sum, i) => sum + itemTotalLine(i), 0);
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
