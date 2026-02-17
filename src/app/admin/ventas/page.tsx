"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGetVentas } from "@/api/getVentas";
import { SalesDashboard } from "@/components/admin/sales-dashboard";
import { SalesTable } from "@/components/admin/sales-table";

export default function VentasPage() {
  const { result: ventas, loading, error } = useGetVentas();

  return (
    <div className="space-y-6">
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
