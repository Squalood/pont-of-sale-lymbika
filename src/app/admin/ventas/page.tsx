"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGetVentas } from "@/api/getVentas";
import { SalesDashboard } from "@/components/admin/sales-dashboard";
import { SalesTable } from "@/components/admin/sales-table";

// Sin catálogo de productos: las devoluciones toman el producto de la línea de la venta y el
// stock lo regresa el servidor (/pos-stock/return). Antes se bajaba todo el catálogo solo para eso.
export default function VentasPage() {
  const { result: ventas, loading, error } = useGetVentas();

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
          <SalesTable ventas={ventas} />
        </>
      )}
    </div>
  );
}
