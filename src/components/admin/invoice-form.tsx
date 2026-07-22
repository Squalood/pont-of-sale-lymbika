"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, PenLine, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProductType } from "@/types/product";
import { printInvoice } from "@/lib/print-invoice";
import { postFactura } from "@/api/postFactura";
import { useCaja } from "@/lib/caja-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImpuestoType = "iva16" | "iva8" | "exento";
type LineMode = "catalog" | "free";

interface InvoiceLine {
  id: string;
  mode: LineMode;
  productDocumentId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: ImpuestoType;
}

interface InvoiceState {
  invoiceNumber: string;
  cliente: string;
  rfc: string;
  tipoCliente: "empresa" | "particular" | "";
  formaDePago: string;
  politicaDePago: string;
  uso: string;
  cfdiAlPublico: boolean;
  fechaFactura: Date;
  fechaVencimiento: Date | null;
  diario: string;
  cfdiOrigen: string;
  lines: InvoiceLine[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CFDI_USES = [
  { value: "G03 - Gastos en general", label: "G03 - Gastos en general" },
  { value: "G01 - Adquisición de mercancias", label: "G01 - Adquisición de mercancias" },
  { value: "G02 - Devoluciones, descuentos o bonificaciones", label: "G02 - Devoluciones, descuentos o bonificaciones" },
  { value: "I01 - Construcciones", label: "I01 - Construcciones" },
  { value: "D01 - Honorarios médicos, dentales y gastos hospitalarios", label: "D01 - Honorarios médicos" },
  { value: "D04 - Donativos", label: "D04 - Donativos" },
  { value: "P01 - Por definir", label: "P01 - Por definir" },
];

const FORMA_PAGO_OPTIONS = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
];

function makeEmptyLine(): InvoiceLine {
  return {
    id: crypto.randomUUID(),
    mode: "catalog",
    productDocumentId: null,
    descripcion: "",
    cantidad: 1,
    precioUnitario: 0,
    impuesto: "iva16",
  };
}

function makeInitialState(): InvoiceState {
  return {
    invoiceNumber: "",
    cliente: "",
    rfc: "",
    tipoCliente: "",
    formaDePago: "",
    politicaDePago: "",
    uso: "",
    cfdiAlPublico: false,
    fechaFactura: new Date(),
    fechaVencimiento: null,
    diario: "Ventas",
    cfdiOrigen: "",
    lines: [makeEmptyLine()],
  };
}

// ── LineRow ───────────────────────────────────────────────────────────────────

interface LineRowProps {
  line: InvoiceLine;
  idx: number;
  products: ProductType[];
  onChange: (idx: number, patch: Partial<InvoiceLine>) => void;
  onRemove: (idx: number) => void;
}

function LineRow({ line, idx, products, onChange, onRemove }: LineRowProps) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.sal ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, search]);

  const importe = line.cantidad * line.precioUnitario;

  function toggleMode() {
    onChange(idx, {
      mode: line.mode === "catalog" ? "free" : "catalog",
      descripcion: "",
      productDocumentId: null,
      precioUnitario: 0,
    });
    setSearch("");
    setShowDropdown(false);
  }

  return (
    <tr className="border-b last:border-0">
      {/* Descripción */}
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1.5 min-w-50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            onClick={toggleMode}
            title={line.mode === "catalog" ? "Cambiar a texto libre" : "Buscar en catálogo"}
          >
            {line.mode === "catalog" ? (
              <Search className="h-3.5 w-3.5" />
            ) : (
              <PenLine className="h-3.5 w-3.5" />
            )}
          </Button>

          <div className="relative flex-1">
            {line.mode === "catalog" ? (
              <>
                <Input
                  value={search !== "" ? search : line.descripcion}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => { if (search) setShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Buscar producto..."
                  className="h-8 text-sm"
                />
                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border bg-background shadow-md max-h-44 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex justify-between gap-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(idx, {
                            descripcion: p.productName,
                            precioUnitario: p.price ?? 0,
                            productDocumentId: p.documentId,
                          });
                          setSearch("");
                          setShowDropdown(false);
                        }}
                      >
                        <span className="truncate">{p.productName}</span>
                        <span className="text-muted-foreground shrink-0">
                          ${(p.price ?? 0).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Input
                value={line.descripcion}
                onChange={(e) => onChange(idx, { descripcion: e.target.value })}
                placeholder="Descripción..."
                className="h-8 text-sm"
              />
            )}
          </div>
        </div>
      </td>

      {/* Cantidad */}
      <td className="py-2 pr-2 w-20">
        <Input
          type="number"
          min={1}
          step={1}
          value={line.cantidad}
          onChange={(e) =>
            onChange(idx, { cantidad: Math.max(1, Number(e.target.value) || 1) })
          }
          className="h-8 text-sm text-center"
        />
      </td>

      {/* Precio Unitario */}
      <td className="py-2 pr-2 w-28">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={line.precioUnitario}
          onChange={(e) =>
            onChange(idx, { precioUnitario: Math.max(0, Number(e.target.value) || 0) })
          }
          className="h-8 text-sm text-right"
        />
      </td>

      {/* Impuesto */}
      <td className="py-2 pr-2 w-32">
        <Select
          value={line.impuesto}
          onValueChange={(v) => onChange(idx, { impuesto: v as ImpuestoType })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iva16">IVA 16%</SelectItem>
            <SelectItem value="iva8">IVA 8%</SelectItem>
            <SelectItem value="exento">Exento</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Importe (read-only) */}
      <td className="py-2 pr-2 w-24 text-right text-sm tabular-nums">
        $
        {importe.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>

      {/* Eliminar */}
      <td className="py-2 w-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(idx)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ── DatePickerField ───────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  value: Date | null;
  onChange: (d: Date | undefined) => void;
  placeholder?: string;
}

function DatePickerField({ value, onChange, placeholder = "Seleccionar fecha" }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start font-normal text-sm h-9"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {value ? (
            value.toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── InvoiceForm ───────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  products: ProductType[];
  onSaved?: () => void;
}

export function InvoiceForm({ products, onSaved }: InvoiceFormProps) {
  const [invoice, setInvoice] = useState<InvoiceState>(makeInitialState);
  const [saving, setSaving] = useState(false);
  const { pharmacyId, caja } = useCaja();

  const { subtotal, ivaAmount16, ivaAmount8, total } = useMemo(() => {
    const subtotal = invoice.lines.reduce(
      (s, l) => s + l.cantidad * l.precioUnitario,
      0
    );
    const ivaBase16 = invoice.lines
      .filter((l) => l.impuesto === "iva16")
      .reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const ivaBase8 = invoice.lines
      .filter((l) => l.impuesto === "iva8")
      .reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const ivaAmount16 = ivaBase16 * 0.16;
    const ivaAmount8 = ivaBase8 * 0.08;
    return { subtotal, ivaAmount16, ivaAmount8, total: subtotal + ivaAmount16 + ivaAmount8 };
  }, [invoice.lines]);

  function setField<K extends keyof InvoiceState>(key: K, value: InvoiceState[K]) {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  }

  function handleLineChange(idx: number, patch: Partial<InvoiceLine>) {
    setInvoice((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  }

  function handleAddLine() {
    setInvoice((prev) => ({ ...prev, lines: [...prev.lines, makeEmptyLine()] }));
  }

  function handleRemoveLine(idx: number) {
    setInvoice((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  }

  async function handlePrint() {
    const folio = invoice.invoiceNumber.trim() || "FAC-" + Date.now();
    const lines = invoice.lines.map(({ descripcion, cantidad, precioUnitario, impuesto, productDocumentId }) => ({
      descripcion,
      cantidad,
      precioUnitario,
      impuesto,
      product: productDocumentId || null,
    }));

    printInvoice({
      invoiceNumber: folio,
      cliente: invoice.cliente,
      formaDePago: invoice.formaDePago,
      politicaDePago: invoice.politicaDePago,
      uso: invoice.uso,
      cfdiAlPublico: invoice.cfdiAlPublico,
      fechaFactura: invoice.fechaFactura,
      fechaVencimiento: invoice.fechaVencimiento,
      diario: invoice.diario,
      cfdiOrigen: invoice.cfdiOrigen,
      lines,
      pharmacy: caja?.pharmacy ?? null,
    });

    setSaving(true);
    try {
      await postFactura({
        folio,
        fecha: invoice.fechaFactura.toISOString(),
        fechaVencimiento: invoice.fechaVencimiento?.toISOString() ?? null,
        cliente: invoice.cliente,
        rfc: invoice.rfc || undefined,
        tipoCliente: (invoice.tipoCliente as "empresa" | "particular") || undefined,
        formaDePago: invoice.formaDePago || undefined,
        politicaDePago: invoice.politicaDePago || undefined,
        usoCfdi: invoice.uso || undefined,
        cfdiAlPublico: invoice.cfdiAlPublico,
        diario: invoice.diario || undefined,
        cfdiOrigen: invoice.cfdiOrigen || undefined,
        subtotal,
        iva16: ivaAmount16,
        iva8: ivaAmount8,
        total,
        estado: "emitida",
        items: lines,
        pharmacy: pharmacyId ?? undefined,
      });
      onSaved?.();
    } catch (err) {
      console.error("Error al guardar factura:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setInvoice(makeInitialState());
  }

  const fmtMXN = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generar Factura</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Completa los datos y genera el PDF para imprimir o guardar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Limpiar
          </Button>
          <Button type="button" onClick={handlePrint} disabled={saving}>
            <Printer className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Generar / Imprimir"}
          </Button>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-white p-6 space-y-6">

        {/* Header fields — 2-col grid */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-4">
          {/* Left column */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente / Razón social</Label>
              <Input
                id="cliente"
                value={invoice.cliente}
                onChange={(e) => setField("cliente", e.target.value)}
                placeholder="Nombre del cliente o razón social"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  value={invoice.rfc}
                  onChange={(e) => setField("rfc", e.target.value.toUpperCase())}
                  placeholder="XAXX010101000"
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cliente</Label>
                <Select
                  value={invoice.tipoCliente}
                  onValueChange={(v) => setField("tipoCliente", v as InvoiceState["tipoCliente"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="particular">Particular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de pago</Label>
              <Select
                value={invoice.formaDePago}
                onValueChange={(v) => setField("formaDePago", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="politica">Política de pago</Label>
              <Input
                id="politica"
                value={invoice.politicaDePago}
                onChange={(e) => setField("politicaDePago", e.target.value)}
                placeholder="Ej. 30 días neto"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Uso CFDI</Label>
              <Select
                value={invoice.uso}
                onValueChange={(v) => setField("uso", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CFDI_USES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                id="cfdiPublico"
                checked={invoice.cfdiAlPublico}
                onCheckedChange={(v) => setField("cfdiAlPublico", !!v)}
              />
              <Label htmlFor="cfdiPublico" className="cursor-pointer">
                CFDI al público general
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumber">No. Factura (opcional)</Label>
              <Input
                id="invoiceNumber"
                value={invoice.invoiceNumber}
                onChange={(e) => setField("invoiceNumber", e.target.value)}
                placeholder="Auto-generado si se deja vacío"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de factura</Label>
              <DatePickerField
                value={invoice.fechaFactura}
                onChange={(d) => d && setField("fechaFactura", d)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <DatePickerField
                value={invoice.fechaVencimiento}
                onChange={(d) => setField("fechaVencimiento", d ?? null)}
                placeholder="Sin vencimiento"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diario">Diario</Label>
              <Input
                id="diario"
                value={invoice.diario}
                onChange={(e) => setField("diario", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cfdiOrigen">CFDI Origen</Label>
              <Input
                id="cfdiOrigen"
                value={invoice.cfdiOrigen}
                onChange={(e) => setField("cfdiOrigen", e.target.value)}
                placeholder="UUID de CFDI origen (opcional)"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Lines table */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Líneas de factura</h2>
          <div className="relative overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold text-muted-foreground pb-2 pr-2 text-xs uppercase tracking-wide">
                    Descripción
                  </th>
                  <th className="text-center font-semibold text-muted-foreground pb-2 pr-2 text-xs uppercase tracking-wide w-20">
                    Cant.
                  </th>
                  <th className="text-right font-semibold text-muted-foreground pb-2 pr-2 text-xs uppercase tracking-wide w-28">
                    Precio Unit.
                  </th>
                  <th className="text-center font-semibold text-muted-foreground pb-2 pr-2 text-xs uppercase tracking-wide w-32">
                    Impuesto
                  </th>
                  <th className="text-right font-semibold text-muted-foreground pb-2 pr-2 text-xs uppercase tracking-wide w-24">
                    Importe
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, idx) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    idx={idx}
                    products={products}
                    onChange={handleLineChange}
                    onRemove={handleRemoveLine}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleAddLine}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar línea
          </Button>
        </div>

        <Separator />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">${fmtMXN(subtotal)}</span>
            </div>
            {ivaAmount16 > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span className="tabular-nums">${fmtMXN(ivaAmount16)}</span>
              </div>
            )}
            {ivaAmount8 > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (8%)</span>
                <span className="tabular-nums">${fmtMXN(ivaAmount8)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-semibold text-base">
              <span>Total</span>
              <span className="tabular-nums">${fmtMXN(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
