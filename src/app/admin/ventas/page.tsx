"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGetVentas } from "@/api/getVentas";
import { useGetProducts } from "@/api/getProducts";
import { ProductType } from "@/types/product";
import { SalesDashboard } from "@/components/admin/sales-dashboard";
import { SalesTable } from "@/components/admin/sales-table";

export default function VentasPage() {
  const { result: ventas, loading, error } = useGetVentas();
  const { result: fetchedProducts } = useGetProducts();
  const [products, setProducts] = useState<ProductType[]>([]);

  useEffect(() => {
    setProducts(fetchedProducts);
  }, [fetchedProducts]);

  function handleReturnComplete(returnedItems: { productId: number; quantity: number }[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const returned = returnedItems.find((r) => r.productId === p.id);
        if (returned) return { ...p, stock_central: p.stock_central + returned.quantity };
        return p;
      })
    );
  }

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Historial de Ventas</h1>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <SalesDashboard ventas={ventas} />
          <SalesTable
            ventas={ventas}
            products={products}
            onReturnComplete={handleReturnComplete}
          />
        </>
      )}
    </div>
  );
}
