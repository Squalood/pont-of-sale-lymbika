"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/components/product-card";
import { ServiceCard } from "@/components/service-card";
import { GridItem } from "@/types/product";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Tarjetas por página. Múltiplo de 2, 3, 4 y 6: el sidebar cambia de columnas
 * según su ancho y así la última fila nunca queda coja.
 */
const PAGE_SIZE = 48;

interface ProductGridProps {
  items: GridItem[];
  loading: boolean;
  error: string | null;
  onItemClick: (item: GridItem) => void;
  /**
   * Identifica el filtro activo (búsqueda + código + categoría). Al cambiar se
   * vuelve a la página 1. No sirve la identidad de `items`: esa cambia también
   * al vender, y sacar al cajero de su página por eso sería molesto.
   */
  filterKey: string;
  /**
   * Controles que se pintan junto al contador, en la barra pegada. Es un slot y
   * no props sueltas para que el grid siga sin saber qué se ordena ni cuándo se
   * puede: eso vive en el sidebar, que es quien tiene la categoría activa.
   */
  controls?: React.ReactNode;
}

export function ProductGrid({ items, loading, error, onItemClick, filterKey, controls }: ProductGridProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sin resultados
      </p>
    );
  }

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // Derivado en vez de un efecto que corrija: si la página se sale de rango
  // (vender recalcula los items) se pinta la última, sin un render vacío entre medias.
  const current = Math.min(page, pageCount);
  const visible = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      {/* Pegada arriba: el cajero ve cuántos resultados hay y cambia de página
          sin tener que rodar hasta el final de la lista. El -mx-4 compensa el
          padding del SidebarContent para que la barra ocupe todo el ancho. */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-sidebar px-4 py-2">
        <span className="shrink-0 text-xs text-muted-foreground">
          {items.length.toLocaleString("es-MX")} resultado{items.length !== 1 ? "s" : ""}
        </span>

        {controls}

        {pageCount > 1 && (
          <Pagination className="mx-0 ml-auto w-auto">
            <PaginationContent className="gap-0">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(current - 1); }}
                  aria-disabled={current === 1}
                  className={current === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                  {current} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(current + 1); }}
                  aria-disabled={current === pageCount}
                  className={current === pageCount ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(max(160px,20%),1fr))]">
        {visible.map((item) =>
          item.type === "product" ? (
            <ProductCard
              key={`p-${item.data.id}`}
              product={item.data}
              onClick={(p) => onItemClick({ type: "product", data: p })}
            />
          ) : (
            <ServiceCard
              key={`s-${item.data.id}`}
              service={item.data}
              onClick={(s) => onItemClick({ type: "service", data: s })}
            />
          )
        )}
      </div>
    </div>
  );
}
