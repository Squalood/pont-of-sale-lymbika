import { toast } from "sonner";
import { CartItem } from "@/types/product";
import { postVenta } from "@/api/postVenta";
import type { StockLevel } from "@/api/posStock";
import { flushPendingStock, runOrQueue } from "@/lib/pending-stock";
import { printReceipt } from "@/lib/print-receipt";
import { CARD_SURCHARGE_RATE } from "@/lib/checkout-math";
import { itemImpuesto, type PriceMode } from "@/lib/pricing";
import type { IvaBreakdown } from "@/lib/tax";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import type { MetodoPago } from "@/types/venta";

interface UseCheckoutParams {
  items: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  priceMode: PriceMode;
  ivaBreakdown: IvaBreakdown;
  managementFee: number;
  feeBase: number;
  getPrice: (item: CartItem) => number;
  /** `levels` = niveles reales que devolvió el servidor; ausente si el descuento quedó en la cola. */
  onSaleComplete: (items: CartItem[], levels?: StockLevel[]) => void;
  setCheckoutOpen: (val: boolean) => void;
  setSaleResult: (val: { paymentMethod: MetodoPago; change: number; cardCharge: number } | null) => void;
}

export function useCheckout({
  items,
  subtotal,
  iva,
  total,
  priceMode,
  ivaBreakdown,
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

    // Importes que se persisten, cerrados en centavos. `subtotal` e `iva` ya vienen
    // cerrados de useCartTotals y el recargo se guarda como residuo, para que el registro
    // cumpla exacto total = subtotal + iva + recargoTarjeta.
    //
    // `managementFee` NO entra en esa suma: el fee va dentro del precio de cada línea, así
    // que ya está contado en subtotal + iva. Se guarda solo para poder reportarlo.
    const money = (n: number) => Math.round(n * 100) / 100;

    const totalCobrado = money(effectiveTotal);
    const recargoPersistido = money(totalCobrado - subtotal - iva);

    // 1. Registrar la venta PRIMERO. Si falla, abortar: no se descuenta inventario ni se imprime. [A5]
    let receiptId = 0;
    let ventaDocumentId = "";
    try {
      const created = await postVenta({
        fecha: new Date().toISOString(),
        subtotal,
        iva,
        total: totalCobrado,
        metodoPago: method,
        montoTarjeta: money(cardBase),
        montoTransferencia: money(montoTransfe),
        recargoTarjeta: recargoPersistido,
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
              // Snapshots del costo y la tasa: el catálogo solo recuerda la última compra, así
              // que leerlos al exportar reescribía el pasado. `null` y nunca 0: un 0 se leería
              // como "costó cero".
              unitCost: item.product.priceMember ?? null,
              tax: itemImpuesto(item),
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
              quantity: item.quantity,
              unitPrice: getPrice(item),
              totalLine: getPrice(item) * item.quantity,
              // Sin `unitCost`: un servicio no tiene costo de proveedor, igual que no tiene lote.
              tax: itemImpuesto(item),
            };
          }
        }),
      });
      receiptId = created.id;
      ventaDocumentId = created.documentId;
    } catch (err) {
      console.error("Error al registrar venta:", err);
      toast.error("No se registró la venta. No se descontó inventario.", {
        description: err instanceof Error ? err.message : undefined,
      });
      return;
    }

    // 2. Descontar en el servidor: una transacción que resta el stock de la farmacia de la caja
    //    (la bodega en modo legacy) y sus lotes. Si falla queda en la cola y se reintenta; el
    //    backend no descuenta dos veces la misma venta.
    const stock = await runOrQueue("sale", ventaDocumentId, `Venta #${String(receiptId).padStart(5, "0")}`);
    if (!stock) {
      toast.warning("Venta registrada. El descuento de inventario quedó pendiente y se reintentará.");
    } else {
      const negativos = stock.warnings.filter((w) => w.code === "NEGATIVE_STOCK");
      if (negativos.length) {
        toast.warning("Stock en negativo en esta farmacia", {
          description: negativos.map((w) => w.message).join(" · "),
        });
      }
    }
    void flushPendingStock();
    onSaleComplete(items, stock?.levels);

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
      ivaBreakdown,
      paymentMethod: method,
      received,
      change: change > 0 ? change : 0,
      isMember,
      managementFee,

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
