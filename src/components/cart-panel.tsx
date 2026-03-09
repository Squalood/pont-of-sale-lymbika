"use client";

import { useState } from "react";
import { CartItem as CartItemType, ProductType } from "@/types/product";
import { CartItem } from "@/components/cart-item";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { SaleCompleteDialog } from "@/components/sale-complete-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, BadgePercent, ScanBarcode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { printReceipt } from "@/lib/print-receipt";
import { postVenta } from "@/api/postVenta";
import { patchProductStock } from "@/api/patchProductStock";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";

interface CartPanelProps {
  items: CartItemType[];
  products: ProductType[];
  onAddProduct: (product: ProductType) => void;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClear: () => void;
  onSaleComplete: (items: CartItemType[]) => void;
}

export function CartPanel({
  items,
  products,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onSaleComplete,
}: CartPanelProps) {
  const { caja, refetchEfectivo } = useCaja();
  const tipoCambio = caja?.tipoCambio ?? 1;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [saleResult, setSaleResult] = useState<{ paymentMethod: "efectivo" | "tarjeta"; change: number } | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  function handleBarcodeScan(code: string) {
    const term = code.trim().toLowerCase();
    const product = products.find(
      (p) => p.barCode?.trim().toLowerCase() === term,
    );
    if (product) {
      onAddProduct(product);
      setBarcodeInput("");
    }
  }

  const getPrice = (item: CartItemType) =>
    (isMember ? item.product.priceMember : item.product.price) ?? 0;

  const IVA_RATE = 0.08;
  const IVA_SLUGS = ["cuidado-belleza", "suplementos"];

  const itemHasIva = (item: CartItemType) =>
    IVA_SLUGS.includes(item.product.category?.slug ?? "");

  const totalWithIva = items.reduce(
    (sum, item) => (itemHasIva(item) ? sum + getPrice(item) * item.quantity : sum),
    0,
  );
  const totalWithoutIva = items.reduce(
    (sum, item) => (!itemHasIva(item) ? sum + getPrice(item) * item.quantity : sum),
    0,
  );
  const total = totalWithIva + totalWithoutIva;
  const subtotal = totalWithIva / (1 + IVA_RATE) + totalWithoutIva;
  const iva = total - subtotal;

  const totalRegular = items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0,
  );
  const ahorro = isMember ? totalRegular - total : 0;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="w-9"></div>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">Venta Actual</span>
          {items.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm font-medium text-red-500 hover:text-red-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Barcode scanner input */}
      <div className="border-b px-4 py-2">
        <div className="relative">
          <ScanBarcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Escanear código de barras..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcodeInput.trim()) {
                handleBarcodeScan(barcodeInput.trim());
              }
            }}
            className="h-9 w-full rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Cart items */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <ShoppingCart className="h-16 w-16 stroke-1" />
          <p className="italic">No hay productos</p>
          <p className="text-xs">Seleccione productos para agregar</p>
        </div>
      ) : (
        <>
          <ScrollArea className="min-h-0 flex-1 px-4 py-2">
            <div className="space-y-2">
              {items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  isMember={isMember}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Member discount toggle */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Precio MediClub</span>
            </div>
            <Switch checked={isMember} onCheckedChange={setIsMember} />
          </div>

          {/* Totals */}
          <div className="border-t px-4 py-3">
            <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-1 text-sm">
              {/* Column headers */}
              <div />
              <span className="text-right text-xs font-semibold text-muted-foreground">MXN</span>
              <span className="text-right text-xs font-semibold text-green-600">USD</span>

              {/* Subtotal */}
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-right tabular-nums">${subtotal.toFixed(2)}</span>
              <span className="text-right tabular-nums text-green-600">${(subtotal / tipoCambio).toFixed(2)}</span>

              {/* IVA */}
              {iva > 0 && (
                <>
                  <span className="text-muted-foreground">IVA (8%)</span>
                  <span className="text-right tabular-nums">${iva.toFixed(2)}</span>
                  <span className="text-right tabular-nums text-green-600">${(iva / tipoCambio).toFixed(2)}</span>
                </>
              )}

              {/* Ahorro */}
              {isMember && ahorro > 0 && (
                <>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <BadgePercent className="h-3 w-3" />
                    Ahorro MediClub
                  </span>
                  <span className="text-right tabular-nums text-emerald-600">-${ahorro.toFixed(2)}</span>
                  <span className="text-right tabular-nums text-emerald-600">-${(ahorro / tipoCambio).toFixed(2)}</span>
                </>
              )}

              {/* Divider */}
              <div className="col-span-3 my-0.5 border-t" />

              {/* Total */}
              <span className="text-base font-bold">Total</span>
              <span className="text-right text-base font-bold tabular-nums">${total.toFixed(2)}</span>
              <span className="text-right text-base font-bold tabular-nums text-green-600">${(total / tipoCambio).toFixed(2)}</span>
            </div>

            <Button
              className="mt-3 h-12 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90"
              onClick={() => setCheckoutOpen(true)}
            >
              Cobrar — ${total.toFixed(2)}
            </Button>
          </div>
        </>
      )}

      <SaleCompleteDialog
        open={saleResult !== null}
        paymentMethod={saleResult?.paymentMethod ?? "efectivo"}
        change={saleResult?.change ?? 0}
        onClose={() => {
          setSaleResult(null);
          setIsMember(false);
          onClear();
        }}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={total}
        tipoCambio={tipoCambio}
        isMember={isMember}
        onConfirm={async (method, received, recibidoUSD, tipoCambioUsado) => {
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
              recibidoUSD,
              tipoCambioUsado,
              estado: "completada",
              operador,
              venta: items.map((item) => ({
                product: item.product.id,
                productName: item.product.productName,
                quantity: item.quantity,
                unitPrice: getPrice(item),
                totalLine: getPrice(item) * item.quantity,
              })),
            });
          } catch (err) {
            console.error("Error al registrar venta:", err);
          }

          await Promise.allSettled(
            items.map((item) =>
              patchProductStock(item.product.documentId, item.product.stock_central - item.quantity)
            )
          );
          onSaleComplete(items);

          const cardSurcharge = isMember && method === "tarjeta" ? total * 0.03 : 0;

          printReceipt({
            receiptId,
            operador,
            items: items.map((item) => ({
              productName: item.product.productName,
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
        }}
      />
    </aside>
  );
}