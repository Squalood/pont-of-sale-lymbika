import type { CartItem, ProductType } from "@/types/product";

/**
 * Tarifa con la que se cotiza un carrito. Es un solo valor y no tres banderas, así que
 * "Health Pass" y "Precio de proveedor" no pueden quedar activos a la vez.
 *
 * `proveedor` cotiza con `priceMember` porque todavía no existe `priceProveedor` en el
 * backend; el día que exista, solo cambia `productUnitPrice`.
 */
export type PriceMode = "regular" | "member" | "proveedor";

/**
 * Management fee de la tarifa de proveedor. Va **dentro del precio de cada línea**, no
 * como cargo aparte al final: el precio cobrado es el de proveedor × 1.10.
 *
 * Consecuencia buscada: como el precio incluye IVA, el fee carga el impuesto de su propia
 * línea. Un cosmético al 16% declara 10% más de IVA que su precio sin fee.
 */
export const MANAGEMENT_FEE_RATE = 0.1;

export function productUnitPrice(product: ProductType, mode: PriceMode): number {
  return (mode === "regular" ? product.price : product.priceMember) ?? 0;
}

/**
 * Precio de catálogo con su tasa encima: lo que se va a cobrar.
 *
 * Existe para las pantallas que listan catálogo —tarjetas del POS, tabla de productos— que
 * no arman un `CartItem` y por eso no pueden usar `itemUnitPrice`. Sin esto el cajero ve un
 * número en la tarjeta y otro distinto al pasarlo al carrito, que es justo la confusión que
 * dejó el catálogo con dos convenciones mezcladas.
 *
 * No aplica el management fee: las listas se muestran a precio de mostrador.
 */
export function productPriceConImpuesto(product: ProductType, mode: PriceMode): number {
  return productUnitPrice(product, mode) * (1 + taxRate(productImpuesto(product)));
}

/** Lo mismo para la tarifa de un servicio, que siempre va a `SERVICE_IMPUESTO`. */
export function servicePriceConImpuesto(price: number): number {
  return price * (1 + taxRate(SERVICE_IMPUESTO));
}

/** Precio de lista de la línea, antes del fee: tarifa del producto o del servicio. */
function listPrice(item: CartItem, mode: PriceMode): number {
  if (item.type === "service") return item.serviceRate.price;
  return productUnitPrice(item.product, mode);
}

/** El fee de proveedor multiplica el precio de la línea, productos y servicios por igual. */
function withFee(amount: number, mode: PriceMode): number {
  return mode === "proveedor" ? amount * (1 + MANAGEMENT_FEE_RATE) : amount;
}

/**
 * Precio **sin impuesto** de una línea, y el invariante del que cuelga todo lo demás.
 *
 * Todo precio de catálogo viene neto —`price`, `priceMember` y la tarifa de un servicio—
 * así que el precio de lista ya *es* la base: no hay nada que despejar. La única excepción
 * es el precio tecleado a mano, que es lo que paga el cliente y por eso se extrae de ahí.
 */
export function itemNetPrice(item: CartItem, mode: PriceMode): number {
  if (item.overridePrice !== undefined) {
    return item.overridePrice / (1 + taxRate(itemImpuesto(item)));
  }
  return withFee(listPrice(item, mode), mode);
}

/**
 * Precio unitario que se cobra: la base sin impuesto, con la tasa efectiva encima. Una sola
 * multiplicación, sin casos por tipo de línea ni por tarifa.
 *
 * Corregir la tasa con el chip mueve el total, porque mueve lo que se le suma a la base.
 */
export function itemUnitPrice(item: CartItem, mode: PriceMode): number {
  // El precio tecleado a mano es final: no se le agrega el fee ni el impuesto.
  if (item.overridePrice !== undefined) return item.overridePrice;
  return withFee(listPrice(item, mode), mode) * (1 + taxRate(itemImpuesto(item)));
}

/**
 * Porción del precio unitario de la línea que corresponde al management fee. Es
 * informativa: ya está dentro de `itemUnitPrice`, no se suma aparte.
 */
export function itemFeeAmount(item: CartItem, mode: PriceMode): number {
  if (mode !== "proveedor" || item.overridePrice !== undefined) return 0;
  const cobrado = itemUnitPrice(item, mode);
  return cobrado - cobrado / (1 + MANAGEMENT_FEE_RATE);
}

/** true cuando la tarifa no es la de mostrador, para resaltar el precio en la UI. */
export function isSpecialPrice(mode: PriceMode): boolean {
  return mode !== "regular";
}

/**
 * Código de impuesto de una línea. El precio de lista es la base sin impuesto, y la tasa
 * efectiva define qué se cobra encima de ella. Por eso corregir la tasa **sí mueve** el
 * total: cambia el impuesto que se le suma a la base.
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
 * Impuesto de los servicios médicos. Fijo y no editable porque el backend no lo manda: la
 * tarifa viene neta, igual que el precio de un producto, y el 8% se le suma al cobrar.
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
