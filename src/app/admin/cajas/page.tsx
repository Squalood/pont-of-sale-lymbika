"use client";

import { Loader2 } from "lucide-react";
import { useGetCajas } from "@/api/getCajas";
import { CajasTable } from "@/components/admin/cajas-table";

export default function CajasPage() {
  const { result: cajas, loading, error } = useGetCajas();

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold shrink-0">Historial de Cajas</h1>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && <CajasTable cajas={cajas} />}
    </div>
  );
}
