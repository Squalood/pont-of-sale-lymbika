"use client";

import { CartItem as CartItemType } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  isMember: boolean;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
}

export function CartItem({ item, isMember, onUpdateQuantity, onRemoveItem }: CartItemProps) {
  const { product, quantity } = item;
  const price = (isMember ? product.priceMember : product.price) ?? 0;
  const imageUrl = product.images?.[0]?.url;

  return (
    <div className="rounded-lg border p-2">
      {/* Top row: image + name + delete */}
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
          onClick={() => onRemoveItem(product.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Prescription warning */}
      {product.conReceta && (
        <div className="mt-1 flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Requiere receta médica</span>
        </div>
      )}

      {/* Bottom row: price + quantity controls + total */}
      <div className="mt-1 flex items-center justify-between pl-12">
        <span className={`text-xs ${isMember ? "text-emerald-400" : "text-muted-foreground"}`}>
          ${price.toFixed(2)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQuantity(product.id, -1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-medium">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQuantity(product.id, 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <span className={`text-sm font-semibold ${isMember ? "text-emerald-400" : ""}`}>
          ${(price * quantity).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
