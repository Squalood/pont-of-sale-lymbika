"use client";

import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ProveedorType } from "@/types/proveedor";
import { LocalItem } from "./types";

interface ConfirmStepProps {
  selectedProveedor: ProveedorType | null;
  file: File | null;
  notas: string;
  items: LocalItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2 });

export function ConfirmStep({
  selectedProveedor,
  file,
  notas,
  items,
  total,
  loading,
  error,
  onConfirm,
  onBack,
}: ConfirmStepProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Proveedor</span>
            <p className="font-medium">{selectedProveedor?.name ?? "Sin especificar"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Factura</span>
            <p className="font-medium">{file ? file.name : "Sin adjunto"}</p>
          </div>
          {notas && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notas</span>
              <p className="font-medium">{notas}</p>
            </div>
          )}
        </div>

        <div className="divide-y rounded-lg border text-sm max-h-56 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
              <span className="truncate flex-1 font-medium">{item.productName}</span>
              <Badge variant="outline" className="text-xs shrink-0">x{item.quantity}</Badge>
              {item.costoUnitario > 0 && (
                <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                  ${fmt(item.totalLine)}
                </span>
              )}
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="flex justify-end border-t pt-2">
            <span className="text-sm font-semibold">Total: ${fmt(total)}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Atrás
        </Button>
        <Button onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar compra
        </Button>
      </DialogFooter>
    </>
  );
}
