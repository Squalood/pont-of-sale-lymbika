"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantityControlsProps {
  quantity: number;
  itemKey: string;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
}

export function QuantityControls({ quantity, itemKey, onUpdateQuantity }: QuantityControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6"
        onClick={() => onUpdateQuantity(itemKey, -1)}
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
        onClick={() => onUpdateQuantity(itemKey, 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
