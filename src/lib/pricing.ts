import type { CartItem, ProductType } from "@/types/product";

/**
 * Tarifa con la que se cotiza un carrito. Es un solo valor y no tres banderas, así que
 * "Health Pass" y "Precio de proveedor" no pueden quedar activos a la vez.
 *
 * `proveedor` cotiza con `priceMember` porque todavía no existe `priceProveedor` en el
 * backend; el día que exista, solo cambia `productUnitPrice`.
 */
export type PriceMode = "regular" | "member" | "proveedor";

/** Management fee que se cobra sobre el subtotal cuando la tarifa es de proveedor. */
export const MANAGEMENT_FEE_RATE = 0.1;

export function productUnitPrice(product: ProductType, mode: PriceMode): number {
  return (mode === "regular" ? product.price : product.priceMember) ?? 0;
}

/** Precio unitario efectivo de una línea: el override manual gana sobre la tarifa. */
export function itemUnitPrice(item: CartItem, mode: PriceMode): number {
  if (item.overridePrice !== undefined) return item.overridePrice;
  if (item.type === "service") return item.serviceRate.price;
  return productUnitPrice(item.product, mode);
}

/** true cuando la tarifa no es la de mostrador, para resaltar el precio en la UI. */
export function isSpecialPrice(mode: PriceMode): boolean {
  return mode !== "regular";
}
