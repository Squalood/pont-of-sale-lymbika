"use client";

import { useState, useMemo } from "react";
import { CalendarIcon, Download, X } from "lucide-react";
import { type DateRange } from "react-day-picker";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CajaDetailDialog } from "@/components/admin/caja-detail-dialog";
import { CajaType } from "@/types/caja";

const PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function fmtDateShort(date: Date) {
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function totalDiff(caja: CajaType): number {
  return (
    Math.abs(caja.diffMXN ?? 0) +
    Math.abs(caja.diffUSD ?? 0) +
    Math.abs(caja.diffCard ?? 0) +
    Math.abs(caja.diffTransfe ?? 0)
  );
}

type Period = "hoy" | "semana" | "mes" | "todo" | "custom";

interface CajasTableProps {
  cajas: CajaType[];
}

export function CajasTable({ cajas }: CajasTableProps) {
  const [period, setPeriod] = useState<Period>("semana");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [estadoFilter, setEstadoFilter] = useState("todas");
  const [pharmacyFilter, setPharmacyFilter] = useState("todas");
  const [operadorFilter, setOperadorFilter] = useState("todos");
  const [selectedCaja, setSelectedCaja] = useState<CajaType | null>(null);
  const [page, setPage] = useState(1);

  function handlePeriod(v: string) {
    setPeriod(v as Period);
    setDateRange(undefined);
    setPage(1);
  }

  function handleDateRange(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from) setPeriod("custom");
    setPage(1);
  }

  function clearDateRange() {
    setDateRange(undefined);
    setPeriod("semana");
    setPage(1);
  }

  const operadores = useMemo(() => {
    const unique = Array.from(new Set(cajas.map((c) => c.operador).filter(Boolean)));
    return unique.sort();
  }, [cajas]);

  const pharmacias = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cajas) {
      const p = c.pharmacy;
      if (p?.documentId) map.set(p.documentId, p.nombre);
    }
    return Array.from(map.entries()).map(([documentId, nombre]) => ({ documentId, nombre }));
  }, [cajas]);

  const filteredCajas = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return cajas.filter((c) => {
      const fecha = new Date(c.fecha);

      const matchesPeriod = (() => {
        if (period === "custom" && dateRange?.from) {
          const from = new Date(
            dateRange.from.getFullYear(),
            dateRange.from.getMonth(),
            dateRange.from.getDate()
          );
          const to = dateRange.to
            ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59)
            : new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
          return fecha >= from && fecha <= to;
        }
        switch (period) {
          case "hoy":
            return fecha >= today;
          case "semana":
            return fecha >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          case "mes":
            return fecha >= new Date(now.getFullYear(), now.getMonth(), 1);
          default:
            return true;
        }
      })();

      const matchesEstado = estadoFilter === "todas" || c.estado === estadoFilter;
      const matchesPharmacy = pharmacyFilter === "todas" || c.pharmacy?.documentId === pharmacyFilter;
      const matchesOperador = operadorFilter === "todos" || c.operador === operadorFilter;

      return matchesPeriod && matchesEstado && matchesPharmacy && matchesOperador;
    });
  }, [cajas, period, dateRange, estadoFilter, pharmacyFilter, operadorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCajas.length / PAGE_SIZE));
  const paginatedCajas = filteredCajas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const headers = [
      "Apertura",
      "Cierre",
      "Farmacia",
      "Operador",
      "Fondo Inicial (MXN)",
      "Estado",
      "Cerrado por",
      "Diferencias totales",
    ];
    const rows = filteredCajas.map((c) => [
      new Date(c.fecha).toLocaleString("es-MX"),
      c.closedAt ? new Date(c.closedAt).toLocaleString("es-MX") : "",
      c.pharmacy?.nombre ?? "",
      c.operador,
      c.fondoInicial.toFixed(2),
      c.estado,
      c.closedBy ?? "",
      c.estado === "Cerrada" ? totalDiff(c).toFixed(2) : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cajas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dateRangeLabel =
    dateRange?.from
      ? dateRange.to
        ? `${fmtDateShort(dateRange.from)} – ${fmtDateShort(dateRange.to)}`
        : fmtDateShort(dateRange.from)
      : "Rango de fechas";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {period !== "custom" ? (
          <Tabs value={period} onValueChange={handlePeriod}>
            <TabsList>
              <TabsTrigger value="hoy">Hoy</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mes</TabsTrigger>
              <TabsTrigger value="todo">Todo</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <Button variant="outline" size="sm" onClick={clearDateRange} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Limpiar rango
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={period === "custom" ? "border-primary text-primary" : "text-muted-foreground"}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateRangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>

        {pharmacias.length > 1 && (
          <Select
            value={pharmacyFilter}
            onValueChange={(v) => { setPharmacyFilter(v); setPage(1); }}
          >
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Farmacias</SelectItem>
              {pharmacias.map((p) => (
                <SelectItem key={p.documentId} value={p.documentId}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={operadorFilter}
          onValueChange={(v) => { setOperadorFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Operadores</SelectItem>
            {operadores.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={estadoFilter}
          onValueChange={(v) => { setEstadoFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Estado</SelectItem>
            <SelectItem value="Abierta">Abierta</SelectItem>
            <SelectItem value="Cerrada">Cerrada</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apertura</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead>Farmacia</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Cerrado por</TableHead>
              <TableHead className="text-right">Fondo inicial</TableHead>
              <TableHead className="text-center">Diferencias</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCajas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Sin registros en este período
                </TableCell>
              </TableRow>
            ) : (
              paginatedCajas.map((caja) => {
                const diff = caja.estado === "Cerrada" ? totalDiff(caja) : null;
                return (
                  <TableRow
                    key={caja.documentId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCaja(caja)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">
                        {new Date(caja.fecha).toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(caja.fecha).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {caja.closedAt ? (
                        <>
                          <div>{new Date(caja.closedAt).toLocaleDateString("es-MX")}</div>
                          <div className="text-xs">
                            {new Date(caja.closedAt).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{caja.pharmacy?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm">{caja.operador}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {caja.closedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${caja.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {diff === null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : diff === 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-normal text-xs">
                          Sin diferencias
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Con diferencias
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={caja.estado === "Abierta" ? "default" : "secondary"}
                        className={caja.estado === "Abierta" ? "bg-emerald-500 hover:bg-emerald-500" : ""}
                      >
                        {caja.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Pág. {page} / {totalPages} · {filteredCajas.length} cajas
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
                  <PaginationItem key={`e-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
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

      <CajaDetailDialog
        caja={selectedCaja}
        open={selectedCaja !== null}
        onClose={() => setSelectedCaja(null)}
      />
    </div>
  );
}