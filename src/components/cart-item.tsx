"use client";

import { useState } from "react";
import { CartItem as CartItemType, cartItemKey } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Minus, Pencil, Plus, ShieldCheck, Stethoscope, Trash2, X } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  isMember: boolean;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
}

export function CartItem({ item, isMember, onUpdateQuantity, onRemoveItem, onUpdatePrice }: CartItemProps) {
  const key = cartItemKey(item);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState("");

  function startEditing(displayPrice: number) {
    setDraftPrice(displayPrice.toFixed(2));
    setIsEditingPrice(true);
  }

  function confirmEdit() {
    const parsed = parseFloat(draftPrice);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePrice(key, parsed);
    }
    setIsEditingPrice(false);
  }

  function cancelEdit() {
    setIsEditingPrice(false);
  }

  if (item.type === "service") {
    const { serviceRate } = item;
    const displayPrice = item.overridePrice ?? serviceRate.price;
    const hasOverride = item.overridePrice !== undefined;

    return (
      <div className="group rounded-lg border p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-500">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span
            className="block w-0 flex-1 truncate text-sm font-medium"
            title={serviceRate.medical_service?.name}
          >
            {serviceRate.medical_service?.name}
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
        {serviceRate.doctor?.doctorName && (
          <p className="mt-1 pl-12 text-xs text-muted-foreground">{serviceRate.doctor.doctorName}</p>
        )}
        <div className="mt-1 pl-12">
          {isEditingPrice ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmEdit(); }
                if (e.key === "Escape") cancelEdit();
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
              className="w-20 rounded border px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-semibold ${hasOverride ? "text-amber-600" : ""}`}>
                ${displayPrice.toFixed(2)}
              </span>
              {hasOverride && (
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onUpdatePrice(key, undefined)}
                  title="Restaurar precio original"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                onClick={() => startEditing(displayPrice)}
                title="Editar precio"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { product, quantity } = item;
  const price = (isMember ? product.priceMember : product.price) ?? 0;
  const displayPrice = item.overridePrice ?? price;
  const hasOverride = item.overridePrice !== undefined;
  const imageUrl = product.images?.[0]?.url;

  return (
    <div className="group rounded-lg border p-2">
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
          onClick={() => onRemoveItem(key)}
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
        {isEditingPrice ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={draftPrice}
            onChange={(e) => setDraftPrice(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); confirmEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            onFocus={(e) => e.target.select()}
            autoFocus
            className="w-20 rounded border px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className={`text-xs ${hasOverride ? "text-amber-600" : isMember ? "text-emerald-400" : "text-muted-foreground"}`}>
              ${displayPrice.toFixed(2)}
            </span>
            {hasOverride && (
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onUpdatePrice(key, undefined)}
                title="Restaurar precio original"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              onClick={() => startEditing(displayPrice)}
              title="Editar precio"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQuantity(key, -1)}
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
            onClick={() => onUpdateQuantity(key, 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <span className={`text-sm font-semibold ${hasOverride ? "text-amber-600" : isMember ? "text-emerald-400" : ""}`}>
          ${(displayPrice * quantity).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
