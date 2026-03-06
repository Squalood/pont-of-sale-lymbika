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
import { Printer, RotateCcw } from "lucide-react";
import { VentaType } from "@/types/venta";
import { ProductType } from "@/types/product";
import { printReceipt } from "@/lib/print-receipt";
import { ReturnDialog } from "@/components/admin/return-dialog";

interface SaleDetailDialogProps {
  venta: VentaType | null;
  open: boolean;
  onClose: () => void;
  products: ProductType[];
  onReturnComplete: (returnedItems: { productId: number; quantity: number }[]) => void;
}

export function SaleDetailDialog({ venta, open, onClose, products, onReturnComplete }: SaleDetailDialogProps) {
  const [returnOpen, setReturnOpen] = useState(false);

  if (!venta) return null;

  const fecha = new Date(venta.fecha);
  const subtotal = venta.subtotal ?? venta.total / 1.08;
  const iva = venta.iva ?? venta.total - subtotal;

  function handleReprint() {
    printReceipt({
      receiptId: venta!.id,
      operador: venta!.operador ?? "",
      items: venta!.venta.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalLine: item.totalLine,
      })),
      subtotal,
      iva,
      total: venta!.total,
      paymentMethod: venta!.metodoPago,
      received: venta!.recibido,
      change: venta!.cambio,
      fecha: venta!.fecha,
      recibidoUSD: venta!.recibidoUSD,
      tipoCambioUsado: venta!.tipoCambioUsado,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-lg">
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
                <p className="font-medium capitalize">{venta.metodoPago}</p>
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
              {venta.metodoPago === "efectivo" && (
                <>
                  <div>
                    <span className="text-muted-foreground">Recibido</span>
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
            {venta.estado === "completada" && (
              <Button variant="destructive" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Devolver
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
