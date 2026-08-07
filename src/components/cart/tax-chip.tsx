"use client";

import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPUESTO_OPTIONS, impuestoLabel, type ImpuestoLinea } from "@/lib/pricing";

interface TaxChipProps {
  impuesto: ImpuestoLinea;
  /** El cajero corrigió el impuesto de esta línea solo para esta venta. */
  hasOverride: boolean;
  itemKey: string;
  onUpdateImpuesto: (itemKey: string, impuesto: ImpuestoLinea | undefined) => void;
}

/**
 * Impuesto que incluye la línea, editable solo para esta venta (hay productos con el
 * campo sin actualizar en Strapi). Siempre visible: es dato fiscal que el cajero debe
 * poder leer sin interactuar. Selección explícita en vez de un chip que cicla valores,
 * para que un toque accidental en pantalla táctil no cambie la tasa.
 */
export function TaxChip({ impuesto, hasOverride, itemKey, onUpdateImpuesto }: TaxChipProps) {
  return (
    <div className="flex items-center gap-1">
      <Select
        value={impuesto}
        onValueChange={(v) => onUpdateImpuesto(itemKey, v as ImpuestoLinea)}
      >
        <SelectTrigger
          size="sm"
          title="Impuesto incluido en el precio"
          className={`h-6 gap-1 border-dashed px-1.5 py-0 text-xs shadow-none [&_svg:not([class*='size-'])]:size-3 ${
            hasOverride ? "border-amber-400 text-amber-600" : "text-muted-foreground"
          }`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMPUESTO_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {impuestoLabel(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasOverride && (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onUpdateImpuesto(itemKey, undefined)}
          title="Restaurar impuesto del producto"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
