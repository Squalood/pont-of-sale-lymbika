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
  // La tarifa del servicio también trae su impuesto dentro.
  if (item.type === "service") return item.serviceRate.price / (1 + taxRate(SERVICE_IMPUESTO));
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

/**
 * Códigos válidos para un producto, y las opciones que se pueden elegir en la UI. `exento`
 * queda fuera a propósito: es solo para servicios, y el enum de Strapi no lo acepta.
 */
export const IMPUESTO_OPTIONS = ["iva0", "iva8", "iva16"] as const satisfies readonly ImpuestoLinea[];

export type ImpuestoProducto = (typeof IMPUESTO_OPTIONS)[number];

/**
 * Impuesto de los servicios médicos. Fijo y no editable: el backend no lo manda y el precio
 * de la tarifa ya lo trae dentro, así que solo se desglosa para mostrarlo.
 */
export const SERVICE_IMPUESTO: ImpuestoLinea = "iva8";

const IVA_RATES: Record<ImpuestoLinea, number> = {
  iva0: 0,
  iva8: 0.08,
  iva16: 0.16,
  exento: 0,
};

function isImpuestoLinea(value: unknown): value is ImpuestoLinea {
  return typeof value === "string" && (IMPUESTO_VALUES as readonly string[]).includes(value);
}

function isImpuestoProducto(value: unknown): value is ImpuestoProducto {
  return typeof value === "string" && (IMPUESTO_OPTIONS as readonly string[]).includes(value);
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
 * Impuesto que el precio de lista del producto trae dentro, según el backend. Es el divisor
 * con el que se despeja la base, así que nunca considera la corrección del cajero.
 *
 * El backend es la única autoridad: no hay inferencia por categoría. Un producto sin
 * `impuesto` capturado se cobra sin IVA, y se corrige en Strapi (o con el chip, para esa
 * venta).
 */
export function productImpuesto(product: ProductType): ImpuestoProducto {
  return isImpuestoProducto(product.impuesto) ? product.impuesto : "iva0";
}

/** Impuesto que se cobra en la línea: corrección del cajero > el del producto. */
export function itemImpuesto(item: CartItem): ImpuestoLinea {
  if (item.type === "service") return SERVICE_IMPUESTO;
  return item.overrideImpuesto ?? productImpuesto(item.product);
}
