"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Ventana de páginas alrededor de la actual. Hasta 7 se listan todas; de ahí en
 * adelante siempre se ven la primera, la última y las vecinas, con elipsis en medio.
 */
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Conteo del lado izquierdo, con su sustantivo: "128 compras". */
  label: string;
}

/**
 * Pie de paginación de las tablas del admin. El mismo bloque estaba repetido en
 * `cajas-table`, `products-table` y `sales-table`; esas siguen con su copia local.
 */
export function TablePagination({ page, totalPages, onPageChange, label }: TablePaginationProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Pág. {page} / {totalPages} · {label}
      </span>
      <Pagination className="w-auto mx-0">
        <PaginationContent className="gap-0">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); onPageChange(Math.max(1, page - 1)); }}
              aria-disabled={page === 1}
              className={page === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {getPageNumbers(page, totalPages).map((n, i) =>
            n === "…" ? (
              <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={n}>
                <PaginationLink
                  href="#"
                  isActive={n === page}
                  onClick={(e) => { e.preventDefault(); onPageChange(n); }}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); onPageChange(Math.min(totalPages, page + 1)); }}
              aria-disabled={page === totalPages}
              className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
