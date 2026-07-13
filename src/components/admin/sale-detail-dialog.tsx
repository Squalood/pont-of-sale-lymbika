"use client";

import { useState } from "react";
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
import { Printer, RotateCcw, NotebookPen, BadgePercent, FileText } from "lucide-react";
import { VentaType } from "@/types/venta";
import { ProductType } from "@/types/product";
import { printReceipt } from "@/lib/print-receipt";
import { ReturnDialog } from "@/components/admin/return-dialog";
import { InvoiceFromSaleDialog } from "@/components/admin/invoice-from-sale-dialog";

interface SaleDetailDialogProps {
  venta: VentaType | null;
  open: boolean;
  onClose: () => void;
  products: ProductType[];
  onReturnComplete: (returnedItems: { productId: number; quantity: number }[]) => void;
}

export function SaleDetailDialog({ venta, open, onClose, products, onReturnComplete }: SaleDetailDialogProps) {
  const [returnOpen, setReturnOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  if (!venta) return null;

  const fecha = new Date(venta.fecha);
  const subtotal = venta.subtotal ?? venta.total / 1.08;
  const iva = venta.iva ?? venta.total - subtotal;

  const cardBase =
    venta.metodoPago === "tarjeta"
      ? venta.total / (venta.esMembresia ? 1.03 : 1)
      : venta.metodoPago === "mixto"
        ? venta.montoTarjeta ?? 0
        : 0;
  const cardSurcharge = venta.esMembresia && cardBase > 0 ? cardBase * 0.03 : 0;
  const baseTotal = venta.total - cardSurcharge;
  const transfeBase =
    venta.metodoPago === "transfe"
      ? venta.total
      : venta.metodoPago === "mixto"
        ? venta.montoTransferencia ?? 0
        : 0;

  function handleReprint() {
    printReceipt({
      receiptId: venta!.id,
      operador: venta!.operador ?? "",
      pharmacyName: venta!.pharmacies?.[0]?.nombre,
      items: venta!.venta.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalLine: item.totalLine,
      })),
      subtotal,
      iva,
      total: baseTotal,
      paymentMethod: venta!.metodoPago,
      received: venta!.recibido,
      change: venta!.cambio,
      fecha: venta!.fecha,
      isMember: venta!.esMembresia ?? false,
      cardSurcharge,
      montoTarjeta: cardBase,
      montoTransfe: transfeBase,
      recibidoUSD: venta!.recibidoUSD,
      tipoCambioUsado: venta!.tipoCambioUsado,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Detalle de venta{" "}
              <span className="text-muted-foreground font-normal">
                #{String(venta.id).padStart(5, "0")}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha</span>
                <p className="font-medium">
                  {fecha.toLocaleDateString("es-MX")} - {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Método de pago</span>
                <p className="font-medium capitalize">
                  {venta.metodoPago === "transfe" ? "Transferencia" : venta.metodoPago}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado</span>
                <p>
                  <Badge variant={venta.estado === "completada" ? "default" : "destructive"}>
                    {venta.estado}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Operador</span>
                <p className="font-medium">{venta.operador ?? "—"}</p>
              </div>
              {venta.pharmacies?.[0] && (
                <div>
                  <span className="text-muted-foreground">Sucursal</span>
                  <p className="font-medium">{venta.pharmacies[0].nombre}</p>
                </div>
              )}
              {venta.esMembresia && (
                <div className="col-span-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                  <BadgePercent className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Venta con Health Pass</span>
                </div>
              )}
              {venta.metodoPago === "mixto" && cardBase > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Cobro en terminal</span>
                  <p className="font-medium">${(cardBase + cardSurcharge).toFixed(2)}</p>
                </div>
              )}
              {(venta.metodoPago === "transfe" || (venta.metodoPago === "mixto" && transfeBase > 0)) && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Transferencia</span>
                  <p className="font-medium">${transfeBase.toFixed(2)}</p>
                </div>
              )}
              {(venta.metodoPago === "efectivo" || venta.metodoPago === "mixto") && (
                <>
                  <div>
                    <span className="text-muted-foreground">Recibido en efectivo</span>
                    <p className="font-medium">${venta.recibido.toFixed(2)} MXN</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cambio</span>
                    <p className="font-medium">${venta.cambio.toFixed(2)}</p>
                  </div>
                  {(venta.recibidoUSD ?? 0) > 0 && (
                    <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-sm">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Desglose del pago</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En pesos</span>
                        <span>${(venta.recibido - venta.recibidoUSD * (venta.tipoCambioUsado ?? 1)).toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En dólares</span>
                        <span className="text-green-700">${venta.recibidoUSD.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo de cambio</span>
                        <span>${venta.tipoCambioUsado?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Nota */}
            {venta.nota && (
              <div className="flex gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">{venta.nota}</p>
              </div>
            )}

            {/* Items table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cant</TableHead>
                  <TableHead className="text-right">P.U.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venta.venta?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-48 truncate">{item.productName}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.totalLine.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {iva > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (8%)</span>
                  <span>${iva.toFixed(2)}</span>
                </div>
              )}
              {cardSurcharge > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Health Pass</span>
                    <span>${baseTotal.toFixed(2)}</span>
                  </div>
                  {venta.metodoPago === "mixto" && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Porción en tarjeta</span>
                      <span>${cardBase.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cargo tarjeta (3%)</span>
                    <span>+${cardSurcharge.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>${venta.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleReprint}>
              <Printer className="h-4 w-4" />
              Reimprimir
            </Button>
            <Button variant="default" onClick={() => setInvoiceOpen(true)}>
              <FileText className="h-4 w-4" />
              Generar factura
            </Button>
            {venta.estado === "completada" && (
              <Button variant="destructive" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Devolver
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceFromSaleDialog
        venta={venta}
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />

      <ReturnDialog
        venta={venta}
        products={products}
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        onReturnComplete={(items) => {
          onReturnComplete(items);
          setReturnOpen(false);
        }}
      />
    </>
  );
}