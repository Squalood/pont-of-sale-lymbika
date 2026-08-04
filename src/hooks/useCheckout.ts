import { toast } from "sonner";
import { CartItem } from "@/types/product";
import { postVenta } from "@/api/postVenta";
import { patchProductStock } from "@/api/patchProductStock";
import { patchLote } from "@/api/patchLote";
import { printReceipt } from "@/lib/print-receipt";
import { CARD_SURCHARGE_RATE } from "@/lib/checkout-math";
import type { PriceMode } from "@/lib/pricing";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import type { MetodoPago } from "@/types/venta";

interface UseCheckoutParams {
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  priceMode: PriceMode;
  ivaRate: 0 | 8 | 16;
  manualIva: number;
  managementFee: number;
  feeBase: number;
  getPrice: (item: CartItem) => number;
  onSaleComplete: (items: CartItem[]) => void;
  setCheckoutOpen: (val: boolean) => void;
  setSaleResult: (val: { paymentMethod: MetodoPago; change: number; cardCharge: number } | null) => void;
}

export function useCheckout({
  items,
  subtotal,
  iva,
  total,
  priceMode,
  ivaRate,
  manualIva,
  managementFee,
  feeBase,
  getPrice,
  onSaleComplete,
  setCheckoutOpen,
  setSaleResult,
}: UseCheckoutParams) {
  const { caja, refetchEfectivo } = useCaja();
  const isMember = priceMode === "member";

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
    const cardSurcharge = isMember && cardBase > 0 ? cardBase * CARD_SURCHARGE_RATE : 0;
    const effectiveTotal = total + cardSurcharge;
    const cashNeeded = total - cardBase - montoTransfe;
    const noChangeMethod = method === "tarjeta" || method === "transfe";
    const change = noChangeMethod ? 0 : received - cashNeeded;
    const operador = getUser()?.username ?? "desconocido";

    const productLines = items.filter(
      (i): i is Extract<CartItem, { type: "product" }> => i.type === "product"
    );

    // 1. Registrar la venta PRIMERO. Si falla, abortar: no se descuenta inventario ni se imprime. [A5]
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
        recargoTarjeta: cardSurcharge,
        recibido: received,
        cambio: change > 0 ? change : 0,
        recibidoUSD: recibidoUSD ?? 0,
        tipoCambioUsado,
        estado: "completada",
        operador,
        nota: nota || undefined,
        esMembresia: isMember,
        esProveedor: priceMode === "proveedor",
        managementFee,
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
              lotDocumentId: item.selectedLot?.documentId ?? null,
              lotNumber: item.selectedLot?.lotNumber ?? null,
              expirationDate: item.selectedLot?.expirationDate ?? null,
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
      toast.error("No se registró la venta. No se descontó inventario.", {
        description: err instanceof Error ? err.message : undefined,
      });
      return;
    }

    // 2. Descuento en lockstep: stock_central agregado por producto + currentAmount por lote-línea. [A3]
    const perProduct = new Map<string, { documentId: string; baseStock: number; totalQty: number }>();
    productLines.forEach((l) => {
      const cur = perProduct.get(l.product.documentId) ?? {
        documentId: l.product.documentId,
        baseStock: l.product.stock_central,
        totalQty: 0,
      };
      cur.totalQty += l.quantity;
      perProduct.set(l.product.documentId, cur);
    });

    const ops: Promise<void>[] = [];
    // stock_central: siempre, agregado por producto (con o sin lote).
    perProduct.forEach((p) => ops.push(patchProductStock(p.documentId, p.baseStock - p.totalQty)));
    // patchLote: solo para líneas que salieron de un lote concreto.
    productLines.forEach((l) => {
      if (!l.selectedLot) return; // línea sin lote → ya se descontó stock_central, nada más
      const selected = l.selectedLot;
      const lot = l.product.inventory_lots?.find((x) => x.documentId === selected.documentId);
      const newAmount = Math.max(0, (lot?.currentAmount ?? 0) - l.quantity);
      ops.push(
        patchLote(
          selected.documentId,
          newAmount === 0 ? { currentAmount: 0, state: "agotado" } : { currentAmount: newAmount }
        )
      );
    });

    const results = await Promise.allSettled(ops);
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      toast.warning(
        `Venta registrada, pero ${failures} ajuste(s) de inventario fallaron. Corre la reconciliación de lotes.`
      );
    }
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
        lotNumber: item.type === "product" ? item.selectedLot?.lotNumber : undefined,
        expirationDate: item.type === "product" ? item.selectedLot?.expirationDate : undefined,
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
      managementFee,
      feeBase,
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
