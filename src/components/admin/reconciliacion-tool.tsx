"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpFromLine, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductType } from "@/types/product";
import { patchProductStock } from "@/api/patchProductStock";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

function strapiProductUrl(documentId: string): string {
  return `${BACKEND_URL}/admin/content-manager/collection-types/api::product.product/${documentId}`;
}

interface ReconciliacionToolProps {
  products: ProductType[];
  refetch: () => Promise<void>;
}

type Row = {
  product: ProductType;
  sumActive: number;
  diff: number; // stock_central - Σ currentAmount(activos)
};

// Σ currentAmount de lotes en state "activo".
function sumActiveLots(p: ProductType): number {
  return (p.inventory_lots ?? [])
    .filter((l) => l.state === "activo")
    .reduce((sum, l) => sum + l.currentAmount, 0);
}

// Candidato a "cuadrar desde lotes": stock_central en 0 pero con lotes reales con existencia.
// Solo puede SUMAR (stock ya es 0), nunca borrar stock real → operación segura.
function esCuadrable(r: Row): boolean {
  return r.diff < 0 && r.product.stock_central === 0 && r.sumActive > 0;
}

// Tablero del avance de captura manual de lotes. Solo lectura, salvo una acción segura:
// "Cuadrar stock desde lotes", que sube stock_central=Σ lotes SOLO para productos con stock 0.
// Nunca crea lotes.
export function ReconciliacionTool({ products, refetch }: ReconciliacionToolProps) {
  const [running, setRunning] = useState(false);

  const rows = useMemo<Row[]>(() => {
    return products
      .map((product) => {
        const sumActive = sumActiveLots(product);
        return { product, sumActive, diff: product.stock_central - sumActive };
      })
      .filter((r) => r.diff !== 0)
      .sort((a, b) => b.diff - a.diff);
  }, [products]);

  const sinLotear = rows.filter((r) => r.diff > 0);
  const cuadrables = rows.filter(esCuadrable);
  const revisarManual = rows.filter((r) => r.diff < 0 && !esCuadrable(r));
  const cuadrados = products.length - rows.length;

  async function handleCuadrar() {
    if (cuadrables.length === 0) return;
    setRunning(true);
    let ok = 0;
    const failed: string[] = [];
    for (const r of cuadrables) {
      try {
        await patchProductStock(r.product.documentId, r.sumActive);
        ok++;
      } catch {
        failed.push(r.product.productName);
      }
    }
    await refetch();
    setRunning(false);
    if (failed.length === 0) {
      toast.success(`${ok} producto(s) cuadrado(s) desde sus lotes.`);
    } else {
      toast.error(
        `${ok} cuadrado(s), ${failed.length} con error: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 shrink-0 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Cuadrados</p>
          <p className="text-2xl font-bold text-emerald-600">{cuadrados}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Stock sin lotear (diff &gt; 0)</p>
          <p className="text-2xl font-bold text-blue-600">{sinLotear.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Cuadrar desde lotes (stock = 0)</p>
          <p className="text-2xl font-bold text-violet-600">{cuadrables.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Revisar manual (stock &gt; 0)</p>
          <p className="text-2xl font-bold text-amber-600">{revisarManual.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button onClick={handleCuadrar} disabled={running || cuadrables.length === 0} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
          Cuadrar stock desde lotes ({cuadrables.length})
        </Button>
        <Button variant="outline" onClick={() => refetch()} disabled={running} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Recalcular
        </Button>
        <p className="text-xs text-muted-foreground">
          Solo sube <code>stock_central</code> a la suma de lotes en productos con stock 0. No crea lotes.
        </p>
      </div>

      {revisarManual.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 shrink-0">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {revisarManual.length} producto(s) tienen stock y lotes que no cuadran (lotes &gt; stock).
            No se auto-corrigen: revísalos manualmente (puede ser un stock_central bajado por fuera o
            un lote con cantidad inflada).
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-left">
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 text-right">stock_central</th>
              <th className="px-3 py-2 text-right">Σ lotes activos</th>
              <th className="px-3 py-2 text-right">Diferencia</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Strapi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Todo cuadrado — cada producto tiene sus lotes al día.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const cuadrable = esCuadrable(r);
                const estado = r.diff > 0
                  ? "Falta capturar lotes"
                  : cuadrable
                    ? "Cuadrar desde lotes"
                    : "Revisar (lotes > stock)";
                const estadoColor = r.diff > 0
                  ? "text-muted-foreground"
                  : cuadrable
                    ? "text-violet-600"
                    : "text-amber-600";
                return (
                  <tr key={r.product.id} className="border-t">
                    <td className="px-3 py-2">{r.product.productName}</td>
                    <td className="px-3 py-2 text-right">{r.product.stock_central}</td>
                    <td className="px-3 py-2 text-right">{r.sumActive}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.diff > 0 ? "text-blue-600" : "text-amber-600"}`}>
                      {r.diff > 0 ? `+${r.diff}` : r.diff}
                    </td>
                    <td className={`px-3 py-2 text-xs ${estadoColor}`}>{estado}</td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={strapiProductUrl(r.product.documentId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir producto en Strapi"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
