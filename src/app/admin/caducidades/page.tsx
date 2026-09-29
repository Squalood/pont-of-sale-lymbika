"use client";

import { Spinner } from "@/components/ui/spinner";
import { useGetLotes } from "@/api/getLotes";
import { CaducidadesTable } from "@/components/admin/caducidades-table";
import { EXPIRING_SOON_DAYS } from "@/lib/lotes";

export default function CaducidadesPage() {
  const { result: lotes, loading, error, refetch } = useGetLotes();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Caducidades y mermas</h1>
        <p className="text-sm text-muted-foreground">
          Lotes vencidos y los que caducan en los próximos {EXPIRING_SOON_DAYS} días.
          Desechar un lote lo marca como merma —conservando cuántas unidades se dieron de
          baja— y descuenta esa cantidad del stock de la ubicación donde está el lote (bodega o
          farmacia). El lote nunca se elimina.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-destructive">Error al cargar lotes: {error}</p>
        </div>
      ) : (
        <CaducidadesTable lotes={lotes} refetch={refetch} />
      )}
    </div>
  );
}
