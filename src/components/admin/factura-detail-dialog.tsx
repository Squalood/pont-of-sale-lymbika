"use client";

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
import { Printer } from "lucide-react";
import { FacturaType } from "@/types/factura";
import { printInvoice } from "@/lib/print-invoice";

interface FacturaDetailDialogProps {
  factura: FacturaType | null;
  open: boolean;
  onClose: () => void;
}

function fmt(n: number) {
  return (n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const IMPUESTO_LABEL: Record<string, string> = {
  iva16: "IVA 16%",
  iva8: "IVA 8%",
  exento: "Exento",
};

export function FacturaDetailDialog({ factura, open, onClose }: FacturaDetailDialogProps) {
  if (!factura) return null;

  const fecha = new Date(factura.fecha);

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
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
