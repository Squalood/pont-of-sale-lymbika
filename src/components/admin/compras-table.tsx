"use client";

import { useState, useMemo, useCallback } from "react";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Paperclip, Download, Plus, Layers, CalendarClock } from "lucide-react";
import { PeriodFilter } from "@/components/admin/period-filter";
import { TablePagination } from "@/components/admin/table-pagination";
import { CompraType, CompraItemType } from "@/types/compra";
import { toast } from "sonner";
import { urlOriginal } from "@/lib/media";
import { inRange, resolveRange, type Period } from "@/lib/date-range";

const PAGE_SIZE = 20;
const TODOS_PROVEEDORES = "todos";

/** Folio visible de la compra. Mismo formato en la columna, el buscador y el detalle. */
function compraFolio(compra: Pick<CompraType, "id">): string {
  return String(compra.id).padStart(5, "0");
}

/**
 * Nombre con el que se guarda la factura adjunta: el folio de la compra y nada mas.
 * Descarta a proposito el nombre con el que llego el archivo, que suele ser un codigo
 * del proveedor que no dice a que compra pertenece.
 *
 * La extension se arrastra del nombre original porque es lo unico que indica el tipo:
 * el populate de la compra no trae el `mime` del adjunto. Un nombre sin extension deja
 * el folio solo, y el navegador sigue reconociendo el archivo por el Content-Type que
 * manda /api/descargar.
 */
function nombreDescargaFactura(compra: Pick<CompraType, "id">, nombreArchivo: string): string {
  const extension = nombreArchivo.match(/\.[^.]+$/)?.[0].toLowerCase() ?? "";
  return `Factura de compra ${compraFolio(compra)}${extension}`;
}

// Agrupa las líneas de la compra (aplanadas, una por lote) de vuelta por producto.
interface GroupedCompraItem {
  key: string;
  productName: string;
  costoUnitario: number;
  /**
   * Falso cuando los renglones del producto no comparten costo: el proveedor puede
   * facturar el mismo articulo a precios distintos en la misma compra. Entonces el
   * "c/u" de la cabecera mentiria, y el costo se muestra en cada renglon.
   */
  costoUniforme: boolean;
  iva?: "iva8" | "iva16" | "exento";
  totalQty: number;
  totalLine: number;
  lotes: {
    numeroLote?: string;
    fechaCaducidad?: string;
    quantity: number;
    costoUnitario: number;
    totalLine: number;
  }[];
}

function groupCompraItems(items: CompraItemType[]): GroupedCompraItem[] {
  const map = new Map<string, GroupedCompraItem>();
  for (const it of items) {
    const key = it.product?.documentId ?? it.productName;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        productName: it.productName,
        costoUnitario: it.costoUnitario,
        costoUniforme: true,
        iva: it.iva,
        totalQty: 0,
        totalLine: 0,
        lotes: [],
      };
      map.set(key, g);
    }
    g.totalQty += it.quantity;
    g.totalLine += it.totalLine;
    if (it.costoUnitario !== g.costoUnitario) g.costoUniforme = false;
    g.lotes.push({
      numeroLote: it.numeroLote,
      fechaCaducidad: it.fechaCaducidad,
      quantity: it.quantity,
      costoUnitario: it.costoUnitario,
      totalLine: it.totalLine,
    });
  }
  return [...map.values()];
}

interface ComprasTableProps {
  compras: CompraType[];
  onNuevaCompra: () => void;
}

export function ComprasTable({ compras, onNuevaCompra }: ComprasTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [proveedorId, setProveedorId] = useState(TODOS_PROVEEDORES);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CompraType | null>(null);

  function handlePeriod(p: Period) { setPeriod(p); setDateRange(undefined); setPage(1); }
  function handleProveedor(v: string) { setProveedorId(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  function handleDateRange(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from) setPeriod("custom");
    setPage(1);
  }

  function clearDateRange() {
    setDateRange(undefined);
    setPeriod("hoy");
    setPage(1);
  }

  // Solo los proveedores que aparecen en el historial: una opcion que no tiene
  // ninguna compra detras siempre filtraria a cero.
  const proveedores = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of compras) {
      if (c.proveedor?.documentId) map.set(c.proveedor.documentId, c.proveedor.name);
    }
    return [...map.entries()]
      .map(([documentId, name]) => ({ documentId, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [compras]);

  const range = useMemo(() => resolveRange(period, dateRange), [period, dateRange]);

  const filtered = useMemo(() => {
    // El folio se teclea con o sin "#", y se compara contra el mismo texto que
    // muestra la columna para que "0012" y "12" encuentren la compra #00012.
    const folio = search.trim().replace(/^#/, "");
    return compras.filter((c) => {
      if (!inRange(c.fecha, range)) return false;
      if (proveedorId !== TODOS_PROVEEDORES && c.proveedor?.documentId !== proveedorId) return false;
      if (folio && !compraFolio(c).includes(folio)) return false;
      return true;
    });
  }, [compras, range, proveedorId, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de compras</h2>
        <Button size="sm" onClick={onNuevaCompra}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva Compra
        </Button>
      </div>

      <PeriodFilter
        period={period}
        dateRange={dateRange}
        onPeriodChange={handlePeriod}
        onDateRangeChange={handleDateRange}
        onClear={clearDateRange}
      >
        <Input
          placeholder="Buscar por # compra"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-8 w-44 text-sm"
        />
        {proveedores.length > 0 && (
          <Select value={proveedorId} onValueChange={handleProveedor}>
            <SelectTrigger className="h-8 w-52 text-sm">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_PROVEEDORES}>Todos los proveedores</SelectItem>
              {proveedores.map((p) => (
                <SelectItem key={p.documentId} value={p.documentId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PeriodFilter>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">#</TableHead>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-center">Productos</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Factura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay compras que coincidan con los filtros
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((compra) => {
                const fecha = new Date(compra.fecha);
                return (
                  <TableRow
                    key={compra.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(compra)}
                  >
                    <TableCell className="font-medium tabular-nums">
                      #{compraFolio(compra)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {fecha.toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {compra.proveedor?.name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {new Set((compra.items ?? []).map((i) => i.product?.documentId ?? i.productName)).size}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {compra.operador ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={compra.estado === "registrada" ? "default" : "destructive"}>
                        {compra.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {compra.archivo ? (
                        <Paperclip className="inline h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          label={`${filtered.length} ${filtered.length === 1 ? "compra" : "compras"}`}
        />
      )}

      {/* TODO: restaurar total comprado cuando se habiliten costos */}

      {/* Detail dialog */}
      <CompraDetailDialog
        compra={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface CompraDetailDialogProps {
  compra: CompraType | null;
  open: boolean;
  onClose: () => void;
}

function CompraDetailDialog({ compra, open, onClose }: CompraDetailDialogProps) {
  const [downloading, setDownloading] = useState(false);

  // Se descarga a traves de /api/descargar y no directo del CDN: CloudFront no
  // manda cabeceras CORS, asi que un fetch desde el navegador falla con
  // NetworkError. Pedirlo al propio servidor evita CORS y conserva el nombre.
  const handleDownload = useCallback(async (url: string, name: string) => {
    setDownloading(true);
    try {
      const ruta = `/api/descargar?url=${encodeURIComponent(url)}&nombre=${encodeURIComponent(name)}`;
      const res = await fetch(ruta);
      if (!res.ok) throw new Error(`el servidor respondio ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("descarga del adjunto:", error);
      toast.error("No se pudo descargar el archivo. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!compra) return null;

  const fecha = new Date(compra.fecha);

  const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("es-MX");
  const fmtIva = (iva?: "iva8" | "iva16" | "exento") =>
    iva === "iva8" ? "8%" : iva === "iva16" ? "16%" : "—";
  const items = compra.items ?? [];
  const grouped = groupCompraItems(items);
  const showCosts = compra.total > 0;
  const showIva = items.some((i) => i.iva && i.iva !== "exento");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Compra{" "}
            <span className="text-muted-foreground font-normal">
              #{compraFolio(compra)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {fecha.toLocaleDateString("es-MX")} —{" "}
                {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Proveedor</p>
              <p className="font-medium">{compra.proveedor?.name ?? <span className="text-muted-foreground">Sin especificar</span>}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Operador</p>
              <p className="font-medium">{compra.operador ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado</p>
              <Badge variant={compra.estado === "registrada" ? "default" : "destructive"} className="mt-0.5">
                {compra.estado}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Productos</p>
              <p className="font-medium">{grouped.length} {grouped.length === 1 ? "producto" : "productos"}</p>
            </div>
            {showCosts && (
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold text-base">${fmt(compra.total)}</p>
              </div>
            )}
            {compra.notas && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notas</p>
                <p className="font-medium">{compra.notas}</p>
              </div>
            )}
            {compra.archivo && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Factura adjunta</p>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => {
                    handleDownload(
                      urlOriginal(compra.archivo!.url),
                      nombreDescargaFactura(compra, compra.archivo!.name)
                    );
                  }}
                  className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-64">{compra.archivo.name}</span>
                  <Download className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* Items agrupados por producto, con sus lotes */}
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-80 overflow-y-auto divide-y">
              {grouped.map((g) => (
                <div key={g.key} className="px-3 py-2.5 space-y-2">
                  {/* Cabecera del producto */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={g.productName}>{g.productName}</p>
                      {showCosts && (
                        <p className="text-xs text-muted-foreground">
                          {g.costoUniforme ? `$${fmt(g.costoUnitario)} c/u` : "Precios por lote"}
                          {showIva && g.iva && g.iva !== "exento" ? ` · IVA ${fmtIva(g.iva)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">x{g.totalQty}</Badge>
                      {showCosts && <span className="text-sm font-medium w-20 text-right">${fmt(g.totalLine)}</span>}
                    </div>
                  </div>

                  {/* Lotes del producto */}
                  <div className="rounded-md bg-muted/40 divide-y text-xs">
                    {g.lotes.map((l, li) => (
                      <div key={li} className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {l.numeroLote?.trim() ? `Lote ${l.numeroLote.trim()}` : "Sin lote"}
                          </span>
                          {l.fechaCaducidad && (
                            <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                              <CalendarClock className="h-3 w-3" />
                              {fmtDate(l.fechaCaducidad)}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          x{l.quantity}
                          {showCosts && !g.costoUniforme ? ` · $${fmt(l.costoUnitario)} c/u` : ""}
                          {showCosts ? ` · $${fmt(l.totalLine)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {showCosts && (
              <div className="flex justify-end border-t px-4 py-2 bg-muted/30">
                <span className="font-semibold">Total: ${fmt(compra.total)}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
