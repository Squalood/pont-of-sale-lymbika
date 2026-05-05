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
import { DevolucionType } from "@/types/devolucion";
import { printReturnReceipt } from "@/lib/print-return-receipt";

interface DevolucionDetailDialogProps {
  devolucion: DevolucionType | null;
  open: boolean;
  onClose: () => void;
}

export function DevolucionDetailDialog({ devolucion, open, onClose }: DevolucionDetailDialogProps) {
  if (!devolucion) return null;

  const fecha = new Date(devolucion.fecha);

  function handleReprint() {
    printReturnReceipt({
      devolucionId: devolucion!.id,
      ventaId: devolucion!.venta?.id ?? 0,
      operador: devolucion!.operador ?? "",
      items: devolucion!.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalLine: item.totalLine,
      })),
      montoReembolso: devolucion!.montoReembolso,
      metodo: devolucion!.metodo,
      motivo: devolucion!.motivo,
      fecha: devolucion!.fecha,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Detalle de devolución{" "}
            <span className="text-muted-foreground font-normal">
              #{String(devolucion.id).padStart(5, "0")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Fecha</span>
              <p className="font-medium">
                {fecha.toLocaleDateString("es-MX")} -{" "}
                {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Venta original</span>
              <p className="font-medium">
                {devolucion.venta ? `#${String(devolucion.venta.id).padStart(5, "0")}` : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Método de reembolso</span>
              <p className="font-medium">{devolucion.metodo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Operador</span>
              <p className="font-medium">{devolucion.operador ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Estado</span>
              <p>
                <Badge variant={devolucion.estado === "Completada" ? "default" : "destructive"}>
                  {devolucion.estado}
                </Badge>
              </p>
            </div>
            {devolucion.motivo && (
              <div>
                <span className="text-muted-foreground">Motivo</span>
                <p className="font-medium">{devolucion.motivo}</p>
              </div>
            )}
          </div>

          {/* Items */}
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
              {devolucion.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-48 truncate">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.totalLine.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Total */}
          <div className="border-t pt-3 text-sm">
            <div className="flex justify-between text-base font-bold">
              <span>Total reembolsado</span>
              <span>${devolucion.montoReembolso.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReprint}>
            <Printer className="mr-2 h-4 w-4" />
            Reimprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
