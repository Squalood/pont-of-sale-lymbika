import { CartItem } from "@/types/product";

const IVA_RATE = 0.08;
const IVA_SLUGS = ["cuidado-belleza", "suplementos"];

export function useCartTotals(items: CartItem[], isMember: boolean, ivaRate: 0 | 8 | 16 = 0) {
  function getPrice(item: CartItem): number {
    if (item.overridePrice !== undefined) return item.overridePrice;
    if (item.type === "service") return item.serviceRate.price;
    return (isMember ? item.product.priceMember : item.product.price) ?? 0;
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
  const total = baseTotal + manualIva;
  const subtotal = baseSubtotal;
  const iva = extractedIva + manualIva;

  const totalRegular = items.reduce((sum, item) => {
    if (item.type === "product") return sum + (item.product.price ?? 0) * item.quantity;
    return sum + item.serviceRate.price * item.quantity;
  }, 0);
  const ahorro = isMember ? totalRegular - total : 0;

  return { total, subtotal, iva, ahorro, getPrice, manualIva, ivaRate };
}
