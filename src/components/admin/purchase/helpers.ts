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
