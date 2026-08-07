"use client";

import { CartItem as CartItemType, cartItemKey } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Stethoscope, Trash2 } from "lucide-react";
import { PriceEditor } from "./price-editor";
import { isSpecialPrice, itemUnitPrice, type PriceMode } from "@/lib/pricing";

interface ServiceCartItemProps {
  item: Extract<CartItemType, { type: "service" }>;
  priceMode: PriceMode;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
}

export function ServiceCartItem({ item, priceMode, onRemoveItem, onUpdatePrice }: ServiceCartItemProps) {
  const key = cartItemKey(item);
  const { serviceRate } = item;
  const displayPrice = itemUnitPrice(item, priceMode);
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
        <PriceEditor
          displayPrice={displayPrice}
          hasOverride={hasOverride}
          specialPrice={isSpecialPrice(priceMode)}
          itemKey={key}
          onUpdatePrice={onUpdatePrice}
          variant="service"
        />
        {/* Los servicios médicos son exentos por ley: etiqueta fija, no editable. */}
        <span className="mt-1 inline-block rounded-md border border-dashed px-1.5 text-xs text-muted-foreground">
          Exento
        </span>
      </div>
    </div>
  );
}
