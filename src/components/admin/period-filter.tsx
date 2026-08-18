"use client";

import { CalendarIcon, X } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Period, rangeLabel } from "@/lib/date-range";

interface PeriodFilterProps {
  period: Period;
  dateRange: DateRange | undefined;
  onPeriodChange: (period: Period) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClear: () => void;
  /** Filtros extra que acompañan al periodo (ej. el selector de sucursal). */
  children?: React.ReactNode;
}

export function PeriodFilter({
  period,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
  onClear,
  children,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {period !== "custom" ? (
        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <TabsList>
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
            <TabsTrigger value="todo">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : (
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Limpiar rango
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              period === "custom" ? "border-primary text-primary" : "text-muted-foreground"
            }
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {rangeLabel(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>

      {children}
    </div>
  );
}
