"use client";

import { useGetTransfers } from "@/api/getTransfers";
import { TransferForm } from "@/components/admin/transfer-form";
import { TransfersHistory } from "@/components/admin/transfers-history";
import { BODEGA } from "@/components/admin/location-select";
import { usePharmacies } from "@/hooks/usePharmacies";
import { useCaja } from "@/lib/caja-context";

export default function TraspasosPage() {
  const { pharmacies } = usePharmacies();
  const { caja } = useCaja();
  const { result, loading, error, refetch } = useGetTransfers();

  return (
    <div className="flex-1 min-h-0 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold">Traspasos</h1>
        <p className="text-sm text-muted-foreground">
          Mueve mercancía entre la bodega central y las farmacias. El traspaso es inmediato: sale del
          origen y entra al destino con sus lotes (número y caducidad). Si el origen no tiene stock
          suficiente, no se mueve nada.
        </p>
      </div>

      <TransferForm
        pharmacies={pharmacies}
        defaultTo={caja?.pharmacy?.documentId ?? BODEGA}
        onDone={refetch}
      />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Historial</h2>
        <TransfersHistory transfers={result} loading={loading} error={error} />
      </div>
    </div>
  );
}
