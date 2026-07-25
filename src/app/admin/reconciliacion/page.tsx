"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProducts } from "@/api/getProducts";
import { ReconciliacionTool } from "@/components/admin/reconciliacion-tool";

export default function ReconciliacionPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const { result: products, loading, error, refetch } = useGetProducts();

  const strapiLotesUrl = `${backendUrl}/admin/content-manager/collection-types/api::inventory-lot.inventory-lot?page=1&pageSize=50&sort=createdAt:DESC`;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Reconciliación de lotes</h1>
          <p className="text-sm text-muted-foreground">
            Tablero de monitoreo del avance de captura de lotes. Compara <code>stock_central</code>{" "}
            con la suma de lotes activos por producto. Mientras haya productos sin lotear,{" "}
            <code>stock_central</code> será mayor que la suma de lotes: es lo esperado. La captura de
            los lotes reales es manual; esta pantalla solo reporta, no crea nada.
          </p>
        </div>
        <a href={strapiLotesUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Administrar lotes en Strapi
          </Button>
        </a>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Error al cargar productos: {error}</p>
      )}

      {!loading && !error && (
        <ReconciliacionTool products={products} refetch={refetch} />
      )}
    </div>
  );
}
