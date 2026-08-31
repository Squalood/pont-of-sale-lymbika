"use client";

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { CompraType, CompraItemType } from "@/types/compra";
import { toast } from "sonner";
import { urlOriginal } from "@/lib/media";

// Agrupa las líneas de la compra (aplanadas, una por lote) de vuelta por producto.
interface GroupedCompraItem {
  key: string;
  productName: string;
  costoUnitario: number;
  iva?: "iva8" | "iva16" | "exento";
  totalQty: number;
  totalLine: number;
  lotes: { numeroLote?: string; fechaCaducidad?: string; quantity: number; totalLine: number }[];
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
        iva: it.iva,
        totalQty: 0,
        totalLine: 0,
        lotes: [],
      };
      map.set(key, g);
    }
    g.totalQty += it.quantity;
    g.totalLine += it.totalLine;
    g.lotes.push({
      numeroLote: it.numeroLote,
      fechaCaducidad: it.fechaCaducidad,
      quantity: it.quantity,
      totalLine: it.totalLine,
    });
  }
  return [...map.values()];
}

interface ComprasTableProps {
  compras: CompraType[];
  onNuevaCompra: () => void;
}

type Period = "hoy" | "semana" | "mes" | "todo";

export function ComprasTable({ compras, onNuevaCompra }: ComprasTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CompraType | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return compras.filter((c) => {
      const fecha = new Date(c.fecha);
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

      const matchesSearch =
        search === "" ||
        (c.proveedor?.name ?? "").toLowerCase().includes(search.toLowerCase());

      return matchesPeriod && matchesSearch;
    });
  }, [compras, period, search]);


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de compras</h2>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={onNuevaCompra}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva Compra
          </Button>
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 h-8 text-sm"
          />
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
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
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay compras en este período
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((compra) => {
                const fecha = new Date(compra.fecha);
                return (
                  <TableRow
                    key={compra.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(compra)}
                  >
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

  const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
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
              #{String(compra.id).padStart(5, "0")}
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
                    handleDownload(urlOriginal(compra.archivo!.url), compra.archivo!.name);
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
                          ${fmt(g.costoUnitario)} c/u{showIva && g.iva && g.iva !== "exento" ? ` · IVA ${fmtIva(g.iva)}` : ""}
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
                          x{l.quantity}{showCosts ? ` · $${fmt(l.totalLine)}` : ""}
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
