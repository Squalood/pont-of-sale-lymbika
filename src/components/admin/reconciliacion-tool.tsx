"use client";

import { useMemo } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductType } from "@/types/product";

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

// Tablero de SOLO LECTURA. Muestra el avance de la captura manual de lotes: qué productos
// aún tienen stock sin lotear (diff > 0) y cuáles tienen lotes de más (diff < 0, a revisar).
// La resolución es física/manual (capturar los lotes reales); el software no crea lotes.
export function ReconciliacionTool({ products, refetch }: ReconciliacionToolProps) {
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
  const revisar = rows.filter((r) => r.diff < 0);
  const cuadrados = products.length - rows.length;

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Cuadrados</p>
          <p className="text-2xl font-bold text-emerald-600">{cuadrados}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Stock sin lotear (diff &gt; 0)</p>
          <p className="text-2xl font-bold text-blue-600">{sinLotear.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Revisar: lotes &gt; stock (diff &lt; 0)</p>
          <p className="text-2xl font-bold text-amber-600">{revisar.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Recalcular
        </Button>
        <p className="text-xs text-muted-foreground">
          Tablero de solo lectura. La captura de lotes es manual; aquí solo se monitorea el avance.
        </p>
      </div>

      {revisar.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 shrink-0">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {revisar.length} producto(s) tienen más en lotes que en stock_central. Revísalos
            manualmente: puede ser un stock_central bajado por fuera o un lote con cantidad inflada.
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
              rows.map((r) => (
                <tr key={r.product.id} className="border-t">
                  <td className="px-3 py-2">{r.product.productName}</td>
                  <td className="px-3 py-2 text-right">{r.product.stock_central}</td>
                  <td className="px-3 py-2 text-right">{r.sumActive}</td>
                  <td className={`px-3 py-2 text-right font-medium ${r.diff > 0 ? "text-blue-600" : "text-amber-600"}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.diff > 0 ? "Falta capturar lotes" : "Revisar (lotes > stock)"}
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
