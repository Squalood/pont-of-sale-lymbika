"use client";

import { CartItem as CartItemType, cartItemKey } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Layers, ShieldCheck, Trash2 } from "lucide-react";
import { urlImagen } from "@/lib/media";
import { PriceEditor } from "./price-editor";
import { QuantityControls } from "./quantity-controls";
import { SENTINEL_EXPIRATION } from "@/lib/lotes";
import {
  MANAGEMENT_FEE_RATE,
  isSpecialPrice,
  itemFeeAmount,
  itemImpuesto,
  itemUnitPrice,
  type ImpuestoLinea,
  type PriceMode,
} from "@/lib/pricing";
import { TaxChip } from "./tax-chip";

interface ProductCartItemProps {
  item: Extract<CartItemType, { type: "product" }>;
  priceMode: PriceMode;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
  onUpdateImpuesto: (itemKey: string, impuesto: ImpuestoLinea | undefined) => void;
}

export function ProductCartItem({ item, priceMode, onUpdateQuantity, onRemoveItem, onUpdatePrice, onUpdateImpuesto }: ProductCartItemProps) {
  const key = cartItemKey(item);
  const { product, quantity } = item;
  const displayPrice = itemUnitPrice(item, priceMode);
  const hasOverride = item.overridePrice !== undefined;
  const specialPrice = isSpecialPrice(priceMode);
  const feeAmount = itemFeeAmount(item, priceMode);
  const imageUrl = urlImagen(product.images?.[0]?.url, 128);
  const lot = item.selectedLot;
  const showCaducidad = lot?.expirationDate && lot.expirationDate < SENTINEL_EXPIRATION;

  return (
    <div className="group rounded-lg border p-2">
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.productName}
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-lg">
            💊
          </div>
        )}
        <span
          className="block w-0 flex-1 truncate text-sm font-medium"
          title={product.productName}
        >
          {product.productName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemoveItem(key)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {product.conReceta && (
        <div className="mt-1 flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Requiere receta médica</span>
        </div>
      )}

      {lot && (
        <div className="mt-1 flex items-center gap-1 pl-12 text-xs text-muted-foreground">
          <Layers className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Lote: {lot.lotNumber}
            {showCaducidad ? ` · Cad: ${lot.expirationDate}` : ""}
          </span>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between pl-12">
        <PriceEditor
          displayPrice={displayPrice}
          hasOverride={hasOverride}
          specialPrice={specialPrice}
          itemKey={key}
          onUpdatePrice={onUpdatePrice}
          variant="product"
        />
        <QuantityControls
          quantity={quantity}
          itemKey={key}
          onUpdateQuantity={onUpdateQuantity}
        />
        <span className={`text-sm font-semibold ${hasOverride ? "text-amber-600" : specialPrice ? "text-emerald-400" : ""}`}>
          ${(displayPrice * quantity).toFixed(2)}
        </span>
      </div>

      {/* Fila propia: la de arriba ya va apretada a 260px de panel. */}
      <div className="mt-1 flex items-center gap-1.5 pl-12">
        <TaxChip
          impuesto={itemImpuesto(item)}
          hasOverride={item.overrideImpuesto !== undefined}
          itemKey={key}
          onUpdateImpuesto={onUpdateImpuesto}
        />
        {feeAmount > 0 && (
          // El fee ya está dentro del precio de arriba; esto solo explica de dónde sale.
          <span
            className="rounded-md border border-dashed border-indigo-300 px-1.5 text-xs text-indigo-600"
            title={`Incluye management fee de $${(feeAmount * quantity).toFixed(2)}`}
          >
            +{MANAGEMENT_FEE_RATE * 100}% fee
          </span>
        )}
      </div>
    </div>
  );
}
