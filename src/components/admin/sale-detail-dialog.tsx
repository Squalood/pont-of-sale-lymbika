"use client";

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
import { Badge } from "@/components/ui/badge";
import { VentaType } from "@/types/venta";

interface SaleDetailDialogProps {
  venta: VentaType | null;
  open: boolean;
  onClose: () => void;
}

export function SaleDetailDialog({ venta, open, onClose }: SaleDetailDialogProps) {
  if (!venta) return null;

  const fecha = new Date(venta.fecha);
  const subtotal = venta.total / 1.08;
  const iva = venta.total - subtotal;

  return (
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
                  <p className="font-medium">${venta.recibido.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cambio</span>
                  <p className="font-medium">${venta.cambio.toFixed(2)}</p>
                </div>
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
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (8%)</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>${venta.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
