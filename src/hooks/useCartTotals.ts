import { CartItem } from "@/types/product";
import {
  itemFeeAmount,
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
  // efectiva encima. En tarifa de proveedor los dos ya traen el management fee dentro,
  // porque el fee es parte del precio de la línea. Se agregan por línea (no por unidad)
  // para no acumular deriva de redondeo con cantidades grandes.
  const taxableLines = items.map((item) => ({
    impuesto: itemImpuesto(item),
    net: itemNetPrice(item, mode) * item.quantity,
    gross: getPrice(item) * item.quantity,
  }));

  // Fuente única de verdad de los importes mostrados: viene cerrado en centavos, así que
  // subtotal + Σ filas de IVA siempre suma exacto el total impreso.
  const ivaBreakdown = computeIvaBreakdown(taxableLines);

  const subtotal = ivaBreakdown.subtotalCents / 100;
  const iva = ivaBreakdown.rows.reduce((sum, r) => sum + r.amountCents, 0) / 100;
  const total = ivaBreakdown.totalCents / 100;

  // Fee contenido en el total, solo para mostrarlo y guardarlo. NO se suma: ya está dentro
  // de cada línea. `feeBase` es la mercancía a precio de proveedor antes del fee.
  const managementFee =
    Math.round(items.reduce((sum, i) => sum + itemFeeAmount(i, mode) * i.quantity, 0) * 100) / 100;
  const feeBase = Math.round((total - managementFee) * 100) / 100;

  const totalRegular = items.reduce((sum, item) => {
    if (item.type === "product") return sum + (item.product.price ?? 0) * item.quantity;
    return sum + item.serviceRate.price * item.quantity;
  }, 0);
  const ahorro = mode === "member" ? totalRegular - total : 0;

  return { total, subtotal, iva, ahorro, getPrice, ivaBreakdown, feeBase, managementFee };
}
