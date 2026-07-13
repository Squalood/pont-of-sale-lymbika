"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { VentaType } from "@/types/venta";
import { printInvoice } from "@/lib/print-invoice";
import { postFactura } from "@/api/postFactura";
import { useCaja } from "@/lib/caja-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImpuestoType = "iva16" | "iva8" | "exento";

interface LineState {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: ImpuestoType;
  productDocumentId: string | null;
}

interface CfdiState {
  folio: string;
  cliente: string;
  rfc: string;
  tipoCliente: "empresa" | "particular" | "";
  formaDePago: string;
  usoCfdi: string;
  cfdiAlPublico: boolean;
  fechaFactura: Date;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CFDI_USES = [
  { value: "G03 - Gastos en general", label: "G03 - Gastos en general" },
  { value: "G01 - Adquisición de mercancias", label: "G01 - Adquisición de mercancias" },
  { value: "G02 - Devoluciones, descuentos o bonificaciones", label: "G02 - Devoluciones" },
  { value: "D01 - Honorarios médicos, dentales y gastos hospitalarios", label: "D01 - Honorarios médicos" },
  { value: "P01 - Por definir", label: "P01 - Por definir" },
];

const FORMA_PAGO_MAP: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transfe: "Transferencia",
  mixto: "Mixto",
};

function fmt(n: number) {
  return (n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ── InvoiceFromSaleDialog ─────────────────────────────────────────────────────

interface InvoiceFromSaleDialogProps {
  venta: VentaType | null;
  open: boolean;
  onClose: () => void;
}

function makeInitialCfdi(venta: VentaType): CfdiState {
  return {
    folio: "",
    cliente: "",
    rfc: "",
    tipoCliente: "",
    formaDePago: FORMA_PAGO_MAP[venta.metodoPago] ?? venta.metodoPago,
    usoCfdi: "",
    cfdiAlPublico: false,
    fechaFactura: new Date(venta.fecha),
  };
}

function makeLines(venta: VentaType): LineState[] {
  return (venta.venta ?? []).map((item) => ({
    descripcion: item.productName,
    cantidad: item.quantity,
    precioUnitario: item.unitPrice,
    impuesto: "exento" as ImpuestoType,
    productDocumentId: item.product?.id ? String(item.product.id) : null,
  }));
}

export function InvoiceFromSaleDialog({ venta, open, onClose }: InvoiceFromSaleDialogProps) {
  const { pharmacyId } = useCaja();
  const [cfdi, setCfdi] = useState<CfdiState | null>(null);
  const [lines, setLines] = useState<LineState[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venta) {
      setCfdi(makeInitialCfdi(venta));
      setLines(makeLines(venta));
    }
  }, [venta]);

  const { subtotal, ivaAmount16, ivaAmount8, total } = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const ivaBase16 = lines.filter((l) => l.impuesto === "iva16").reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const ivaBase8 = lines.filter((l) => l.impuesto === "iva8").reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const ivaAmount16 = ivaBase16 * 0.16;
    const ivaAmount8 = ivaBase8 * 0.08;
    return { subtotal, ivaAmount16, ivaAmount8, total: subtotal + ivaAmount16 + ivaAmount8 };
  }, [lines]);

  if (!venta || !cfdi) return null;

  function setField<K extends keyof CfdiState>(key: K, value: CfdiState[K]) {
    setCfdi((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function setLineImpuesto(idx: number, impuesto: ImpuestoType) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, impuesto } : l));
  }

  async function handleGenerate() {
    if (!cfdi || !venta) return;
    const folio = cfdi.folio.trim() || "FAC-" + Date.now();
    const invoiceLines = lines.map(({ descripcion, cantidad, precioUnitario, impuesto }) => ({
      descripcion,
      cantidad,
      precioUnitario,
      impuesto,
    }));

    printInvoice({
      invoiceNumber: folio,
      cliente: cfdi.cliente,
      formaDePago: cfdi.formaDePago,
      politicaDePago: "",
      uso: cfdi.usoCfdi,
      cfdiAlPublico: cfdi.cfdiAlPublico,
      fechaFactura: cfdi.fechaFactura,
      fechaVencimiento: null,
      diario: "Ventas",
      cfdiOrigen: "",
      lines: invoiceLines,
    });

    setSaving(true);
    try {
      await postFactura({
        folio,
        fecha: cfdi.fechaFactura.toISOString(),
        cliente: cfdi.cliente,
        rfc: cfdi.rfc || undefined,
        tipoCliente: (cfdi.tipoCliente as "empresa" | "particular") || undefined,
        formaDePago: cfdi.formaDePago || undefined,
        usoCfdi: cfdi.usoCfdi || undefined,
        cfdiAlPublico: cfdi.cfdiAlPublico,
        diario: "Ventas",
        subtotal,
        iva16: ivaAmount16,
        iva8: ivaAmount8,
        total,
        estado: "emitida",
        items: lines.map(({ descripcion, cantidad, precioUnitario, impuesto, productDocumentId }) => ({
          descripcion,
          cantidad,
          precioUnitario,
          impuesto,
          product: productDocumentId || null,
        })),
        pharmacy: pharmacyId ?? undefined,
        venta_pos: venta.documentId,
      });
      onClose();
    } catch (err) {
      console.error("Error al guardar factura:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]" aria-describedby={undefined}>
        <DialogHeader className="shrink-0">
          <DialogTitle>
            Generar factura{" "}
            <span className="text-muted-foreground font-normal text-sm">
              desde venta #{String(venta.id).padStart(5, "0")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">

          {/* Campos CFDI — 2 columnas */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Izquierda */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-cliente">Cliente / Razón social</Label>
                <Input
                  id="f-cliente"
                  value={cfdi.cliente}
                  onChange={(e) => setField("cliente", e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="f-rfc">RFC</Label>
                  <Input
                    id="f-rfc"
                    value={cfdi.rfc}
                    onChange={(e) => setField("rfc", e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={cfdi.tipoCliente}
                    onValueChange={(v) => setField("tipoCliente", v as CfdiState["tipoCliente"])}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Uso CFDI</Label>
                <Select value={cfdi.usoCfdi} onValueChange={(v) => setField("usoCfdi", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {CFDI_USES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Derecha */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-folio">No. Factura (opcional)</Label>
                <Input
                  id="f-folio"
                  value={cfdi.folio}
                  onChange={(e) => setField("folio", e.target.value)}
                  placeholder="Auto-generado si se deja vacío"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de factura</Label>
                <DatePickerField
                  value={cfdi.fechaFactura}
                  onChange={(d) => setField("fechaFactura", d)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pago</Label>
                <Input
                  value={cfdi.formaDePago}
                  onChange={(e) => setField("formaDePago", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="f-cfdi-pub"
                  checked={cfdi.cfdiAlPublico}
                  onCheckedChange={(v) => setField("cfdiAlPublico", !!v)}
                />
                <Label htmlFor="f-cfdi-pub" className="cursor-pointer">CFDI al público general</Label>
              </div>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Líneas de factura
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center w-14">Cant.</TableHead>
                  <TableHead className="text-right w-24">P.U.</TableHead>
                  <TableHead className="w-32">Impuesto</TableHead>
                  <TableHead className="text-right w-24">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{line.descripcion}</TableCell>
                    <TableCell className="text-center text-sm">{line.cantidad}</TableCell>
                    <TableCell className="text-right text-sm">${fmt(line.precioUnitario)}</TableCell>
                    <TableCell>
                      <Select
                        value={line.impuesto}
                        onValueChange={(v) => setLineImpuesto(idx, v as ImpuestoType)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iva16">IVA 16%</SelectItem>
                          <SelectItem value="iva8">IVA 8%</SelectItem>
                          <SelectItem value="exento">Exento</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      ${fmt(line.cantidad * line.precioUnitario)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-52 space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>${fmt(subtotal)}</span>
              </div>
              {ivaAmount16 > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (16%)</span><span>${fmt(ivaAmount16)}</span>
                </div>
              )}
              {ivaAmount8 > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (8%)</span><span>${fmt(ivaAmount8)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>${fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Badge venta vinculada */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              Vinculada a venta #{String(venta.id).padStart(5, "0")}
            </Badge>
            {venta.pharmacies?.[0] && (
              <span>· {venta.pharmacies[0].nombre}</span>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={saving}>
            <Printer className="h-4 w-4" />
            {saving ? "Guardando..." : "Generar / Imprimir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
