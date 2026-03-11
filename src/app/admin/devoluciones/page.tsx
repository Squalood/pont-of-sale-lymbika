"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGetDevoluciones } from "@/api/getDevoluciones";
import { DevolucionesTable } from "@/components/admin/devoluciones-table";

export default function DevolucionesPage() {
  const { result: devoluciones, loading, error } = useGetDevoluciones();

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Devoluciones</h1>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <DevolucionesTable devoluciones={devoluciones} />
      )}
    </div>
  );
}
