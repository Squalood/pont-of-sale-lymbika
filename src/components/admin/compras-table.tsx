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
import { Paperclip, Download, Plus } from "lucide-react";
import { CompraType } from "@/types/compra";

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
              <TableHead className="text-center"># Items</TableHead>
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
                      {compra.items?.length ?? 0}
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

  const handleDownload = useCallback(async (url: string, name: string) => {
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!compra) return null;

  const fecha = new Date(compra.fecha);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Detalle de compra{" "}
            <span className="text-muted-foreground font-normal">
              #{String(compra.id).padStart(5, "0")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p className="font-medium">
                {fecha.toLocaleDateString("es-MX")} —{" "}
                {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Proveedor</span>
              <p className="font-medium">{compra.proveedor?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Operador</span>
              <p className="font-medium">{compra.operador ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Estado</span>
              <p>
                <Badge variant={compra.estado === "registrada" ? "default" : "destructive"}>
                  {compra.estado}
                </Badge>
              </p>
            </div>
            {compra.notas && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Notas</span>
                <p className="font-medium">{compra.notas}</p>
              </div>
            )}
            {compra.archivo && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Factura adjunta</span>
                <div className="mt-1">
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => {
                      const url = compra.archivo!.url.startsWith("http")
                        ? compra.archivo!.url
                        : `${backendUrl}${compra.archivo!.url}`;
                      handleDownload(url, compra.archivo!.name);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-56">{compra.archivo.name}</span>
                    <Download className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Cant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(compra.items ?? []).map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-48 truncate">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* TODO: restaurar total cuando se habiliten costos */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
