"use client";

import { useState, useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgePercent } from "lucide-react";
import { SaleDetailDialog } from "@/components/admin/sale-detail-dialog";
import { VentaType } from "@/types/venta";
import { ProductType } from "@/types/product";

interface SalesTableProps {
  ventas: VentaType[];
  products: ProductType[];
  onReturnComplete: (returnedItems: { productId: number; quantity: number }[]) => void;
}

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

type Period = "hoy" | "semana" | "mes" | "todo";

export function SalesTable({ ventas, products, onReturnComplete }: SalesTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [selectedVenta, setSelectedVenta] = useState<VentaType | null>(null);
  const [operadorFilter, setOperadorFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  function handlePeriod(v: string) { setPeriod(v as Period); setPage(1); }
  function handleOperador(v: string) { setOperadorFilter(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  const operadores = useMemo(() => {
    const unique = Array.from(new Set(ventas.map((v) => v.operador).filter(Boolean)));
    return unique.sort();
  }, [ventas]);

  const filteredVentas = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return ventas.filter((v) => {
      const fecha = new Date(v.fecha);
      const matchesPeriod = (() => {
        switch (period) {
          case "hoy":
            return fecha >= today;
          case "semana": {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return fecha >= weekAgo;
          }
          case "mes": {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return fecha >= monthStart;
          }
          default:
            return true;
        }
      })();
      const matchesOperador = operadorFilter === "todos" || v.operador === operadorFilter;
      const matchesSearch = search === "" || String(v.id).padStart(5, "0").includes(search.replace(/^#/, ""));
      return matchesPeriod && matchesOperador && matchesSearch;
    });
  }, [ventas, period, operadorFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / PAGE_SIZE));
  const paginatedVentas = filteredVentas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de ventas</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por # recibo"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-44 h-8 text-sm"
          />
          <Select value={operadorFilter} onValueChange={handleOperador}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {operadores.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={period} onValueChange={handlePeriod}>
            <TabsList>
              <TabsTrigger value="hoy">Hoy</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mes</TabsTrigger>
              <TabsTrigger value="todo">Todo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead className="text-center"># Items</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVentas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay ventas en este período
                </TableCell>
              </TableRow>
            ) : (
              paginatedVentas.map((venta) => {
                const fecha = new Date(venta.fecha);
                const itemCount = venta.venta?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

                return (
                  <TableRow
                    key={venta.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedVenta(venta)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">
                        {fecha.toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{itemCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="capitalize">
                          {venta.metodoPago}
                        </Badge>
                        {venta.esMembresia && (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-normal text-xs px-1.5 py-0">
                            <BadgePercent className="h-3 w-3" />
                            Health Pass
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {venta.operador ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${venta.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={venta.estado === "completada" ? "default" : "destructive"}
                      >
                        {venta.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Pág. {page} / {totalPages} · {filteredVentas.length} ventas
          </span>
          <Pagination className="w-auto mx-0">
            <PaginationContent className="gap-0">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
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
                      onClick={(e) => { e.preventDefault(); setPage(n); }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <SaleDetailDialog
        venta={selectedVenta}
        open={!!selectedVenta}
        onClose={() => setSelectedVenta(null)}
        products={products}
        onReturnComplete={onReturnComplete}
      />
    </div>
  );
}
