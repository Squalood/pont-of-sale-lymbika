"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockLevelsView } from "@/components/admin/stock-levels-view";

const STRAPI_LOTES_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/admin/content-manager/collection-types/api::inventory-lot.inventory-lot?page=1&pageSize=50&sort=createdAt:DESC`;

export default function StockPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock por farmacia</h1>
          <p className="text-sm text-muted-foreground">
            Existencias de la bodega central y de cada farmacia. El stock total de un producto es la
            suma de todas; la bodega es lo que queda del total después de las farmacias. En{" "}
            <strong>Todas las ubicaciones</strong> ves, lugar por lugar, dónde el stock no coincide con
            sus lotes. <strong>Traspasar</strong> acomoda mercancía sin cambiar el total;{" "}
            <strong>Cuadrar</strong> deja lotes y stock igual a lo contado; <strong>Corregir</strong> es
            para merma o faltantes.
          </p>
        </div>
        <a href={STRAPI_LOTES_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" /> Lotes en Strapi
          </Button>
        </a>
      </div>
      <StockLevelsView />
    </div>
  );
}
