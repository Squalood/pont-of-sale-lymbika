"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGetCompras } from "@/api/getCompras";
import { useGetProducts } from "@/api/getProducts";
import { ProductType } from "@/types/product";
import { ComprasTable } from "@/components/admin/compras-table";
import { NuevaCompraDialog } from "@/components/admin/nueva-compra-dialog";

export default function ComprasPage() {
  const { result: compras, loading, error, refetch } = useGetCompras();
  const { result: fetchedProducts } = useGetProducts();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setProducts(fetchedProducts);
  }, [fetchedProducts]);

  function handleCompraComplete(items: { productId: number; quantity: number }[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const comprado = items.find((i) => i.productId === p.id);
        if (comprado) return { ...p, stock_central: p.stock_central + comprado.quantity };
        return p;
      })
    );
    refetch();
  }

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Compras</h1>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <ComprasTable
          compras={compras}
          onNuevaCompra={() => setDialogOpen(true)}
        />
      )}

      <NuevaCompraDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        products={products}
        onCompraComplete={handleCompraComplete}
      />
    </div>
  );
}
