import { CartItem } from "@/types/product";
import { MANAGEMENT_FEE_RATE, itemUnitPrice, type PriceMode } from "@/lib/pricing";

const IVA_RATE = 0.08;
const IVA_SLUGS = ["cuidado-belleza", "suplementos"];

export function useCartTotals(items: CartItem[], mode: PriceMode, ivaRate: 0 | 8 | 16 = 0) {
  function getPrice(item: CartItem): number {
    return itemUnitPrice(item, mode);
  }

  function itemHasIva(item: CartItem): boolean {
    return item.type === "product" && IVA_SLUGS.includes(item.product.category?.slug ?? "");
  }

  const totalWithIva = items.reduce(
    (sum, item) => (itemHasIva(item) ? sum + getPrice(item) * item.quantity : sum),
    0
  );
  const totalWithoutIva = items.reduce(
    (sum, item) => (!itemHasIva(item) ? sum + getPrice(item) * item.quantity : sum),
    0
  );
  const baseTotal = totalWithIva + totalWithoutIva;
  const baseSubtotal = totalWithIva / (1 + IVA_RATE) + totalWithoutIva;
  const extractedIva = baseTotal - baseSubtotal;

  const manualIva = (ivaRate / 100) * baseTotal;

  // Management fee: consecuencia automática de la tarifa de proveedor, sobre la mercancía.
  // No entra en la base del IVA manual, así que el selector de IVA se comporta igual que antes.
  const managementFee = mode === "proveedor" ? baseTotal * MANAGEMENT_FEE_RATE : 0;

  const total = baseTotal + manualIva + managementFee;
  const subtotal = baseSubtotal;
  const iva = extractedIva + manualIva;

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
    manualIva,
    ivaRate,
    /** Mercancía sobre la que se calculó el fee. Es el "precio de proveedor" del ticket. */
    feeBase: baseTotal,
    managementFee,
  };
}
