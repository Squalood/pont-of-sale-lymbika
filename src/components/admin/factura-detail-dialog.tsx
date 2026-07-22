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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "lucide-react";
import { FacturaType } from "@/types/factura";
import { printInvoice } from "@/lib/print-invoice";
import { patchFacturaEstadoPago } from "@/api/patchFacturaEstadoPago";

// ── Types ─────────────────────────────────────────────────────────────────────

type EstadoPago = "pendiente" | "pagada" | "pagada_parcial";

interface PaymentFormState {
  estadoPago: EstadoPago;
  montoPagado: number;
  fechaPago: Date;
}

interface FacturaDetailDialogProps {
  factura: FacturaType | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (patch: Partial<FacturaType>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return (n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          {value.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
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

export function FacturaDetailDialog({ factura, open, onClose, onUpdated }: FacturaDetailDialogProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [savingPago, setSavingPago] = useState(false);
  const [localEstadoPago, setLocalEstadoPago] = useState<EstadoPago | null>(null);
  const [localMontoPagado, setLocalMontoPagado] = useState<number | null>(null);
  const [localFechaPago, setLocalFechaPago] = useState<string | null | undefined>(undefined);

  if (!factura) return null;

  const fecha = new Date(factura.fecha);
  const estadoPago: EstadoPago = localEstadoPago ?? factura.estadoPago ?? "pendiente";
  const montoPagado: number = localMontoPagado ?? factura.montoPagado ?? 0;
  const fechaPago: string | null = localFechaPago !== undefined ? localFechaPago : (factura.fechaPago ?? null);

  function openPaymentForm() {
    setPaymentForm({
      estadoPago: estadoPago === "pendiente" ? "pagada" : estadoPago,
      montoPagado: estadoPago === "pendiente" ? factura!.total : montoPagado,
      fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
    });
    setShowPaymentForm(true);
  }

  function setFormField<K extends keyof PaymentFormState>(key: K, value: PaymentFormState[K]) {
    setPaymentForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleConfirmPago() {
    if (!paymentForm) return;
    setSavingPago(true);
    try {
      const fechaISO = paymentForm.fechaPago.toISOString();
      await patchFacturaEstadoPago(factura!.documentId, {
        estadoPago: paymentForm.estadoPago,
        montoPagado: paymentForm.montoPagado,
        fechaPago: fechaISO,
      });
      setLocalEstadoPago(paymentForm.estadoPago);
      setLocalMontoPagado(paymentForm.montoPagado);
      setLocalFechaPago(fechaISO);
      onUpdated?.({
        estadoPago: paymentForm.estadoPago,
        montoPagado: paymentForm.montoPagado,
        fechaPago: fechaISO,
      });
      setShowPaymentForm(false);
    } catch (err) {
      console.error(err);
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setShowPaymentForm(false); onClose(); } }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]" aria-describedby={undefined}>
        <DialogHeader className="shrink-0">
          <DialogTitle>
            Factura{" "}
            <span className="text-muted-foreground font-normal">{factura.folio}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p className="font-medium">
                {fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
            {factura.fechaVencimiento && (
              <div>
                <span className="text-muted-foreground">Vencimiento</span>
                <p className="font-medium">
                  {new Date(factura.fechaVencimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Estado</span>
              <p>
                <Badge variant={factura.estado === "cancelada" ? "destructive" : "default"}>
                  {factura.estado ?? "emitida"}
                </Badge>
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

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center w-14">Cant.</TableHead>
                <TableHead className="text-right w-24">P.U.</TableHead>
                <TableHead className="text-center w-20">Impuesto</TableHead>
                <TableHead className="text-right w-24">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factura.items?.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-44 truncate">{item.descripcion}</TableCell>
                  <TableCell className="text-center">{item.cantidad}</TableCell>
                  <TableCell className="text-right">${fmt(item.precioUnitario)}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {IMPUESTO_LABEL[item.impuesto] ?? item.impuesto}
                  </TableCell>
                  <TableCell className="text-right">${fmt(item.cantidad * item.precioUnitario)}</TableCell>
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

          {/* Estado de pago */}
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

            {/* Info de pago si ya fue registrado */}
            {estadoPago !== "pendiente" && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Monto pagado</span>
                  <p className="font-medium">${fmt(montoPagado)}</p>
                </div>
                {fechaPago && (
                  <div>
                    <span className="text-muted-foreground">Fecha de pago</span>
                    <p className="font-medium">
                      {new Date(fechaPago).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Inline form de pago */}
            {showPaymentForm && paymentForm ? (
              <div className="space-y-3 pt-1 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select
                      value={paymentForm.estadoPago}
                      onValueChange={(v) => {
                        const ep = v as EstadoPago;
                        setFormField("estadoPago", ep);
                        if (ep === "pagada") setFormField("montoPagado", factura!.total);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pagada">Pagada</SelectItem>
                        <SelectItem value="pagada_parcial">Pago parcial</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monto pagado</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={paymentForm.montoPagado}
                      onChange={(e) => setFormField("montoPagado", Math.max(0, Number(e.target.value) || 0))}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de pago</Label>
                  <DatePickerField
                    value={paymentForm.fechaPago}
                    onChange={(d) => setFormField("fechaPago", d)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)} disabled={savingPago}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleConfirmPago} disabled={savingPago}>
                    {savingPago ? "Guardando..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={openPaymentForm}>
                {estadoPago === "pendiente" ? "Registrar pago" : "Editar pago"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReprint}>
            <Printer className="h-4 w-4" />
            Reimprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
