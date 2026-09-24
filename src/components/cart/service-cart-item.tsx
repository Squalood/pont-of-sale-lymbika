"use client";

import { CartItem as CartItemType, cartItemKey } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Stethoscope, Trash2 } from "lucide-react";
import { PriceEditor } from "./price-editor";
import { QuantityControls } from "./quantity-controls";
import {
  SERVICE_IMPUESTO,
  impuestoLabel,
  isSpecialPrice,
  itemUnitPrice,
  type PriceMode,
} from "@/lib/pricing";

interface ServiceCartItemProps {
  item: Extract<CartItemType, { type: "service" }>;
  priceMode: PriceMode;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
}

export function ServiceCartItem({ item, priceMode, onUpdateQuantity, onRemoveItem, onUpdatePrice }: ServiceCartItemProps) {
  const key = cartItemKey(item);
  const { serviceRate, quantity } = item;
  const displayPrice = itemUnitPrice(item, priceMode);
  const hasOverride = item.overridePrice !== undefined;
  const specialPrice = isSpecialPrice(priceMode);

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
      <div className="mt-1 flex items-center justify-between pl-12">
        <PriceEditor
          displayPrice={displayPrice}
          hasOverride={hasOverride}
          specialPrice={specialPrice}
          itemKey={key}
          onUpdatePrice={onUpdatePrice}
          variant="service"
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
      <div className="mt-1 pl-12">
        {/* Fijo y no editable: el precio de la tarifa ya trae el impuesto dentro. */}
        <span className="inline-block rounded-md border border-dashed px-1.5 text-xs text-muted-foreground">
          {impuestoLabel(SERVICE_IMPUESTO)}
        </span>
      </div>
    </div>
  );
}
