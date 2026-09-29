"use client";

import type { StockLevel } from "@/api/posStock";
import { useState } from "react";
import { CartItem as CartItemType, cartItemKey, ProductType } from "@/types/product";
import { CartItem } from "@/components/cart-item";
import { CartPanelHeader } from "@/components/cart-panel-header";
import { CartTotals } from "@/components/cart-totals";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { SaleCompleteDialog } from "@/components/sale-complete-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, BadgePercent, ScanBarcode, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCaja } from "@/lib/caja-context";
import { useCartTotals } from "@/hooks/useCartTotals";
import { useCheckout } from "@/hooks/useCheckout";
import { MANAGEMENT_FEE_RATE, type ImpuestoLinea, type PriceMode } from "@/lib/pricing";
import type { MetodoPago } from "@/types/venta";

interface CartPanelProps {
  items: CartItemType[];
  products: ProductType[];
  onAddProduct: (product: ProductType) => void;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
  onUpdateImpuesto: (itemKey: string, impuesto: ImpuestoLinea | undefined) => void;
  onClear: () => void;
  onSaleComplete: (items: CartItemType[], levels?: StockLevel[]) => void;
  priceMode: PriceMode;
  onSetPriceMode: (mode: PriceMode) => void;
  isActive: boolean;
  onActivate: () => void;
  onClose?: () => void;
  onAddCart?: () => void;
  cartNumber: number;
}

export function CartPanel({
  items,
  products,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onUpdatePrice,
  onUpdateImpuesto,
  onClear,
  onSaleComplete,
  priceMode,
  onSetPriceMode,
  isActive,
  onActivate,
  onClose,
  onAddCart,
  cartNumber,
}: CartPanelProps) {
  const { caja } = useCaja();
  const tipoCambio = caja?.tipoCambio ?? 1;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saleResult, setSaleResult] = useState<{ paymentMethod: MetodoPago; change: number; cardCharge: number } | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  const { total, subtotal, iva, ahorro, getPrice, ivaBreakdown, managementFee, feeBase } =
    useCartTotals(items, priceMode);

  const { handleConfirm } = useCheckout({
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
  });

  function handleBarcodeScan(code: string) {
    const term = code.trim().toLowerCase();
    const product = products.find((p) => p.barCode?.trim().toLowerCase() === term);
    if (product) {
      onAddProduct(product);
      setBarcodeInput("");
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-1 flex-col overflow-hidden bg-white border-r cursor-pointer min-w-65",
        isActive && "ring-2 ring-primary ring-inset"
      )}
      onClick={onActivate}
    >
      <CartPanelHeader
        cartNumber={cartNumber}
        itemCount={items.length}
        onAddCart={onAddCart}
        onClose={onClose}
      />

      {/* Barcode scanner input */}
      <div className="border-b px-4 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <ScanBarcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Escanear código de barras..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcodeInput.trim()) handleBarcodeScan(barcodeInput.trim());
            }}
            onFocus={onActivate}
            className="h-9 w-full rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <ShoppingCart className="h-16 w-16 stroke-1" />
          <p className="italic">No hay productos</p>
          <p className="text-xs">Seleccione productos para agregar</p>
        </div>
      ) : (
        <>
          <ScrollArea className="min-h-0 flex-1 px-4 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              {items.map((item) => (
                <CartItem
                  key={cartItemKey(item)}
                  item={item}
                  priceMode={priceMode}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                  onUpdatePrice={onUpdatePrice}
                  onUpdateImpuesto={onUpdateImpuesto}
                />
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between border-t px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Precio Health Pass</span>
            </div>
            <Switch
              checked={priceMode === "member"}
              onCheckedChange={(v) => onSetPriceMode(v ? "member" : "regular")}
            />
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-sm font-medium">Precio de proveedor</span>
                <p className="text-xs text-muted-foreground">
                  Incluye management fee del {MANAGEMENT_FEE_RATE * 100}%
                </p>
              </div>
            </div>
            <Switch
              checked={priceMode === "proveedor"}
              onCheckedChange={(v) => onSetPriceMode(v ? "proveedor" : "regular")}
            />
          </div>

          <CartTotals
            subtotal={subtotal}
            total={total}
            ahorro={ahorro}
            priceMode={priceMode}
            ivaBreakdown={ivaBreakdown}
            tipoCambio={tipoCambio}
            onCheckout={() => setCheckoutOpen(true)}
          />
        </>
      )}

      <SaleCompleteDialog
        open={saleResult !== null}
        paymentMethod={saleResult?.paymentMethod ?? "efectivo"}
        change={saleResult?.change ?? 0}
        cardCharge={saleResult?.cardCharge ?? 0}
        onClose={() => { setSaleResult(null); onSetPriceMode("regular"); onClear(); }}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={total}
        tipoCambio={tipoCambio}
        isMember={priceMode === "member"}
        managementFee={managementFee}
        feeBase={feeBase}
        onConfirm={handleConfirm}
      />
    </aside>
  );
}
