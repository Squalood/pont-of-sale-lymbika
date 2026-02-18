"use client";

import { useState } from "react";
import { CartItem as CartItemType, ProductType } from "@/types/product";
import { CartItem } from "@/components/cart-item";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, BadgePercent, ScanBarcode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { printReceipt } from "@/lib/print-receipt";
import { postVenta } from "@/api/postVenta";

interface CartPanelProps {
  items: CartItemType[];
  products: ProductType[];
  onAddProduct: (product: ProductType) => void;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClear: () => void;
}

export function CartPanel({
  items,
  products,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
}: CartPanelProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
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
    isMember ? item.product.priceMember : item.product.price;

  const subtotal = items.reduce(
    (sum, item) => sum + getPrice(item) * item.quantity,
    0,
  );
  const iva = subtotal * 0.8;
  const total = subtotal;

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
              <span className="text-sm font-medium">Precio miembro</span>
            </div>
            <Switch checked={isMember} onCheckedChange={setIsMember} />
          </div>

          {/* Totals */}
          <div className="border-t px-4 py-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA (8%)</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
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

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={total}
        onConfirm={async (method, received) => {
          const change = received - total;

          try {
            await postVenta({
              fecha: new Date().toISOString(),
              subtotal,
              iva,
              total,
              metodoPago: method,
              recibido: received,
              cambio: change > 0 ? change : 0,
              estado: "completada",
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

          printReceipt({
            items,
            subtotal,
            iva,
            total,
            paymentMethod: method,
            received,
            change: change > 0 ? change : 0,
          });
          setCheckoutOpen(false);
          onClear();
        }}
      />
    </aside>
  );
}