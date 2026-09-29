"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PharmacyType } from "@/types/pharmacy";
import type { StockLocation } from "@/api/posStock";

/** Valor del selector para la bodega central (en la API es `null`). */
export const BODEGA = "bodega";
/** Vista de conjunto de Stock por farmacia (no es una ubicación: nunca se manda a la API). */
export const TODAS = "__todas__";

export const toLocation = (value: string): StockLocation => (value === BODEGA ? null : value);

export function locationName(value: string, pharmacies: PharmacyType[]): string {
  if (value === BODEGA) return "Bodega central";
  if (value === TODAS) return "Todas las ubicaciones";
  return pharmacies.find((p) => p.documentId === value)?.nombre ?? "Farmacia";
}

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  pharmacies: PharmacyType[];
  /** Ubicación que no se puede elegir (ej. el origen en el selector de destino). */
  exclude?: string;
  /** Agrega "Todas las ubicaciones" al inicio (solo para vistas, no para mover stock). */
  allowAll?: boolean;
  className?: string;
}

export function LocationSelect({ value, onChange, pharmacies, exclude, allowAll, className }: LocationSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={TODAS}>Todas las ubicaciones</SelectItem>}
        <SelectItem value={BODEGA} disabled={exclude === BODEGA}>
          Bodega central
        </SelectItem>
        {pharmacies.map((p) => (
          <SelectItem key={p.documentId} value={p.documentId} disabled={exclude === p.documentId}>
            {p.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
