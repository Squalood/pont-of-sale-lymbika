"use client";

import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SIN_ORDEN,
  type SortDir,
  type SortOption,
  type SortState,
} from "@/lib/grid-sort";

interface SortMenuProps {
  /** Texto del botón mientras no hay orden elegido, p. ej. "Mezclado". */
  defaultLabel: string;
  /** Encabezado de la opción neutra dentro del menú. */
  defaultItemLabel: string;
  /** Prefijo del botón cuando sí hay orden, p. ej. "Solo productos". */
  sortedPrefix: string;
  options: SortOption[];
  value: SortState;
  onChange: (next: SortState) => void;
  icon?: React.ReactNode;
}

/**
 * Menú de orden del POS. Sirve a productos y a consultas con las mismas piezas
 * porque cada tipo trae sus propias opciones: los servicios no tienen 
 *  ni
 * fecha de alta, y los productos no tienen duración.
 */
export function SortMenu({
  defaultLabel,
  defaultItemLabel,
  sortedPrefix,
  options,
  value,
  onChange,
  icon,
}: SortMenuProps) {
  const activa = options.find((o) => o.field === value.field);
  const sentido = activa ? (value.dir === "asc" ? activa.asc : activa.desc) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-normal">
          {icon ?? <ArrowUpDown className="h-3.5 w-3.5" />}
          {activa ? (
            <>
              {sortedPrefix}
              <span className="text-muted-foreground">{sentido}</span>
            </>
          ) : (
            defaultLabel
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          value={value.field}
          onValueChange={(field) => {
            if (field === value.field) return;
            const opt = options.find((o) => o.field === field);
            onChange({ field, dir: opt?.defaultDir ?? "asc" });
          }}
        >
          <DropdownMenuRadioItem value={SIN_ORDEN}>
            {defaultItemLabel}
          </DropdownMenuRadioItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            {sortedPrefix}, ordenados por
          </DropdownMenuLabel>

          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.field} value={opt.field}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {/* El sentido solo tiene sentido si hay un campo elegido, y se nombra
            según ese campo: "A → Z" en nombre, "Menor a mayor" en precio. */}
        {activa && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={value.dir}
              onValueChange={(dir) => onChange({ ...value, dir: dir as SortDir })}
            >
              <DropdownMenuRadioItem value="asc">{activa.asc}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">{activa.desc}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
