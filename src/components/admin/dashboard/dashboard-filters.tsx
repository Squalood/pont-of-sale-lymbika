"use client";

import { type DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter } from "@/components/admin/period-filter";
import { TODAS, TODOS, type PharmacyOption } from "@/lib/dashboard-aggregate";
import { type Period } from "@/lib/date-range";

interface DashboardFiltersProps {
  period: Period;
  dateRange: DateRange | undefined;
  onPeriodChange: (period: Period) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearDateRange: () => void;

  pharmacias: PharmacyOption[];
  pharmacyId: string;
  onPharmacyChange: (documentId: string) => void;

  operadores: string[];
  operador: string;
  onOperadorChange: (operador: string) => void;
}

/**
 * Única fila de filtros del dashboard. Los selectores solo aparecen cuando hay más de una
 * opción: con una sola sucursal u operador el control no decide nada.
 */
export function DashboardFilters({
  period,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
  onClearDateRange,
  pharmacias,
  pharmacyId,
  onPharmacyChange,
  operadores,
  operador,
  onOperadorChange,
}: DashboardFiltersProps) {
  return (
    <PeriodFilter
      period={period}
      dateRange={dateRange}
      onPeriodChange={onPeriodChange}
      onDateRangeChange={onDateRangeChange}
      onClear={onClearDateRange}
    >
      {pharmacias.length > 1 && (
        <Select value={pharmacyId} onValueChange={onPharmacyChange}>
          <SelectTrigger className="h-8 w-52 text-sm">
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas las sucursales</SelectItem>
            {pharmacias.map((p) => (
              <SelectItem key={p.documentId} value={p.documentId}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {operadores.length > 1 && (
        <Select value={operador} onValueChange={onOperadorChange}>
          <SelectTrigger className="h-8 w-52 text-sm">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los operadores</SelectItem>
            {operadores.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </PeriodFilter>
  );
}
