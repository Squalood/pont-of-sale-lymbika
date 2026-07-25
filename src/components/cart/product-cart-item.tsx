"use client";

import { CartItem as CartItemType, cartItemKey } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Layers, ShieldCheck, Trash2 } from "lucide-react";
import { PriceEditor } from "./price-editor";
import { QuantityControls } from "./quantity-controls";
import { SENTINEL_EXPIRATION } from "@/lib/lotes";

interface ProductCartItemProps {
  item: Extract<CartItemType, { type: "product" }>;
  isMember: boolean;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
}

export function ProductCartItem({ item, isMember, onUpdateQuantity, onRemoveItem, onUpdatePrice }: ProductCartItemProps) {
  const key = cartItemKey(item);
  const { product, quantity } = item;
  const price = (isMember ? product.priceMember : product.price) ?? 0;
  const displayPrice = item.overridePrice ?? price;
  const hasOverride = item.overridePrice !== undefined;
  const imageUrl = product.images?.[0]?.url;
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
          isMember={isMember}
          itemKey={key}
          onUpdatePrice={onUpdatePrice}
          variant="product"
        />
        <QuantityControls
          quantity={quantity}
          itemKey={key}
          onUpdateQuantity={onUpdateQuantity}
        />
        <span className={`text-sm font-semibold ${hasOverride ? "text-amber-600" : isMember ? "text-emerald-400" : ""}`}>
          ${(displayPrice * quantity).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
