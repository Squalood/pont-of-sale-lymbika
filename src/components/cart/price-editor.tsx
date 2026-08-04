"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

interface PriceEditorProps {
  displayPrice: number;
  hasOverride: boolean;
  /** La tarifa no es la de mostrador (Health Pass o proveedor): se resalta el precio. */
  specialPrice: boolean;
  itemKey: string;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
  variant: "service" | "product";
}

export function PriceEditor({ displayPrice, hasOverride, specialPrice, itemKey, onUpdatePrice, variant }: PriceEditorProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState("");

  function startEditing(price: number) {
    setDraftPrice(price.toFixed(2));
    setIsEditingPrice(true);
  }

  function confirmEdit() {
    const parsed = parseFloat(draftPrice);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePrice(itemKey, parsed);
    }
    setIsEditingPrice(false);
  }

  function cancelEdit() {
    setIsEditingPrice(false);
  }

  if (isEditingPrice) {
    return (
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
        className={`w-20 rounded border px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary ${
          variant === "service" ? "text-sm font-semibold" : "text-xs"
        }`}
      />
    );
  }

  const priceClassName = variant === "service"
    ? `text-sm font-semibold ${hasOverride ? "text-amber-600" : ""}`
    : `text-xs ${hasOverride ? "text-amber-600" : specialPrice ? "text-emerald-400" : "text-muted-foreground"}`;

  return (
    <div className="flex items-center gap-1">
      <span className={priceClassName}>
        ${displayPrice.toFixed(2)}
      </span>
      {hasOverride && (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onUpdatePrice(itemKey, undefined)}
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
  );
}
