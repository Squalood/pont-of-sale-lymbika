"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Printer, Undo2 } from "lucide-react";
import { FacturaItemType, FacturaType } from "@/types/factura";
import { printInvoice } from "@/lib/print-invoice";
import { patchFacturaPagoLineas } from "@/api/patchFacturaPagoLineas";
import { EstadoFacturaBadge } from "@/components/admin/estado-factura-badge";
import { puedeRestablecerABorrador } from "@/lib/factura-edicion";
import { patchFacturaEstado } from "@/api/patchFacturaEstado";
import { toast } from "sonner";
import { folioVisible } from "@/lib/factura-folio";
import {
  importeLinea,
  lineasPagadasIniciales,
  resumenPago,
  tieneDetallePorLinea,
} from "@/lib/factura-pago";

// ── Types ─────────────────────────────────────────────────────────────────────

type EstadoPago = "pendiente" | "pagada" | "pagada_parcial";

interface FacturaDetailDialogProps {
  factura: FacturaType | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (patch: Partial<FacturaType>) => void;
  /** Abre el editor con la factura ya como borrador (recién restablecida, o que ya lo era). */
  onEdit?: (factura: FacturaType) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return (n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Date → "YYYY-MM-DD" con la fecha local (toISOString la correría a UTC). */
function toYMD(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" → Date local a mediodía: `new Date("2026-11-06")` es UTC y en México se ve un día antes. */
function fromYMD(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

const IMPUESTO_LABEL: Record<string, string> = {
  iva16: "IVA 16%",
  iva8: "IVA 8%",
  exento: "Exento",
};

const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  pagada_parcial: "Pago parcial",
};

function estadoPagoBadgeVariant(ep: EstadoPago) {
  if (ep === "pagada") return "default" as const;
  if (ep === "pagada_parcial") return "outline" as const;
  return "secondary" as const;
}

function estadoPagoBadgeClass(ep: EstadoPago) {
  if (ep === "pagada") return "bg-emerald-600 text-white border-emerald-600";
  if (ep === "pagada_parcial") return "border-blue-400 text-blue-700";
  return "bg-amber-100 text-amber-800 border-amber-300";
}

// ── DatePickerField ───────────────────────────────────────────────────────────

function DatePickerField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal text-sm h-9">
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {fmtFecha(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── FacturaDetailDialog ───────────────────────────────────────────────────────

export function FacturaDetailDialog({ factura, open, onClose, onUpdated, onEdit }: FacturaDetailDialogProps) {
  // null = no se está registrando pago; si no, las líneas marcadas en el formulario.
  const [marcadas, setMarcadas] = useState<Set<number> | null>(null);
  const [fechaNueva, setFechaNueva] = useState<Date>(new Date());
  const [savingPago, setSavingPago] = useState(false);
  const [confirmRestablecer, setConfirmRestablecer] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);

  if (!factura) return null;

  // `factura` llega ya parchada por la tabla (onUpdated), así que no hace falta copia local.
  const fecha = new Date(factura.fecha);
  const esBorrador = factura.estado === "borrador";
  const estadoPago: EstadoPago = factura.estadoPago ?? "pendiente";
  const montoPagado: number = factura.montoPagado ?? 0;
  const fechaPago: string | null = factura.fechaPago ?? null;
  const restablecible = puedeRestablecerABorrador(factura, estadoPago);
  const items = factura.items ?? [];
  const pagadasActuales = lineasPagadasIniciales(factura, estadoPago);
  // Pago parcial tecleado antes del detalle por producto: no se sabe qué cubrió.
  const pagoSinDetalle =
    estadoPago === "pagada_parcial" && montoPagado > 0 && !tieneDetallePorLinea(factura);
  const editando = marcadas !== null;
  const preview = editando ? resumenPago(factura, marcadas) : null;
  const todasMarcadas = editando && items.length > 0 && items.every((i) => marcadas.has(i.id));

  function cerrar() {
    setMarcadas(null);
    setConfirmRestablecer(false);
    onClose();
  }

  async function handleRestablecer() {
    setRestableciendo(true);
    try {
      await patchFacturaEstado(factura!.documentId, "borrador");
      onUpdated?.({ estado: "borrador" });
      setConfirmRestablecer(false);
      onEdit?.({ ...factura!, estado: "borrador" });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo restablecer a borrador", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRestableciendo(false);
    }
  }

  function abrirPago() {
    setMarcadas(new Set(pagadasActuales));
    setFechaNueva(new Date());
  }

  function toggleLinea(id: number) {
    setMarcadas((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodas() {
    setMarcadas(todasMarcadas ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function handleConfirmPago() {
    if (!marcadas) return;
    const fechaHoy = toYMD(fechaNueva);
    // Respaldo para líneas que ya estaban pagadas sin fecha propia (facturas anteriores a esto).
    const fechaRespaldo = fechaPago ? toYMD(new Date(fechaPago)) : fechaHoy;
    const nuevosItems: FacturaItemType[] = items.map((i) => {
      if (!marcadas.has(i.id)) return { ...i, pagado: false, fechaPago: null };
      // Las que ya estaban pagadas conservan su fecha; solo las recién marcadas toman la nueva.
      const fechaLinea = pagadasActuales.has(i.id) ? (i.fechaPago ?? fechaRespaldo) : fechaHoy;
      return { ...i, pagado: true, fechaPago: fechaLinea };
    });
    const { estadoPago: nuevoEstado, montoPagado: nuevoMonto } = resumenPago(factura!, marcadas);
    const fechas = nuevosItems.flatMap((i) => (i.pagado && i.fechaPago ? [i.fechaPago] : []));
    const ultima = fechas.sort().at(-1);
    const nuevaFechaPago = ultima ? fromYMD(ultima).toISOString() : null;

    setSavingPago(true);
    try {
      await patchFacturaPagoLineas(factura!.documentId, {
        estadoPago: nuevoEstado,
        montoPagado: nuevoMonto,
        fechaPago: nuevaFechaPago,
        items: nuevosItems,
      });
      onUpdated?.({
        estadoPago: nuevoEstado,
        montoPagado: nuevoMonto,
        fechaPago: nuevaFechaPago,
        items: nuevosItems,
      });
      setMarcadas(null);
      toast.success(`Pago guardado: ${ESTADO_PAGO_LABEL[nuevoEstado]} ($${fmt(nuevoMonto)})`);
    } catch (err) {
      console.error(err);
      toast.error("No se guardó el pago; la factura quedó como estaba", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingPago(false);
    }
  }

  function handleReprint() {
    printInvoice({
      invoiceNumber: factura!.folio,
      cliente: factura!.cliente,
      formaDePago: factura!.formaDePago ?? "",
      politicaDePago: factura!.politicaDePago ?? "",
      uso: factura!.usoCfdi ?? "",
      cfdiAlPublico: factura!.cfdiAlPublico,
      fechaFactura: new Date(factura!.fecha),
      fechaVencimiento: factura!.fechaVencimiento ? new Date(factura!.fechaVencimiento) : null,
      diario: factura!.diario ?? "",
      cfdiOrigen: factura!.cfdiOrigen ?? "",
      lines: factura!.items.map((item) => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        impuesto: item.impuesto,
      })),
      pharmacy: factura!.pharmacy,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cerrar(); }}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]" aria-describedby={undefined}>
        <DialogHeader className="shrink-0">
          <DialogTitle>
            Factura{" "}
            <span className="text-muted-foreground font-normal">{folioVisible(factura.folio) || "sin folio"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p className="font-medium">{fmtFecha(fecha)}</p>
            </div>
            {factura.fechaVencimiento && (
              <div>
                <span className="text-muted-foreground">Vencimiento</span>
                <p className="font-medium">{fmtFecha(fromYMD(factura.fechaVencimiento))}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Estado</span>
              <p>
                <EstadoFacturaBadge estado={factura.estado} />
              </p>
            </div>
            {factura.pharmacy && (
              <div>
                <span className="text-muted-foreground">Sucursal</span>
                <p className="font-medium">{factura.pharmacy.nombre}</p>
              </div>
            )}
          </div>

          {/* Datos del cliente */}
          <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Nombre / Razón social</span>
                <p className="font-medium">{factura.cliente}</p>
              </div>
              {factura.rfc && (
                <div>
                  <span className="text-muted-foreground">RFC</span>
                  <p className="font-medium font-mono">{factura.rfc}</p>
                </div>
              )}
              {factura.tipoCliente && (
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium capitalize">{factura.tipoCliente}</p>
                </div>
              )}
              {factura.formaDePago && (
                <div>
                  <span className="text-muted-foreground">Forma de pago</span>
                  <p className="font-medium">{factura.formaDePago}</p>
                </div>
              )}
              {factura.usoCfdi && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Uso CFDI</span>
                  <p className="font-medium">{factura.usoCfdi}</p>
                </div>
              )}
              {factura.cfdiOrigen && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">CFDI Origen</span>
                  <p className="font-medium font-mono text-xs">{factura.cfdiOrigen}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items: fuera de borrador, cada línea muestra (o permite marcar) si ya se pagó. */}
          <Table>
            <TableHeader>
              <TableRow>
                {editando && (
                  <TableHead className="w-8">
                    <Checkbox
                      checked={todasMarcadas}
                      onCheckedChange={toggleTodas}
                      aria-label="Marcar todas como pagadas"
                      disabled={savingPago}
                    />
                  </TableHead>
                )}
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center w-14">Cant.</TableHead>
                <TableHead className="text-right w-24">P.U.</TableHead>
                <TableHead className="text-center w-20">Impuesto</TableHead>
                <TableHead className="text-right w-24">Importe</TableHead>
                {!esBorrador && !editando && <TableHead className="w-24">Pago</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className={editando ? "cursor-pointer" : undefined}
                  onClick={editando && !savingPago ? () => toggleLinea(item.id) : undefined}
                >
                  {editando && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={marcadas.has(item.id)}
                        onCheckedChange={() => toggleLinea(item.id)}
                        aria-label={`Marcar ${item.descripcion} como pagado`}
                        disabled={savingPago}
                      />
                    </TableCell>
                  )}
                  <TableCell className="max-w-44 truncate">{item.descripcion}</TableCell>
                  <TableCell className="text-center">{item.cantidad}</TableCell>
                  <TableCell className="text-right">${fmt(item.precioUnitario)}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {IMPUESTO_LABEL[item.impuesto] ?? item.impuesto}
                  </TableCell>
                  <TableCell className="text-right">${fmt(item.cantidad * item.precioUnitario)}</TableCell>
                  {!esBorrador && !editando && (
                    <TableCell>
                      {pagadasActuales.has(item.id) ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <Badge className="bg-emerald-600 text-white border-emerald-600">Pagado</Badge>
                          {item.fechaPago && (
                            <span className="text-xs text-muted-foreground">
                              {fmtFecha(fromYMD(item.fechaPago))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totales */}
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${fmt(factura.subtotal)}</span>
            </div>
            {(factura.iva16 ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IVA (16%)</span>
                <span>${fmt(factura.iva16)}</span>
              </div>
            )}
            {(factura.iva8 ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IVA (8%)</span>
                <span>${fmt(factura.iva8)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>${fmt(factura.total)}</span>
            </div>
          </div>

          {/* Estado de pago: un borrador todavía no es cobrable. */}
          {!esBorrador && (
            <div className="rounded-md border px-4 py-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado de pago
                </p>
                <Badge
                  variant={estadoPagoBadgeVariant(estadoPago)}
                  className={estadoPagoBadgeClass(estadoPago)}
                >
                  {ESTADO_PAGO_LABEL[estadoPago]}
                </Badge>
              </div>

              {estadoPago !== "pendiente" && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Monto pagado</span>
                    <p className="font-medium">
                      ${fmt(montoPagado)}{" "}
                      <span className="text-muted-foreground font-normal">de ${fmt(factura.total)}</span>
                    </p>
                  </div>
                  {fechaPago && (
                    <div>
                      <span className="text-muted-foreground">Último pago</span>
                      <p className="font-medium">{fmtFecha(new Date(fechaPago))}</p>
                    </div>
                  )}
                </div>
              )}

              {pagoSinDetalle && !editando && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Pago registrado antes del detalle por producto: ${fmt(montoPagado)}. Marca los productos
                  pagados para actualizarlo.
                </p>
              )}

              {editando && preview ? (
                <div className="space-y-3 pt-1 border-t">
                  <p className="text-muted-foreground">
                    Marca en la tabla los productos que ya están pagados. El monto y el estado se calculan solos.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Fecha de pago (para los recién marcados)</Label>
                    <DatePickerField value={fechaNueva} onChange={setFechaNueva} />
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <span>
                      Pagado <strong className="tabular-nums">${fmt(preview.montoPagado)}</strong> de $
                      {fmt(factura.total)}
                      {preview.estadoPago !== "pagada" && (
                        <span className="text-muted-foreground">
                          {" "}· Resta ${fmt(Math.max(0, (factura.total ?? 0) - preview.montoPagado))}
                        </span>
                      )}
                    </span>
                    <Badge
                      variant={estadoPagoBadgeVariant(preview.estadoPago)}
                      className={estadoPagoBadgeClass(preview.estadoPago)}
                    >
                      {ESTADO_PAGO_LABEL[preview.estadoPago]}
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setMarcadas(null)} disabled={savingPago}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleConfirmPago} disabled={savingPago}>
                      {savingPago && <Spinner />}
                      {savingPago ? "Guardando..." : "Confirmar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={abrirPago}>
                  {estadoPago === "pendiente" ? "Registrar pago" : "Editar pago"}
                </Button>
              )}
            </div>
          )}
        </div>

        {confirmRestablecer ? (
          // Confirmación en línea: la factura sale del total y de Pendientes hasta que se vuelva a generar.
          <div className="shrink-0 space-y-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
            <p>
              La factura <span className="font-mono">{factura.folio}</span> pasará a borrador, conservando su
              folio. No contará en el total ni en Pendientes hasta que se vuelva a generar.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmRestablecer(false)} disabled={restableciendo}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleRestablecer} disabled={restableciendo}>
                {restableciendo ? "Restableciendo..." : "Restablecer a borrador"}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            {!esBorrador && (
              <Button variant="outline" onClick={handleReprint}>
                <Printer className="h-4 w-4" />
                Reimprimir
              </Button>
            )}
            {restablecible && (
              <Button variant="outline" onClick={() => setConfirmRestablecer(true)}>
                <Undo2 className="h-4 w-4" />
                Restablecer a borrador
              </Button>
            )}
            {esBorrador && (
              <Button onClick={() => onEdit?.(factura)}>
                <Pencil className="h-4 w-4" />
                Editar borrador
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
