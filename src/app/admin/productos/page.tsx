"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProducts } from "@/api/getProducts";
import { ProductsTable } from "@/components/admin/products-table";
import { ExportProductsButton } from "@/components/admin/export-products-button";

export default function ProductosPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const { result: products, loading, error } = useGetProducts();

  const strapiUrl = `${backendUrl}/admin/content-manager/collection-types/api::product.product?page=1&pageSize=10&sort=productName%3AASC`;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">Productos</h1>
        <div className="flex items-center gap-2">
          <ExportProductsButton />
          <a href={strapiUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Administrar en Strapi
            </Button>
          </a>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          Error al cargar productos: {error}
        </p>
      )}

      {!loading && !error && (
        <ProductsTable initialProducts={products} />
      )}
    </div>
  );
}
