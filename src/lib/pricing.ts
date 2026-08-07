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

/**
 * Precio **sin impuesto** de una línea. Es el invariante: se despeja del precio de lista
 * con el impuesto que trae el producto, y no se mueve al corregir la tasa en el mostrador.
 */
export function itemNetPrice(item: CartItem, mode: PriceMode): number {
  if (item.overridePrice !== undefined) {
    // Un precio tecleado a mano es lo que paga el cliente, así que de ahí se extrae.
    return item.overridePrice / (1 + taxRate(itemImpuesto(item)));
  }
  if (item.type === "service") return item.serviceRate.price;
  const listado = productUnitPrice(item.product, mode);
  return listado / (1 + taxRate(productImpuesto(item.product)));
}

/**
 * Precio unitario que se cobra: base sin impuesto × la tasa efectiva.
 *
 * Sin correcciones devuelve el precio de lista tal cual — se corta el cálculo para que sea
 * bit-exacto y no aparezca deriva de `price / 1.08 * 1.08`.
 */
export function itemUnitPrice(item: CartItem, mode: PriceMode): number {
  if (item.overridePrice !== undefined) return item.overridePrice;
  if (item.type === "service") return item.serviceRate.price;
  const efectivo = itemImpuesto(item);
  const delProducto = productImpuesto(item.product);
  const listado = productUnitPrice(item.product, mode);
  if (efectivo === delProducto) return listado;
  return (listado / (1 + taxRate(delProducto))) * (1 + taxRate(efectivo));
}

/** true cuando la tarifa no es la de mostrador, para resaltar el precio en la UI. */
export function isSpecialPrice(mode: PriceMode): boolean {
  return mode !== "regular";
}

/**
 * Código de impuesto de una línea. El precio de lista trae su impuesto dentro; la base sin
 * impuesto es el invariante y la tasa efectiva define qué se cobra encima de esa base. Por
 * eso corregir la tasa **sí mueve** el total: cambia el impuesto que se le suma a la base.
 *
 * Nombre distinto a propósito: `ImpuestoType` ya existe en types/factura.ts y en
 * admin/purchase/types.ts con OTRO conjunto de valores.
 *
 * Ojo: `ivaMultiplier` en admin/purchase/helpers.ts es la operación inversa (multiplica
 * por 1.08 para AGREGAR el impuesto). No reusarlo aquí.
 */
const IMPUESTO_VALUES = ["iva0", "iva8", "iva16", "exento"] as const;

export type ImpuestoLinea = (typeof IMPUESTO_VALUES)[number];

/** Códigos que el cajero puede elegir por línea de producto. */
export const IMPUESTO_OPTIONS = ["iva0", "iva8", "iva16"] as const satisfies readonly ImpuestoLinea[];

const IVA_RATES: Record<ImpuestoLinea, number> = {
  iva0: 0,
  iva8: 0.08,
  iva16: 0.16,
  exento: 0,
};

// TODO: quitar tras el backfill de `impuesto` en Strapi. Los productos creados antes del
// campo llegan con `impuesto: null`, y sin este fallback perderían su 8% en silencio.
const LEGACY_IVA8_SLUGS = ["cuidado-belleza", "suplementos"];

function isImpuestoLinea(value: unknown): value is ImpuestoLinea {
  return typeof value === "string" && (IMPUESTO_VALUES as readonly string[]).includes(value);
}

/**
 * Tasa decimal de un código de impuesto. Valida la entrada porque `product.impuesto`
 * llega sin tipar de la API: un valor fuera del enum daría `undefined` y propagaría NaN
 * a todos los totales (y `JSON.stringify` lo mandaría a Strapi como `null`).
 */
export function taxRate(impuesto: string | null | undefined): number {
  return isImpuestoLinea(impuesto) ? IVA_RATES[impuesto] : 0;
}

export function impuestoLabel(impuesto: ImpuestoLinea): string {
  switch (impuesto) {
    case "iva8":
      return "IVA 8%";
    case "iva16":
      return "IVA 16%";
    case "exento":
      return "Exento";
    default:
      return "Sin IVA";
  }
}

/**
 * Impuesto que el precio de lista del producto trae dentro. Es el divisor con el que se
 * despeja la base, así que nunca considera la corrección del cajero.
 */
export function productImpuesto(product: ProductType): ImpuestoLinea {
  if (isImpuestoLinea(product.impuesto)) return product.impuesto;
  return LEGACY_IVA8_SLUGS.includes(product.category?.slug ?? "") ? "iva8" : "iva0";
}

/** Impuesto que se cobra en la línea: corrección del cajero > el del producto. */
export function itemImpuesto(item: CartItem): ImpuestoLinea {
  // Los servicios médicos son exentos por ley y no tienen el campo en Strapi.
  if (item.type === "service") return "exento";
  return item.overrideImpuesto ?? productImpuesto(item.product);
}
