"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantityControlsProps {
  quantity: number;
  itemKey: string;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
}

/**
 * − / + y el número editable. Lo tecleado se aplica al salir del campo o con Enter, como
 * diferencia contra la cantidad actual (la misma vía que los botones). Vacío, 0 o inválido
 * regresa a la cantidad anterior: quitar la línea es con el bote de basura, no por accidente.
 */
export function QuantityControls({ quantity, itemKey, onUpdateQuantity }: QuantityControlsProps) {
  const [draft, setDraft] = useState(String(quantity));

  // Si la cantidad cambia por fuera (botones, escaneo), el campo la refleja.
  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  function commit() {
    const next = parseInt(draft, 10);
    if (!Number.isInteger(next) || next < 1) {
      setDraft(String(quantity));
      return;
    }
    if (next !== quantity) onUpdateQuantity(itemKey, next - quantity);
  }

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
      <input
        type="text"
        inputMode="numeric"
        aria-label="Cantidad"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(String(quantity));
            e.currentTarget.blur();
          }
        }}
        className="h-6 w-10 rounded-md border bg-transparent text-center text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
      />
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
