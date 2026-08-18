"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGetVentas } from "@/api/getVentas";
import { useGetCompras } from "@/api/getCompras";
import { useGetProducts } from "@/api/getProducts";
import { DashboardView } from "@/components/admin/dashboard-view";

export default function DashboardPage() {
  const { result: ventas, loading: loadingVentas, error: errorVentas } = useGetVentas();
  const { result: compras, loading: loadingCompras, error: errorCompras } = useGetCompras();
  // Solo para el costo/IVA del CSV detallado: no bloquea el resto del dashboard si tarda.
  const { result: products, loading: loadingProducts } = useGetProducts();

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loadingVentas || loadingCompras ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : errorVentas ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{errorVentas}</p>
        </div>
      ) : (
        // Un fallo de compras no tumba la mitad de ventas: se degrada dentro de la vista.
        <DashboardView
          ventas={ventas}
          compras={compras}
          comprasError={errorCompras}
          products={products}
          loadingProducts={loadingProducts}
        />
      )}
    </div>
  );
}
