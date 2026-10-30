"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, Download, PackageCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/admin/kpi-card";
import { SaleDetailDialog } from "@/components/admin/sale-detail-dialog";
import { getLotTrace, type LotTrace, type LotTraceMovement } from "@/api/posStock";
import { fetchVenta } from "@/api/getVentas";
import { fmtCaducidad } from "@/lib/venta-lotes";
import { downloadCSV } from "@/lib/csv";
import type { VentaType } from "@/types/venta";

const folio = (n: number | null) => (n == null ? "—" : `#${String(n).padStart(5, "0")}`);

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-MX")} ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
}

const STATE_LABEL: Record<string, string> = { activo: "Activo", agotado: "Agotado", vencido: "Mermado" };

/** Qué fue cada operación de la bitácora, en palabras del mostrador. */
function kindLabel(m: LotTraceMovement): string {
  switch (m.kind) {
    case "sale":
      return "Venta";
    case "return":
      return "Devolución";
    case "purchase":
      return "Compra";
    case "transfer":
      return "Traspaso";
    case "adjust":
      return m.refType === "count" ? "Conteo" : "Corrección";
    case "discard":
      return "Merma";
    case "migration":
      return "Bodega → farmacia";
    default:
      return m.kind;
  }
}

function reference(m: LotTraceMovement): string {
  if (m.kind === "sale") return `Venta ${folio(m.folio)}`;
  if (m.kind === "purchase") return [`Compra ${folio(m.folio)}`, m.refLabel].filter(Boolean).join(" · ");
  return m.notes ?? "";
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Historia de un lote físico: dónde queda existencia, en qué ventas salió y qué operaciones lo
 * movieron. Es la vista de un retiro de lote: "¿a quién se le vendió?".
 */
export function LotTraceView({ lotDocumentId }: { lotDocumentId: string }) {
  const [data, setData] = useState<LotTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venta, setVenta] = useState<VentaType | null>(null);
  const [openingFolio, setOpeningFolio] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLotTrace(lotDocumentId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lotDocumentId]);

  async function openVenta(documentId: string) {
    setOpeningFolio(documentId);
    try {
      setVenta(await fetchVenta(documentId));
    } catch (err) {
      toast.error("No se pudo abrir la venta.", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setOpeningFolio(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">No se pudo cargar el rastreo del lote: {error}</p>;
  }

  const { lot, locations, sales, movements } = data;
  const vigentes = sales.filter((s) => s.estado !== "cancelada");
  const sold = vigentes.reduce((s, x) => s + x.quantity, 0);
  const canceladas = sales.length - vigentes.length;
  const inexactas = sales.filter((s) => !s.exact).length;
  const stock = locations.reduce((s, l) => s + l.currentAmount, 0);
  const mermado = locations.reduce((s, l) => s + (l.discardedQuantity ?? 0), 0);
  const cad = fmtCaducidad(lot.expirationDate);

  function exportCSV() {
    const name = `lote-${(lot.lotNumber ?? lot.documentId).replace(/[^\w-]+/g, "_")}`;
    downloadCSV(
      `ventas-${name}.csv`,
      ["Folio", "Fecha", "Farmacia", "Operador", "Producto", "Lote", "Caducidad", "Piezas", "Estado", "Exacto"],
      sales.map((s) => [
        folio(s.folio),
        fmtFecha(s.fecha),
        s.pharmacyName ?? "",
        s.operador ?? "",
        lot.product?.productName ?? "",
        lot.lotNumber ?? "",
        cad ?? "",
        s.quantity,
        s.estado ?? "",
        s.exact ? "Sí" : "No (lote elegido al cobrar)",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{lot.product?.productName ?? "Producto sin nombre"}</h2>
        <p className="text-sm text-muted-foreground">
          Lote <span className="font-mono">{lot.lotNumber ?? "sin número"}</span>
          {cad ? ` · Caduca ${cad}` : " · Sin caducidad"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Existencia actual"
          value={String(stock)}
          icon={Boxes}
          tone="blue"
          hint={`en ${locations.length} registro${locations.length === 1 ? "" : "s"} del lote`}
        />
        <KpiCard
          label="Piezas vendidas"
          value={String(sold)}
          icon={PackageCheck}
          tone="green"
          hint={`en ${vigentes.length} venta${vigentes.length === 1 ? "" : "s"}${canceladas ? ` · ${canceladas} cancelada${canceladas === 1 ? "" : "s"} aparte` : ""}`}
        />
        <KpiCard label="Mermadas" value={String(mermado)} icon={Trash2} tone="rose" />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Inicial</TableHead>
              <TableHead className="text-right">Existencia</TableHead>
              <TableHead className="text-right">Mermado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((l) => (
              <TableRow key={l.documentId}>
                <TableCell>{l.locationName}</TableCell>
                <TableCell>
                  <Badge variant={l.state === "activo" ? "default" : "secondary"}>{STATE_LABEL[l.state] ?? l.state}</Badge>
                </TableCell>
                <TableCell className="text-right">{l.initialQuantity ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{l.currentAmount}</TableCell>
                <TableCell className="text-right">{l.discardedQuantity ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Tabs defaultValue="ventas">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="ventas">Ventas ({sales.length})</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos ({movements.length})</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={sales.length === 0}>
            <Download className="h-4 w-4" />
            CSV de ventas
          </Button>
        </div>

        <TabsContent value="ventas" className="space-y-2">
          {inexactas > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {inexactas} venta{inexactas === 1 ? " es anterior" : "s son anteriores"} al 28-sep-2026: de ellas solo se sabe
              el lote que eligió el cajero. Si no alcanzaba, pudo salir mercancía de otro lote.
            </p>
          )}
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Farmacia</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Piezas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay ventas registradas de este lote.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((s) => (
                    <TableRow key={s.ventaDocumentId}>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 font-mono"
                          onClick={() => openVenta(s.ventaDocumentId)}
                          disabled={openingFolio === s.ventaDocumentId}
                        >
                          {folio(s.folio)}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm">{fmtFecha(s.fecha)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.pharmacyName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.operador ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{s.quantity}</TableCell>
                      <TableCell className="space-x-1">
                        {s.estado === "cancelada" && <Badge variant="destructive">cancelada</Badge>}
                        {!s.exact && (
                          <Badge variant="outline" className="font-normal" title="Venta anterior a la bitácora de stock">
                            elegido al cobrar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimientos">
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Sin movimientos en la bitácora (existe desde el 28-sep-2026).
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.opKey}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtFecha(m.fecha)}</TableCell>
                      <TableCell className="text-sm">{kindLabel(m)}</TableCell>
                      <TableCell className="max-w-56 truncate text-sm text-muted-foreground">{reference(m)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.moves.map((x, i) => (
                          <div key={i}>
                            {x.locationName} {signed(x.delta)}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">{signed(m.delta)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <SaleDetailDialog venta={venta} open={!!venta} onClose={() => setVenta(null)} />
    </div>
  );
}
