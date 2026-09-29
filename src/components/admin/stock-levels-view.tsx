"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ExternalLink, Plus, RefreshCw, Scale, Search, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStockLevels, type LocationLevelItem } from "@/api/posStock";
import { usePharmacies } from "@/hooks/usePharmacies";
import { normalize } from "@/lib/search";
import { BODEGA, LocationSelect, TODAS, locationName, toLocation } from "./location-select";
import { StockAdjustDialog, transferHref, type AdjustTarget } from "./stock-adjust-dialog";
import { StockCountDialog, type CountTarget } from "./stock-count-dialog";

type Filtro = "todos" | "descuadre" | "sinlotes" | "negativos" | "bajo";

/** Un producto en una ubicación. En "Todas las ubicaciones" hay una fila por cada lugar. */
interface Row extends LocationLevelItem {
  location: string; // valor del selector: BODEGA o documentId de la farmacia
  locationName: string;
  minDefault: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const strapiProductUrl = (documentId: string) =>
  `${BACKEND_URL}/admin/content-manager/collection-types/api::product.product/${documentId}`;

const hasDescuadre = (r: Row) => r.lotsCount > 0 && r.stock !== r.lotsSum;
const sinLotes = (r: Row) => r.lotsCount === 0 && r.stock !== 0;

/**
 * Inventario por ubicación. Con una ubicación elegida (bodega o farmacia) muestra su stock, el
 * mínimo, cuánto está respaldado por lotes y la diferencia. "Todas las ubicaciones" es la vista
 * de conjunto (lo que antes era Reconciliación): lista, lugar por lugar, los productos cuyo
 * stock no coincide con sus lotes. Como el total es la suma de todas las ubicaciones, cuadrar
 * cada lugar deja el total cuadrado contra la suma de todos los lotes.
 */
export function StockLevelsView() {
  const { pharmacies, loading: loadingPharmacies } = usePharmacies();
  const [location, setLocation] = useState<string>(TODAS);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("descuadre");
  const [adjust, setAdjust] = useState<{ target: AdjustTarget | null; location: string } | null>(null);
  const [count, setCount] = useState<{ target: CountTarget; location: string } | null>(null);

  const esTodas = location === TODAS;
  const esBodega = location === BODEGA;

  const load = useCallback(async () => {
    if (location === TODAS && loadingPharmacies) return;
    setLoading(true);
    try {
      const locs = location === TODAS ? [BODEGA, ...pharmacies.map((p) => p.documentId)] : [location];
      const results = await Promise.all(locs.map((l) => getStockLevels(toLocation(l))));
      setRows(
        results.flatMap((res, idx) =>
          res.items.map((i) => ({
            ...i,
            location: locs[idx],
            locationName: locationName(locs[idx], pharmacies),
            minDefault: res.minStockDefault,
          }))
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el stock");
    } finally {
      setLoading(false);
    }
  }, [location, pharmacies, loadingPharmacies]);

  useEffect(() => {
    load();
  }, [load]);

  function changeLocation(value: string) {
    setLocation(value);
    // La vista de conjunto sirve para encontrar descuadres; una ubicación, para ver todo lo que tiene.
    setFiltro(value === TODAS ? "descuadre" : "todos");
  }

  const minOf = (r: Row) => (r.location === BODEGA ? null : r.minStock ?? r.minDefault);

  // En la vista de conjunto se omiten las filas vacías (sin stock ni lotes): son la mayoría de la
  // bodega y no dicen nada.
  const base = useMemo(
    () => (esTodas ? rows.filter((r) => r.stock !== 0 || r.lotsCount > 0) : rows),
    [rows, esTodas]
  );

  const resumen = useMemo(
    () => ({
      cuadrados: base.filter((r) => r.lotsCount > 0 && r.stock === r.lotsSum).length,
      descuadres: base.filter(hasDescuadre).length,
      sinLotes: base.filter(sinLotes).length,
      negativos: base.filter((r) => r.stock < 0).length,
    }),
    [base]
  );

  const visibles = useMemo(() => {
    const term = normalize(search);
    return base
      .filter((r) => !term || normalize(r.productName ?? "").includes(term))
      .filter((r) => {
        const min = minOf(r);
        if (filtro === "descuadre") return hasDescuadre(r);
        if (filtro === "sinlotes") return sinLotes(r);
        if (filtro === "negativos") return r.stock < 0;
        if (filtro === "bajo") return min !== null && r.stock < min;
        return true;
      })
      .sort((a, b) =>
        esTodas
          ? Math.abs(b.stock - b.lotsSum) - Math.abs(a.stock - a.lotsSum) ||
            (a.productName ?? "").localeCompare(b.productName ?? "")
          : a.stock - b.stock || (a.productName ?? "").localeCompare(b.productName ?? "")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, search, filtro, esTodas]);

  const nombre = locationName(location, pharmacies);
  const colSpan = 5 + (esTodas ? 1 : 0) + (!esTodas && !esBodega ? 1 : 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Resumen */}
      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Cuadrados (stock = lotes)", value: resumen.cuadrados, color: "text-emerald-600", f: "todos" as Filtro },
          { label: "Descuadre stock / lotes", value: resumen.descuadres, color: "text-amber-600", f: "descuadre" as Filtro },
          { label: "Sin lotes capturados", value: resumen.sinLotes, color: "text-blue-600", f: "sinlotes" as Filtro },
          { label: "En negativo", value: resumen.negativos, color: "text-destructive", f: "negativos" as Filtro },
        ].map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setFiltro(c.f)}
            className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${filtro === c.f ? "ring-2 ring-primary/40" : ""}`}
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{loading ? "…" : c.value}</p>
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <LocationSelect value={location} onChange={changeLocation} pharmacies={pharmacies} allowAll className="w-56" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 w-56 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" />
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="descuadre">Descuadres</TabsTrigger>
            <TabsTrigger value="sinlotes">Sin lotes</TabsTrigger>
            <TabsTrigger value="negativos">Negativos</TabsTrigger>
            {!esTodas && !esBodega && <TabsTrigger value="bajo">Bajo mínimo</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Recargar
          </Button>
          <Button
            size="sm"
            onClick={() => setAdjust({ target: null, location })}
            disabled={esTodas}
            title={esTodas ? "Elige una ubicación para corregir un producto" : undefined}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Corregir producto
          </Button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead>Producto</TableHead>
                {esTodas && <TableHead>Ubicación</TableHead>}
                <TableHead className="text-right">Stock</TableHead>
                {!esTodas && !esBodega && <TableHead className="text-right">Mínimo</TableHead>}
                <TableHead className="text-right">Σ lotes</TableHead>
                <TableHead className="text-right">Sin lote</TableHead>
                <TableHead className="w-80" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                    {esTodas && filtro === "descuadre"
                      ? "Sin descuadres: el stock de cada ubicación coincide con sus lotes."
                      : !esTodas && rows.length === 0
                        ? `${nombre} todavía no tiene stock registrado. Acomoda su mercancía con un traspaso desde bodega.`
                        : "Nada coincide con el filtro."}
                  </TableCell>
                </TableRow>
              ) : (
                visibles.map((r) => {
                  const min = minOf(r);
                  const bajo = min !== null && r.stock < min;
                  const descuadre = hasDescuadre(r);
                  const target = { productDocumentId: r.productDocumentId, productName: r.productName, stock: r.stock };
                  return (
                    <TableRow key={`${r.productDocumentId}|${r.location}`}>
                      <TableCell className="max-w-72 font-medium">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate" title={r.productName}>{r.productName}</span>
                          <a
                            href={strapiProductUrl(r.productDocumentId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir producto en Strapi"
                            className="shrink-0 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </TableCell>
                      {esTodas && <TableCell className="whitespace-nowrap text-muted-foreground">{r.locationName}</TableCell>}
                      <TableCell className={`text-right font-medium ${r.stock < 0 ? "text-destructive" : bajo ? "text-amber-600" : ""}`}>
                        {r.stock}
                      </TableCell>
                      {!esTodas && !esBodega && <TableCell className="text-right text-muted-foreground">{min}</TableCell>}
                      <TableCell className="text-right text-muted-foreground">
                        {r.lotsCount > 0 ? `${r.lotsSum} (${r.lotsCount})` : "—"}
                      </TableCell>
                      {/* Con lotes, "sin lote" distinto de 0 es un descuadre entre stock y lotes: se resalta. */}
                      <TableCell
                        className={`text-right ${descuadre ? "font-medium text-amber-600" : "text-muted-foreground"}`}
                        title={descuadre ? "El stock no coincide con sus lotes: usa Cuadrar" : undefined}
                      >
                        {r.stock - r.lotsSum}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1.5">
                          {r.location !== BODEGA && (
                            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                              <Link href={transferHref(r.location, { productDocumentId: r.productDocumentId, productName: r.productName })}>
                                <ArrowLeftRight className="h-3.5 w-3.5" /> Traspasar
                              </Link>
                            </Button>
                          )}
                          {r.lotsCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 gap-1.5 ${descuadre ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800" : ""}`}
                              onClick={() => setCount({ target, location: r.location })}
                            >
                              <Scale className="h-3.5 w-3.5" /> Cuadrar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setAdjust({ target, location: r.location })}
                          >
                            <SquarePen className="h-3.5 w-3.5" /> Corregir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <StockAdjustDialog
        open={adjust !== null}
        target={adjust?.target ?? null}
        location={toLocation(adjust?.location ?? BODEGA)}
        locationName={locationName(adjust?.location ?? BODEGA, pharmacies)}
        onClose={() => setAdjust(null)}
        onDone={load}
      />

      <StockCountDialog
        open={count !== null}
        target={count?.target ?? null}
        location={toLocation(count?.location ?? BODEGA)}
        locationName={locationName(count?.location ?? BODEGA, pharmacies)}
        onClose={() => setCount(null)}
        onDone={load}
      />
    </div>
  );
}
