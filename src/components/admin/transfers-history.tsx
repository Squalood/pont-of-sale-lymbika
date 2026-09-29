"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { StockTransferType } from "@/api/getTransfers";

interface TransfersHistoryProps {
  transfers: StockTransferType[];
  loading: boolean;
  error: string | null;
}

interface Batch {
  key: string;
  at: string;
  from: string;
  to: string;
  notes: string | null;
  lines: { product: string; quantity: number; lot: string | null; exp: string | null }[];
}

const nombre = (p: { nombre: string } | null) => p?.nombre ?? "Bodega central";

/**
 * Historial de traspasos. El backend guarda una fila por porción de lote; aquí se juntan por
 * `batchId` para ver cada traspaso como se registró: origen → destino y sus líneas.
 */
export function TransfersHistory({ transfers, loading, error }: TransfersHistoryProps) {
  const batches = useMemo(() => {
    const map = new Map<string, Batch>();
    for (const t of transfers) {
      const key = t.batchId ?? t.documentId;
      const b = map.get(key) ?? {
        key,
        at: t.transferred_at,
        from: nombre(t.from_pharmacy),
        to: nombre(t.to_pharmacy),
        notes: t.notes,
        lines: [],
      };
      b.lines.push({
        product: t.product?.productName ?? "Producto eliminado",
        quantity: t.quantity,
        lot: t.from_lot?.lotNumber ?? null,
        exp: t.from_lot?.expirationDate ?? null,
      });
      map.set(key, b);
    }
    return [...map.values()];
  }, [transfers]);

  if (loading && transfers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">Error al cargar el historial: {error}</p>;
  if (batches.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay traspasos.</p>;

  return (
    <div className="divide-y rounded-lg border">
      {batches.map((b) => {
        const fecha = new Date(b.at);
        const unidades = b.lines.reduce((s, l) => s + l.quantity, 0);
        return (
          <div key={b.key} className="space-y-1.5 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{b.from}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{b.to}</span>
              <span className="text-xs text-muted-foreground">
                · {unidades} unidad(es) · {fecha.toLocaleDateString("es-MX")}{" "}
                {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <ul className="space-y-0.5 pl-3 text-xs text-muted-foreground">
              {b.lines.map((l, i) => (
                <li key={i} className="truncate">
                  {l.product} · ×{l.quantity}
                  {l.lot ? ` · lote ${l.lot}` : " · sin lote"}
                  {l.exp ? ` · cad. ${l.exp}` : ""}
                </li>
              ))}
            </ul>
            {b.notes && <p className="text-xs italic text-muted-foreground">&ldquo;{b.notes}&rdquo;</p>}
          </div>
        );
      })}
    </div>
  );
}
