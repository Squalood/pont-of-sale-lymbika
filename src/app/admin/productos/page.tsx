"use client";

import { ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductosPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Productos</h1>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-muted-foreground">
        <Package className="h-12 w-12 stroke-1" />
        <p className="text-lg font-medium">Próximamente</p>
        <p className="text-sm">La gestión de productos estará disponible aquí</p>
        <a href={`${backendUrl}/admin/content-manager/collection-types/api::product.product?page=1&pageSize=10&sort=productName%3AASC`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="mt-2 gap-2">
            <ExternalLink className="h-4 w-4" />
            Administrar en Strapi
          </Button>
        </a>
      </div>
    </div>
  );
}
