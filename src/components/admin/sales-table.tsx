"use client";

import { useState, useMemo, useEffect } from "react";
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
import { BadgePercent, Building2 } from "lucide-react";
import { SaleDetailDialog } from "@/components/admin/sale-detail-dialog";
import { DispensedLot, VentaItemType, VentaType } from "@/types/venta";
import { normalize } from "@/lib/search";
import { lineLots } from "@/lib/venta-lotes";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import { useMembershipName } from "@/api/getSiteConfig";

interface SalesTableProps {
  ventas: VentaType[];
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

/** Texto de una línea contra el que se busca: producto y número de lote, ya normalizados. */
function lineHaystack(item: VentaItemType): string {
  // Los lotes reales y también el elegido: si difieren, la venta se encuentra por cualquiera.
  const lots = lineLots(item).lots.map((l) => l.lotNumber ?? "");
  return normalize([item.productName ?? "", item.lotNumber ?? "", ...lots].join("\n"));
}

/**
 * Porciones de la línea a mostrar en "Coincide": las de los lotes que casan con la búsqueda, o
 * todas si lo que casó fue el nombre del producto.
 */
function matchingLots(item: VentaItemType, term: string): DispensedLot[] {
  const { lots } = lineLots(item);
  const hits = lots.filter((l) => l.lotNumber && normalize(l.lotNumber).includes(term));
  return hits.length ? hits : lots;
}

/**
 * Cómo se interpreta lo tecleado. Solo dígitos → folio, pero también producto o lote, porque
 * hay números de lote puramente numéricos. Con `#` delante → solo folio.
 */
function parseSearch(raw: string): { folio: string | null; term: string | null } {
  const t = raw.trim();
  if (!t) return { folio: null, term: null };
  if (t.startsWith("#")) return { folio: t.slice(1), term: null };
  return { folio: /^\d+$/.test(t) ? t : null, term: normalize(t) };
}

export function SalesTable({ ventas }: SalesTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [selectedVenta, setSelectedVenta] = useState<VentaType | null>(null);
  // null = el usuario no ha elegido; se usa el operador / farmacia actual
  const [operadorChoice, setOperadorChoice] = useState<string | null>(null);
  const [pharmacyChoice, setPharmacyChoice] = useState<string | null>(null);
  const [currentOperador, setCurrentOperador] = useState<string | null>(null);
  const { pharmacyId: currentPharmacy } = useCaja();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const membershipName = useMembershipName();

  useEffect(() => { setCurrentOperador(getUser()?.username ?? null); }, []);

  function handlePeriod(v: string) { setPeriod(v as Period); setPage(1); }
  function handleOperador(v: string) { setOperadorChoice(v); setPage(1); }
  function handlePharmacy(v: string) { setPharmacyChoice(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  const operadores = useMemo(() => {
    const unique = Array.from(new Set(ventas.map((v) => v.operador).filter(Boolean)));
    return unique.sort();
  }, [ventas]);

  const pharmacias = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of ventas) {
      const p = v.pharmacies?.[0];
      if (p?.documentId) map.set(p.documentId, p.nombre);
    }
    return Array.from(map.entries()).map(([documentId, nombre]) => ({ documentId, nombre }));
  }, [ventas]);

  // Por defecto el actual, solo si aparece entre las opciones; si no, todos / todas
  const operadorFilter =
    operadorChoice ??
    (currentOperador && operadores.includes(currentOperador) ? currentOperador : "todos");
  const pharmacyFilter =
    pharmacyChoice ??
    (currentPharmacy && pharmacias.length > 1 && pharmacias.some((p) => p.documentId === currentPharmacy)
      ? currentPharmacy
      : "todas");

  // Se normaliza una vez por carga y no en cada pulsación: son hasta 5000 ventas con sus líneas.
  const lineIndex = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const v of ventas) map.set(v.id, (v.venta ?? []).map(lineHaystack));
    return map;
  }, [ventas]);

  const { folio: folioQuery, term: termQuery } = parseSearch(search);

  /** Líneas de la venta que coinciden con el producto o lote buscado. */
  function matchingLines(v: VentaType): VentaItemType[] {
    if (!termQuery) return [];
    const hay = lineIndex.get(v.id) ?? [];
    return (v.venta ?? []).filter((_, i) => hay[i]?.includes(termQuery));
  }

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
      const matchesPharmacy = pharmacyFilter === "todas" || v.pharmacies?.[0]?.documentId === pharmacyFilter;
      const matchesSearch =
        (folioQuery === null && termQuery === null) ||
        (folioQuery !== null && String(v.id).padStart(5, "0").includes(folioQuery)) ||
        (termQuery !== null && (lineIndex.get(v.id) ?? []).some((h) => h.includes(termQuery)));
      return matchesPeriod && matchesOperador && matchesPharmacy && matchesSearch;
    });
  }, [ventas, period, operadorFilter, pharmacyFilter, folioQuery, termQuery, lineIndex]);

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / PAGE_SIZE));
  const paginatedVentas = filteredVentas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de ventas</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Folio, producto o lote"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-56 h-8 text-sm"
          />
          {pharmacias.length > 1 && (
            <Select value={pharmacyFilter} onValueChange={handlePharmacy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">all Farmacias</SelectItem>
                {pharmacias.map((p) => (
                  <SelectItem key={p.documentId} value={p.documentId}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={operadorFilter} onValueChange={handleOperador}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">all Operadores</SelectItem>
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
              <TableHead>Folio</TableHead>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead className="text-center"># Items</TableHead>
              {termQuery && <TableHead>Coincide</TableHead>}
              <TableHead>Método</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVentas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={termQuery ? 9 : 8} className="py-8 text-center text-muted-foreground">
                  {search.trim()
                    ? `Ninguna venta de este período coincide con «${search.trim()}».${period !== "todo" ? " Prueba con «Todo»." : ""}`
                    : "No hay ventas en este período"}
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
                    <TableCell className="font-mono text-sm font-medium">
                      #{String(venta.id).padStart(5, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {fecha.toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{itemCount}</TableCell>
                    {termQuery && (
                      <TableCell className="max-w-64 text-xs">
                        {matchingLines(venta).flatMap((item, i) =>
                          matchingLots(item, termQuery).map((lot, j) => (
                            <div key={`${i}-${j}`} className="truncate">
                              <span>{item.productName}</span>
                              <span className="text-muted-foreground">
                                {lot.lotNumber ? ` · Lote ${lot.lotNumber}` : ""} · ×{lot.quantity}
                              </span>
                            </div>
                          ))
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="capitalize">
                          {venta.metodoPago === "transfe" ? "Transferencia" : venta.metodoPago}
                        </Badge>
                        {venta.esMembresia && (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-normal text-xs px-1.5 py-0">
                            <BadgePercent className="h-3 w-3" />
                            {membershipName}
                          </Badge>
                        )}
                        {venta.esProveedor && (
                          <Badge className="gap-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 font-normal text-xs px-1.5 py-0">
                            <Building2 className="h-3 w-3" />
                            Proveedor
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {venta.operador ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {venta.pharmacies?.[0]?.nombre ?? "—"}
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
      />
    </div>
  );
}
