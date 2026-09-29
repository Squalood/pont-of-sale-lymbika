"use client";

import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ProveedorType } from "@/types/proveedor";
import { LocalPurchaseItem } from "./types";
import { itemQuantity, itemTotalLine } from "./helpers";

interface ConfirmStepProps {
  selectedProveedor: ProveedorType | null;
  destinoNombre: string;
  file: File | null;
  notas: string;
  items: LocalPurchaseItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ConfirmStep({
  selectedProveedor,
  destinoNombre,
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
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Proveedor</span>
            <p className="font-medium">{selectedProveedor?.name ?? "Sin especificar"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Entra a</span>
            <p className="font-medium">{destinoNombre}</p>
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
            <div key={i} className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate flex-1 font-medium">{item.productName}</span>
                <Badge variant="outline" className="text-xs shrink-0">x{itemQuantity(item)}</Badge>
                {item.iva && item.iva !== "exento" && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    IVA {item.iva === "iva8" ? "8%" : "16%"}
                  </Badge>
                )}
                {itemTotalLine(item) > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                    ${fmt(itemTotalLine(item))}
                  </span>
                )}
              </div>
              <ul className="pl-3 text-xs text-muted-foreground space-y-0.5">
                {item.lotes.map((lote, li) => (
                  <li key={li}>
                    {lote.numeroLote.trim() ? `Lote ${lote.numeroLote.trim()}` : "Sin lote"} · x{lote.cantidad}
                    {lote.costoUnitario > 0 ? ` · $${fmt(lote.costoUnitario)} c/u` : ""}
                    {lote.fechaCaducidad ? ` · Cad: ${lote.fechaCaducidad}` : ""}
                  </li>
                ))}
              </ul>
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
