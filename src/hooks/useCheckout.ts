import { CartItem } from "@/types/product";
import { postVenta } from "@/api/postVenta";
import { patchProductStock } from "@/api/patchProductStock";
import { printReceipt } from "@/lib/print-receipt";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import type { MetodoPago } from "@/types/venta";

interface UseCheckoutParams {
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  isMember: boolean;
  ivaRate: 0 | 8 | 16;
  manualIva: number;
  getPrice: (item: CartItem) => number;
  onSaleComplete: (items: CartItem[]) => void;
  onSetMember: (val: boolean) => void;
  onClear: () => void;
  setCheckoutOpen: (val: boolean) => void;
  setSaleResult: (val: { paymentMethod: MetodoPago; change: number; cardCharge: number } | null) => void;
}

export function useCheckout({
  items,
  subtotal,
  iva,
  total,
  isMember,
  ivaRate,
  manualIva,
  getPrice,
  onSaleComplete,
  setCheckoutOpen,
  setSaleResult,
}: UseCheckoutParams) {
  const { caja, refetchEfectivo } = useCaja();

  async function handleConfirm(
    method: MetodoPago,
    received: number,
    recibidoUSD: number | undefined,
    tipoCambioUsado: number,
    nota: string | undefined,
    montoTarjeta: number,
    montoTransfe: number
  ) {
    const cardBase = montoTarjeta;
    const cardSurcharge = isMember && cardBase > 0 ? cardBase * 0.03 : 0;
    const effectiveTotal = total + cardSurcharge;
    const cashNeeded = total - cardBase - montoTransfe;
    const noChangeMethod = method === "tarjeta" || method === "transfe";
    const change = noChangeMethod ? 0 : received - cashNeeded;
    const operador = getUser()?.username ?? "desconocido";

    let receiptId = 0;
    try {
      receiptId = await postVenta({
        fecha: new Date().toISOString(),
        subtotal,
        iva,
        total: effectiveTotal,
        metodoPago: method,
        montoTarjeta: cardBase,
        montoTransferencia: montoTransfe,
        recibido: received,
        cambio: change > 0 ? change : 0,
        recibidoUSD: recibidoUSD ?? 0,
        tipoCambioUsado,
        estado: "completada",
        operador,
        nota: nota || undefined,
        esMembresia: isMember,
        pharmacies: caja?.pharmacy?.documentId,
        venta: items.map((item) => {
          if (item.type === "product") {
            return {
              type: "product" as const,
              product: item.product.documentId,
              service_rate: null,
              productName: item.product.productName,
              quantity: item.quantity,
              unitPrice: getPrice(item),
              totalLine: getPrice(item) * item.quantity,
            };
          } else {
            return {
              type: "service" as const,
              product: null,
              service_rate: item.serviceRate.documentId,
              productName: item.serviceRate.medical_service?.name ?? "",
              quantity: 1,
              unitPrice: getPrice(item),
              totalLine: getPrice(item),
            };
          }
        }),
      });
    } catch (err) {
      console.error("Error al registrar venta:", err);
    }

    await Promise.allSettled(
      items
        .filter((i): i is Extract<CartItem, { type: "product" }> => i.type === "product")
        .map((i) => patchProductStock(i.product.documentId, i.product.stock_central - i.quantity))
    );
    onSaleComplete(items);

    printReceipt({
      receiptId,
      operador,
      pharmacyName: caja?.pharmacy?.nombre,
      items: items.map((item) => ({
        productName: item.type === "product" ? item.product.productName : item.serviceRate.medical_service?.name ?? "",
        quantity: item.quantity,
        unitPrice: getPrice(item),
        totalLine: getPrice(item) * item.quantity,
      })),
      subtotal,
      iva,
      total,
      ivaRate,
      manualIva,
      paymentMethod: method,
      received,
      change: change > 0 ? change : 0,
      isMember,
      cardSurcharge,
      montoTarjeta: cardBase,
      montoTransfe,
      recibidoUSD,
      tipoCambioUsado,
    });

    if (method !== "tarjeta" && method !== "transfe") refetchEfectivo();
    setCheckoutOpen(false);
    const cardCharge = method === "tarjeta" ? effectiveTotal : cardBase + cardSurcharge;
    setSaleResult({ paymentMethod: method, change: change > 0 ? change : 0, cardCharge });
  }

  return { handleConfirm };
}
