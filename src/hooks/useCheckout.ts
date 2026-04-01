import { CartItem } from "@/types/product";
import { postVenta } from "@/api/postVenta";
import { patchProductStock } from "@/api/patchProductStock";
import { printReceipt } from "@/lib/print-receipt";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";

interface UseCheckoutParams {
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  isMember: boolean;
  tipoCambio: number;
  getPrice: (item: CartItem) => number;
  onSaleComplete: (items: CartItem[]) => void;
  onSetMember: (val: boolean) => void;
  onClear: () => void;
  setCheckoutOpen: (val: boolean) => void;
  setSaleResult: (val: { paymentMethod: "efectivo" | "tarjeta"; change: number } | null) => void;
}

export function useCheckout({
  items,
  subtotal,
  iva,
  total,
  isMember,
  tipoCambio,
  getPrice,
  onSaleComplete,
  setCheckoutOpen,
  setSaleResult,
}: UseCheckoutParams) {
  const { refetchEfectivo } = useCaja();

  async function handleConfirm(
    method: "efectivo" | "tarjeta",
    received: number,
    recibidoUSD: number | undefined,
    tipoCambioUsado: number,
    nota: string | undefined
  ) {
    const change = received - total;
    const operador = getUser()?.username ?? "desconocido";

    let receiptId = 0;
    try {
      receiptId = await postVenta({
        fecha: new Date().toISOString(),
        subtotal,
        iva,
        total,
        metodoPago: method,
        recibido: received,
        cambio: change > 0 ? change : 0,
        recibidoUSD: recibidoUSD ?? 0,
        tipoCambioUsado,
        estado: "completada",
        operador,
        nota: nota || undefined,
        esMembresia: isMember,
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
              productName: item.serviceRate.medical_service.name,
              quantity: 1,
              unitPrice: item.serviceRate.price,
              totalLine: item.serviceRate.price,
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

    const cardSurcharge = isMember && method === "tarjeta" ? total * 0.03 : 0;

    printReceipt({
      receiptId,
      operador,
      items: items.map((item) => ({
        productName: item.type === "product" ? item.product.productName : item.serviceRate.medical_service.name,
        quantity: item.quantity,
        unitPrice: getPrice(item),
        totalLine: getPrice(item) * item.quantity,
      })),
      subtotal,
      iva,
      total,
      paymentMethod: method,
      received,
      change: change > 0 ? change : 0,
      isMember,
      cardSurcharge,
      recibidoUSD,
      tipoCambioUsado,
    });

    if (method === "efectivo") refetchEfectivo();
    setCheckoutOpen(false);
    setSaleResult({ paymentMethod: method, change: change > 0 ? change : 0 });
  }

  return { handleConfirm };
}
