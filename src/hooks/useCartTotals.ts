import { CartItem } from "@/types/product";
import {
  MANAGEMENT_FEE_RATE,
  itemImpuesto,
  itemNetPrice,
  itemUnitPrice,
  type PriceMode,
} from "@/lib/pricing";
import { computeIvaBreakdown } from "@/lib/tax";

export function useCartTotals(items: CartItem[], mode: PriceMode) {
  function getPrice(item: CartItem): number {
    return itemUnitPrice(item, mode);
  }

  // La base sin impuesto es el invariante de la línea; el bruto es esa base con la tasa
  // efectiva encima. Se agregan por línea (no por unidad) para no acumular deriva de
  // redondeo con cantidades grandes.
  const taxableLines = items.map((item) => ({
    impuesto: itemImpuesto(item),
    net: itemNetPrice(item, mode) * item.quantity,
    gross: getPrice(item) * item.quantity,
  }));

  const baseTotal = taxableLines.reduce((sum, l) => sum + l.gross, 0);

  // Management fee: consecuencia automática de la tarifa de proveedor, sobre la mercancía.
  // Se cobra sin IVA trasladado (entra al desglose a tasa 0). Es decisión contable, no
  // técnica: hay que revisarla el día que la factura se siembre desde el impuesto de línea.
  const managementFee = mode === "proveedor" ? baseTotal * MANAGEMENT_FEE_RATE : 0;

  // Fuente única de verdad de los importes mostrados: viene cerrado en centavos, así que
  // subtotal + Σ filas de IVA + fee siempre suma exacto el total impreso.
  const ivaBreakdown = computeIvaBreakdown(taxableLines, managementFee);

  const subtotal = ivaBreakdown.subtotalCents / 100;
  const iva = ivaBreakdown.rows.reduce((sum, r) => sum + r.amountCents, 0) / 100;
  const total = ivaBreakdown.totalCents / 100;

  const totalRegular = items.reduce((sum, item) => {
    if (item.type === "product") return sum + (item.product.price ?? 0) * item.quantity;
    return sum + item.serviceRate.price * item.quantity;
  }, 0);
  const ahorro = mode === "member" ? totalRegular - total : 0;

  return {
    total,
    subtotal,
    iva,
    ahorro,
    getPrice,
    ivaBreakdown,
    /** Mercancía sobre la que se calculó el fee. Es el "precio de proveedor" del ticket. */
    feeBase: baseTotal,
    managementFee,
  };
}
